import { db } from "./database";
import type { Favicon } from "./database";

export async function saveFavicon(favicon: Favicon) {
  return await db.favicons.put({
    ...favicon,
    lastUpdated: Date.now(),
  });
}

export async function getFavicon(domain: string) {
  return await db.favicons.get(domain);
}
