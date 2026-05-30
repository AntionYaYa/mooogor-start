import { mount, unmount } from "svelte";
import RelatedSearchPanel from "./content/RelatedSearchPanel.svelte";
import type { RelatedSearchPayload } from "./content/RelatedSearchPanel.svelte";
import baseStyles from "@/lib/style/base.css?inline";
import colorStyles from "@/lib/style/color.css?inline";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  main() {
    setupListeners();
    init();
  },
});

let pageHidden = false;
let relatedSearchHost: HTMLDivElement | null = null;
let relatedSearchApp: Record<string, unknown> | null = null;
let lastRelatedSearchUrl = location.href;

/**
 * 设置生命周期监听，处理 BFCache (往返缓存)
 */
function setupListeners() {
  // 页面隐藏/进入缓存
  window.addEventListener("pagehide", () => {
    pageHidden = true;
  });

  // 页面显示/从缓存恢复
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      // 如果页面是从 BFCache 恢复的，重置状态并重新初始化
      pageHidden = false;
      init();
    }
  });

  window.setInterval(() => {
    if (pageHidden || location.href === lastRelatedSearchUrl) return;
    lastRelatedSearchUrl = location.href;
    void initRelatedSearchPanel();
  }, 500);

  browser.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") return;
    const { type } = message as { type?: string };
    if (type === "refreshRelatedSearchPanel") {
      void initRelatedSearchPanel();
    }
  });
}

/**
 * 健壮的消息发送封装
 */
type BackgroundMessage =
  | { type: "shouldStoreFavicon"; payload: { url: string } }
  | { type: "saveFavicon"; payload: { url: string; faviconUrl: string } }
  | { type: "getRelatedSearchEngines"; payload: { url: string } };

async function safeSendMessage<ReturnType extends JsonValue>(
  message: BackgroundMessage,
): Promise<ReturnType | null> {
  // 如果页面正在卸载或已隐藏，直接跳过通信，避免 Port 错误
  if (pageHidden) return null;

  try {
    return (await browser.runtime.sendMessage(message)) as ReturnType;
  } catch (err) {
    const errMessage = String(err ?? "");
    // 拦截常见的由于页面生命周期导致的断连错误
    if (
      errMessage.includes("back/forward cache") ||
      errMessage.includes("message channel is closed") ||
      errMessage.includes("message port closed") ||
      errMessage.includes("context invalidated") // 插件更新后的上下文失效
    ) {
      return null;
    }
    // 其他真正的业务错误仍然抛出
    console.error(`[Extension Message Error] ${message.type}:`, err);
    return null; 
  }
}

async function init() {
  await initRelatedSearchPanel();

  // 1. 询问后台是否需要存储当前页面的 Favicon
  const shouldStore = await safeSendMessage<boolean>({
    type: "shouldStoreFavicon",
    payload: { url: location.href },
  });
  
  if (!shouldStore) return;

  // 2. 提取最佳图标
  const faviconUrl = getBestFavicon();
  if (faviconUrl) {
    const newFavicon = {
      url: location.href,
      faviconUrl,
    };
    // 3. 异步保存
    await safeSendMessage({
      type: "saveFavicon",
      payload: newFavicon,
    });
  }
}

async function initRelatedSearchPanel() {
  lastRelatedSearchUrl = location.href;
  const related = await safeSendMessage<RelatedSearchPayload>({
    type: "getRelatedSearchEngines",
    payload: { url: location.href },
  });

  destroyRelatedSearchPanel();

  if (!related?.engines.length) return;
  mountRelatedSearchPanel(related);
}

function mountRelatedSearchPanel(data: RelatedSearchPayload) {
  const host = document.createElement("div");
  host.id = "mooogor-related-search";
  if (data.theme !== "default") {
    host.dataset.theme = data.theme;
  }
  const style = document.createElement("style");
  const target = document.createElement("div");
  style.textContent = getScopedSharedStyles();
  const initialKeyword = getKeywordFromUrl(
    data.matchedEngine.engineUrl,
    location.href,
  );

  host.append(style, target);
  document.documentElement.append(host);
  relatedSearchHost = host;
  relatedSearchApp = mount(RelatedSearchPanel, {
    target,
    props: {
      data,
      initialKeyword,
      placeholder: data.texts.placeholder,
      searchShortcutTip: data.texts.searchShortcutTip,
      switchShortcutTip: data.texts.switchShortcutTip,
      onClose: destroyRelatedSearchPanel,
    },
  });
}

function getScopedSharedStyles() {
  return `${baseStyles}\n${colorStyles}`
    .replaceAll(":root", "#mooogor-related-search")
    .replaceAll("::-webkit-scrollbar", "#mooogor-related-search ::-webkit-scrollbar");
}

function destroyRelatedSearchPanel() {
  if (relatedSearchApp) {
    void unmount(relatedSearchApp);
    relatedSearchApp = null;
  }
  relatedSearchHost?.remove();
  relatedSearchHost = null;
}

function getKeywordFromUrl(engineUrl: string, currentUrl: string) {
  const placeholder = "%s";
  if (!engineUrl.includes(placeholder)) return "";

  try {
    const template = new URL(engineUrl.replace(placeholder, "__MOOGOR_QUERY__"));
    const current = new URL(currentUrl);
    for (const [key, value] of template.searchParams.entries()) {
      if (value !== "__MOOGOR_QUERY__") continue;
      return current.searchParams.get(key) ?? "";
    }

    const [before, after] = engineUrl.split(placeholder);
    const beforeUrl = new URL(before || engineUrl, current.origin);
    const beforePath = beforeUrl.pathname;
    const afterPath = after ? new URL(after, current.origin).pathname : "";
    if (!current.pathname.startsWith(beforePath)) return "";
    const start = beforePath.length;
    const end = afterPath && current.pathname.endsWith(afterPath)
      ? current.pathname.length - afterPath.length
      : current.pathname.length;
    return decodeURIComponent(current.pathname.slice(start, end));
  } catch {
    return "";
  }
}

/**
 * 获取页面最优图标逻辑
 */
function getBestFavicon(): string {
  // 1. 优先 apple-touch-icon（通常是高质量原图）
  const apple = document.querySelector<HTMLLinkElement>(
    'link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]',
  );
  if (apple?.href) return parseUrl(apple.href);

  // 2. 遍历所有 rel="icon" 的标签
  const icons = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
  );

  let best: HTMLLinkElement | null = null;
  let maxSize = 0;
  let fallback: HTMLLinkElement | null = null;

  for (const icon of icons) {
    if (!fallback && icon.href) fallback = icon;

    const sizes = icon.getAttribute("sizes");
    // 如果没有指定尺寸或者是 "any"，跳过尺寸对比
    if (!sizes || sizes === "any") continue;

    const size = parseInt(sizes.split("x")[0], 10);
    if (size > maxSize) {
      maxSize = size;
      best = icon;
    }
  }

  const target = best || fallback;
  return target?.href ? parseUrl(target.href) : "";
}

/**
 * 转换为绝对路径
 */
function parseUrl(url: string): string {
  try {
    return new URL(url, location.href).href;
  } catch {
    return "";
  }
}
