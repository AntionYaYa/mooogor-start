import { db } from "./database";
import type { WebSite } from "./database";

const WEBSITES_SEEDED_KEY = "websites_seeded_v1";
const WEBSITES_UPDATED_EVENT = "websites-updated";

function notifyWebSitesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WEBSITES_UPDATED_EVENT));
}

export async function addWebSite(webSite: Omit<WebSite, "id">) {
  const now = Date.now();
  const count = await db.webSites.count();
  const id = await db.webSites.add({
    ...webSite,
    order: webSite.order ?? count,
    createAt: now,
    updateAt: now,
  });
  notifyWebSitesUpdated();
  return id;
}

export async function updateWebSite(webSite: WebSite & { id: number }) {
  const now = Date.now();
  const existing = await db.webSites.get(webSite.id);
  const result = await db.webSites.put({
    ...webSite,
    order: webSite.order ?? existing?.order,
    createAt: existing?.createAt ?? webSite.createAt ?? now,
    updateAt: now,
  });
  notifyWebSitesUpdated();
  return result;
}

export async function deleteWebSite(id: number) {
  const result = await db.webSites.delete(id);
  notifyWebSitesUpdated();
  return result;
}

export async function getAllWebSite(): Promise<WebSite[]> {
  const sites = await db.webSites.toArray();
  return sites.sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
}

export async function getWebSite(domain: string): Promise<WebSite | undefined> {
  return await db.webSites.where("domain").equals(domain).first();
}

export async function updateWebSitesOrder(items: (WebSite & { id: number })[]) {
  const now = Date.now();
  await db.transaction("rw", db.webSites, async () => {
    for (let i = 0; i < items.length; i++) {
      await db.webSites.update(items[i].id, { order: i, updateAt: now });
    }
  });
  notifyWebSitesUpdated();
}

export async function ensureDefaultWebSites(
  defaults: Omit<WebSite, "id">[],
) {
  await db.transaction("rw", db.settings, db.webSites, async () => {
    const seeded = await db.settings.get(WEBSITES_SEEDED_KEY);
    if (seeded?.value === true) return;

    const count = await db.webSites.count();
    if (count === 0 && defaults.length > 0) {
      const now = Date.now();
      await db.webSites.bulkAdd(
        defaults.map((site, i) => ({
          ...site,
          order: site.order ?? i,
          createAt: now,
          updateAt: now,
        })),
      );
    }

    await db.settings.put({ key: WEBSITES_SEEDED_KEY, value: true });
  });
}

export async function resetWebSitesToDefault(
  defaults: Omit<WebSite, "id">[],
) {
  await db.transaction("rw", db.settings, db.webSites, async () => {
    await db.webSites.clear();
    const now = Date.now();
    if (defaults.length > 0) {
      await db.webSites.bulkAdd(
        defaults.map((site, i) => ({
          ...site,
          order: i,
          createAt: now,
          updateAt: now,
        })),
      );
    }
    await db.settings.put({ key: WEBSITES_SEEDED_KEY, value: true });
  });
  notifyWebSitesUpdated();
}
