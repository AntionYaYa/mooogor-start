import { sendMessage } from "webext-bridge/content-script";

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  main() {
    init()
  }
});


async function init() {
  const faviconUrl = getBestFavicon()

  const newFavicon = {
    domain: location.origin, faviconUrl: faviconUrl
  }

  await sendMessage("saveFavicon", newFavicon, "background");
}

function getBestFavicon(): string {
  const links = Array.from(document.querySelectorAll("link"));
  const candidates: {
    href: string;
    size: number;
    priority: number;
  }[] = [];

  links.forEach(link => {
    const rel = (link.getAttribute("rel") || "").toLowerCase();
    const href = link.getAttribute("href");
    const sizesAttr = link.getAttribute("sizes");

    if (!href) return;

    const absoluteHref = new URL(href, location.href).toString();
    let priority = 0;
    let size = 0;

    // 最高优先 apple-touch-icon
    if (rel.includes("apple-touch-icon")) {
      priority = 3;
    } else if (rel === "icon" || rel === "shortcut icon") {
      priority = 2;
    }

    // 解析 sizes 属性（如 "32x32" / "180x180"）
    if (sizesAttr) {
      const px = parseInt(sizesAttr.split("x")[0]);
      if (!isNaN(px)) {
        size = px;
      }
    }

    candidates.push({ href: absoluteHref, size, priority });
  });

  // 如果没有任何 link，尝试默认 /favicon.ico
  if (candidates.length === 0) {
    try {
      candidates.push({
        href: new URL("/favicon.ico", location.origin).toString(),
        size: 0,
        priority: 1
      });
    } catch { }
  }

  // 按 优先级 → size 排序（大的更优）
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.size - a.size;
  });

  return candidates[0]?.href || "";
}