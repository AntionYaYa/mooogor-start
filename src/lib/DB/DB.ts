import Dexie from "dexie";
import type { EntityTable } from "dexie";

export interface Favicon {
  domain: string;
  faviconUrl: string;
  blob?: Blob;
  lastUpdated?: number;
}

export interface WebSite {
  id?: number;  // 自增主键，新增时不需要提供
  domain: string;
  url: string;
  title?: string;
  order?: number;  // 排序顺序，越小越靠前
  createAt?: number;
  updateAt?: number;
}

const db = new Dexie('Mooogor') as Dexie & {
  favicons: EntityTable<Favicon, 'domain'>;
  webSites: EntityTable<WebSite, 'id'>;
};

db.version(1).stores({
  favicons: 'domain',
  webSites: '++id',  // 旧版本，用于迁移
});


export { db };

// 通用的hostname
export function getDomainFromUrl(url: string): string {
  return new URL(url).hostname;
}

// Favicon
export async function saveFavicon(favicon: Favicon) {
  return await db.favicons.put({
    ...favicon,
    lastUpdated: Date.now(),
  });
}

export async function getFavicon(domain: string) {
  return await db.favicons.get(domain);  // 主键查找，比 where 更高效
}

// WebSite
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

export async function updateWebSitesOrder(items: (WebSite & { id: number })[]) {
  const now = Date.now();
  await db.transaction("rw", db.webSites, async () => {
    for (let i = 0; i < items.length; i++) {
      await db.webSites.update(items[i].id, { order: i, updateAt: now });
    }
  });
}