import { browser } from "wxt/browser";

export function resolvePublicAssetUrl(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const encoded = encodeURI(normalized);
  const getURL = browser.runtime.getURL as (runtimePath: string) => string;
  return getURL(encoded);
}
