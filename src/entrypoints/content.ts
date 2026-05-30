type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type RelatedSearchEngine = {
  id?: number;
  title?: string;
  engineUrl: string;
  faviconUrl: string;
  category?: string;
  order?: number;
};

type RelatedSearchPayload = {
  matchedEngine: RelatedSearchEngine;
  engines: RelatedSearchEngine[];
};

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  main() {
    setupListeners();
    init();
  },
});

let pageHidden = false;
let relatedSearchHost: HTMLDivElement | null = null;
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

  relatedSearchHost?.remove();
  relatedSearchHost = null;

  if (!related?.engines.length) return;
  relatedSearchHost = renderRelatedSearchPanel(related);
}

function renderRelatedSearchPanel(data: RelatedSearchPayload) {
  const host = document.createElement("div");
  host.id = "mooogor-related-search";
  const shadow = host.attachShadow({ mode: "open" });
  const initialKeyword = getKeywordFromUrl(
    data.matchedEngine.engineUrl,
    location.href,
  );

  shadow.innerHTML = `
    <style>
      :host {
        position: fixed;
        top: 96px;
        right: 24px;
        z-index: 2147483647;
        color-scheme: light dark;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .panel {
        width: min(320px, calc(100vw - 32px));
        box-sizing: border-box;
        border: 1px solid rgba(127, 127, 127, 0.22);
        border-radius: 12px;
        background: color-mix(in srgb, Canvas 92%, transparent);
        color: CanvasText;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(16px);
        overflow: hidden;
      }
      .drag {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        cursor: grab;
        user-select: none;
        border-bottom: 1px solid rgba(127, 127, 127, 0.14);
      }
      .drag:active {
        cursor: grabbing;
      }
      .title {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-size: 12px;
        opacity: 0.72;
      }
      .close {
        width: 24px;
        height: 24px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      }
      .close:hover {
        background: rgba(127, 127, 127, 0.16);
      }
      .body {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
      }
      .input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(127, 127, 127, 0.28);
        border-radius: 10px;
        background: rgba(127, 127, 127, 0.08);
        color: inherit;
        outline: none;
        padding: 9px 10px;
        font: inherit;
        font-size: 14px;
      }
      .input:focus {
        border-color: rgba(80, 128, 255, 0.75);
      }
      .engines {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .engine {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        max-width: 140px;
        border: 0;
        border-radius: 10px;
        background: rgba(127, 127, 127, 0.12);
        color: inherit;
        cursor: pointer;
        padding: 7px 9px;
        font: inherit;
        font-size: 12px;
      }
      .engine:hover {
        background: rgba(127, 127, 127, 0.2);
      }
      .engine span {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    </style>
    <div class="panel">
      <div class="drag" part="drag">
        <div class="title">${escapeHtml(browser.i18n.getMessage("nt_settings_search_title") || "Quick Search")}</div>
        <button class="close" type="button" aria-label="Close">×</button>
      </div>
      <div class="body">
        <input class="input" type="search" value="${escapeHtml(initialKeyword)}" />
        <div class="engines"></div>
      </div>
    </div>
  `;

  const enginesEl = shadow.querySelector(".engines");
  const inputEl = shadow.querySelector<HTMLInputElement>(".input");
  const dragEl = shadow.querySelector<HTMLElement>(".drag");
  const closeEl = shadow.querySelector<HTMLButtonElement>(".close");
  if (!enginesEl || !inputEl || !dragEl || !closeEl) return host;

  for (const engine of data.engines) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "engine";
    button.title = engine.title ?? "";
    button.innerHTML = `
      <span>${escapeHtml(engine.title ?? "Search")}</span>
    `;
    button.addEventListener("click", () => {
      const keyword = inputEl.value.trim();
      if (!keyword) {
        inputEl.focus();
        return;
      }
      location.href = buildSearchUrl(engine.engineUrl, keyword);
    });
    enginesEl.append(button);
  }

  inputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    enginesEl.querySelector<HTMLButtonElement>(".engine")?.click();
  });
  closeEl.addEventListener("click", () => {
    host.remove();
    if (relatedSearchHost === host) relatedSearchHost = null;
  });
  enableDrag(host, dragEl);
  document.documentElement.append(host);
  return host;
}

function enableDrag(host: HTMLElement, handle: HTMLElement) {
  const storageKey = `mooogor-related-search-pos:${location.hostname}`;
  const saved = readPanelPosition(storageKey);
  if (saved) {
    host.style.left = `${saved.left}px`;
    host.style.top = `${saved.top}px`;
    host.style.right = "auto";
  }

  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const rect = host.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    host.style.left = `${rect.left}px`;
    host.style.top = `${rect.top}px`;
    host.style.right = "auto";
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    const rect = host.getBoundingClientRect();
    const nextLeft = clamp(startLeft + event.clientX - startX, 8, window.innerWidth - rect.width - 8);
    const nextTop = clamp(startTop + event.clientY - startY, 8, window.innerHeight - rect.height - 8);
    host.style.left = `${nextLeft}px`;
    host.style.top = `${nextTop}px`;
  });

  handle.addEventListener("pointerup", (event) => {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    handle.releasePointerCapture(event.pointerId);
    const rect = host.getBoundingClientRect();
    localStorage.setItem(
      storageKey,
      JSON.stringify({ left: rect.left, top: rect.top }),
    );
  });
}

function readPanelPosition(key: string): { left: number; top: number } | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "null") as {
      left?: number;
      top?: number;
    } | null;
    if (
      !parsed ||
      typeof parsed.left !== "number" ||
      typeof parsed.top !== "number"
    ) {
      return null;
    }
    return {
      left: clamp(parsed.left, 8, window.innerWidth - 64),
      top: clamp(parsed.top, 8, window.innerHeight - 64),
    };
  } catch {
    return null;
  }
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

function buildSearchUrl(engineUrl: string, keyword: string) {
  return engineUrl.replace("%s", encodeURIComponent(keyword));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
