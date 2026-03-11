import { getFavicon } from "../DB/DB";

const faviconUrlCache = new Map<string, string | null>();
const faviconPromiseCache = new Map<string, Promise<string | null>>();

export function getCachedEngineFavicon(domain: string) {
  return faviconUrlCache.get(domain);
}

async function loadEngineFavicon(domain: string): Promise<string | null> {
  const record = await getFavicon(domain);
  if (!record?.blob) {
    faviconUrlCache.set(domain, null);
    return null;
  }
  const objectUrl = URL.createObjectURL(record.blob);
  faviconUrlCache.set(domain, objectUrl);
  return objectUrl;
}

export async function ensureEngineFaviconCached(domain: string) {
  if (faviconUrlCache.has(domain)) {
    return faviconUrlCache.get(domain) ?? null;
  }
  let pending = faviconPromiseCache.get(domain);
  if (!pending) {
    pending = loadEngineFavicon(domain).finally(() => {
      faviconPromiseCache.delete(domain);
    });
    faviconPromiseCache.set(domain, pending);
  }
  return pending;
}

export function clearEngineFaviconCache(domain?: string) {
  if (domain) {
    const cached = faviconUrlCache.get(domain);
    if (cached) URL.revokeObjectURL(cached);
    faviconUrlCache.delete(domain);
    faviconPromiseCache.delete(domain);
    return;
  }
  for (const cached of faviconUrlCache.values()) {
    if (cached) URL.revokeObjectURL(cached);
  }
  faviconUrlCache.clear();
  faviconPromiseCache.clear();
}
