import Dexie from "dexie";
import type { EntityTable } from "dexie";

export interface Favicon {
  domain: string;
  faviconUrl: string;
  blob?: Blob;
  lastUpdated?: number;
}

export interface WebSite {
  domain: string;
  url: string;
  title?: string;
  createAt?: number;
  updateAt?: number;
}

const db = new Dexie('Mooogor') as Dexie & {
  favicons: EntityTable<Favicon, 'domain'>;
  webSits: EntityTable<WebSite, 'domain'>;
};

db.version(1).stores({
  favicons: '++id,domain',
  webSits: 'domain',
});


export { db };

//通用的hostname
export function getDomainFromUrl(url: string): string {
  return new URL(url).hostname;
}

// Favicon
export async function addFavicon(favicon: Favicon) {
  const newFavicon = { ...favicon, lastUpdated: Date.now() }
  return await db.favicons.add(newFavicon);
}

export async function updateFavicon(favicon: Favicon) {
  const newFavicon = { ...favicon, lastUpdated: Date.now() }
  return await db.favicons.update(favicon.domain, newFavicon);
}

export async function getFavicon(domain: string) {
  return await db.favicons.where("domain").equals(domain).first();
}

// WebSite
// 根据 domain 作为主键做 upsert：存在则更新，不存在则新增
export async function saveWebSite(webSite: WebSite) {
  const now = Date.now();
  const existing = await db.webSits.get(webSite.domain);

  if (existing) {
    const updated: WebSite = {
      ...existing,
      ...webSite,
      createAt: existing.createAt ?? now,
      updateAt: now,
    };
    return await db.webSits.put(updated);
  } else {
    const newWebSite: WebSite = {
      ...webSite,
      createAt: now,
      updateAt: now,
    };
    return await db.webSits.put(newWebSite);
  }
}

export async function deleteWebSite(domain: string) {
  return await db.webSits.delete(domain);
}


export async function getAllWebSite():Promise<WebSite[]|[]> {
  return await db.webSits.toArray();
}