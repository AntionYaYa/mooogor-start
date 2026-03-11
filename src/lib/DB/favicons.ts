import { db } from "./database";
import type { Engine, Favicon } from "./database";
import { getDomainFromUrl } from "./utils";

export async function saveFavicon(favicon: Favicon) {
  return await db.favicons.put({
    ...favicon,
    lastUpdated: Date.now(),
  });
}

export async function getFavicon(domain: string) {
  return await db.favicons.get(domain);
}

type EngineFaviconSource = Pick<Engine, "engineUrl" | "faviconUrl">;

function resolveEngineDomain(engineUrl: string): string | null {
  try {
    return getDomainFromUrl(engineUrl.replace("%s", "search"));
  } catch {
    return null;
  }
}

async function fetchFaviconBlob(url: string): Promise<Blob | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    return await response.blob();
  } catch {
    return undefined;
  }
}

export async function ensureEngineFavicons(engines: EngineFaviconSource[]) {
  if (!engines.length) return;
  const candidates = new Map<string, string>();
  for (const engine of engines) {
    if (!engine.faviconUrl) continue;
    const domain = resolveEngineDomain(engine.engineUrl);
    if (!domain || candidates.has(domain)) continue;
    candidates.set(domain, engine.faviconUrl);
  }
  if (!candidates.size) return;

  const pending: Favicon[] = [];
  for (const [domain, faviconUrl] of candidates) {
    const existing = await db.favicons.get(domain);
    if (existing?.blob || existing?.faviconUrl) continue;
    const blob = await fetchFaviconBlob(faviconUrl);
    pending.push({
      domain,
      faviconUrl,
      blob,
      lastUpdated: Date.now(),
    });
  }
  if (pending.length) {
    await db.favicons.bulkPut(pending);
  }
}
