import { db } from "./database";
import type { WebSite } from "./database";

export async function addWebSite(webSite: Omit<WebSite, "id">) {
  const now = Date.now();
  const count = await db.webSites.count();
  return await db.webSites.add({
    ...webSite,
    order: webSite.order ?? count,
    createAt: now,
    updateAt: now,
  });
}

export async function updateWebSite(webSite: WebSite & { id: number }) {
  const now = Date.now();
  const existing = await db.webSites.get(webSite.id);
  return await db.webSites.put({
    ...webSite,
    createAt: existing?.createAt ?? webSite.createAt ?? now,
    updateAt: now,
  });
}

export async function deleteWebSite(id: number) {
  return await db.webSites.delete(id);
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
}
