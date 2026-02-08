import { sendMessage } from "webext-bridge/content-script";

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  main() {
    init()
  }
});


async function init() {
  let shouldStore = false;

  shouldStore = await sendMessage(
    "shouldStoreFavicon",
    { url: location.href },
    "background",
  );

  if (!shouldStore) return;

  const faviconUrl = getBestFavicon();
  if (faviconUrl) {
    const newFavicon = {
      url: location.href,
      faviconUrl,
    };
    await sendMessage("saveFavicon", newFavicon, "background");
  }
}

function getBestFavicon(): string {
  // 1. 优先 apple-touch-icon（通常是高清图）
  const apple = document.querySelector<HTMLLinkElement>(
    'link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]'
  );
  if (apple?.href) return toAbsUrl(apple.href);

  // 2. 在 icon 中找 sizes 最大的，如果没有 sizes，则作为兜底
  const icons = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
  );

  let best: HTMLLinkElement | null = null;
  let maxSize = 0;
  let fallback: HTMLLinkElement | null = null;

  for (const icon of icons) {
    if (!fallback && icon.href) fallback = icon;

    const sizes = icon.getAttribute('sizes');
    if (!sizes || sizes === 'any') continue;

    const size = parseInt(sizes.split('x')[0], 10);
    if (size > maxSize) {
      maxSize = size;
      best = icon;
    }
  }

  if (best?.href) return toAbsUrl(best.href);
  if (fallback?.href) return toAbsUrl(fallback.href);

  return '';
}

function toAbsUrl(url: string) {
  return new URL(url, location.href).href;
}
