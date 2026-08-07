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

  const entries = Array.from(candidates.entries());
  const domains = entries.map(([domain]) => domain);
  const existingRecords = await db.favicons.bulkGet(domains);

  const pending: Favicon[] = [];
  const missing: Array<{ domain: string; faviconUrl: string }> = [];
  const now = Date.now();
  for (let i = 0; i < entries.length; i++) {
    const [domain, faviconUrl] = entries[i];
    const existing = existingRecords[i];
    if (existing?.blob) {
      if (existing.faviconUrl !== faviconUrl) {
        pending.push({
          domain,
          faviconUrl,
          blob: existing.blob,
          lastUpdated: now,
        });
      }
      continue;
    }
    missing.push({ domain, faviconUrl });
  }

  if (missing.length) {
    const fetched = await Promise.all(
      missing.map(async ({ domain, faviconUrl }) => {
        const blob = await fetchFaviconBlob(faviconUrl);
        return { domain, faviconUrl, blob, lastUpdated: now } as Favicon;
      }),
    );
    pending.push(...fetched);
  }
  if (pending.length) {
    await db.favicons.bulkPut(pending);
  }
}
