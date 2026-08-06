import type { Favicon } from "./database";
import { faviconDb } from "./faviconDatabase";

export async function saveFavicon(favicon: Favicon) {
  const domain = favicon.domain.toLowerCase();
  await faviconDb.favicons.put({
    ...favicon,
    domain,
    lastUpdated: Date.now(),
  });
}

export async function getFavicon(domain: string) {
  return await faviconDb.favicons.get(domain.toLowerCase());
}
