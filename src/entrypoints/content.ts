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
}

/**
 * 健壮的消息发送封装
 */
type BackgroundMessage =
  | { type: "shouldStoreFavicon"; payload: { url: string } }
  | { type: "saveFavicon"; payload: { url: string; faviconUrl: string } };

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
