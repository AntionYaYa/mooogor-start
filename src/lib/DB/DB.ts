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
  favicons: 'domain',
  webSits: 'domain',
});


export { db };


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
  return await db.favicons.get(domain);
}


// WebSite
export async function addWebSite(webSite: WebSite) {
  const newWebSite = { ...webSite, createAt: Date.now(), updateAt: Date.now() }
  return await db.webSits.add(newWebSite);
}

export async function deleteWebSite(domain: string) {
  return await db.webSits.delete(domain);
}

export async function updateWebSite(webSite: WebSite) {
  const newWebSite = { ...webSite, updateAt: Date.now() }
  return await db.favicons.update(webSite.domain, newWebSite);
}


export async function getAllWebSite():Promise<WebSite[]|[]> {
  return await db.webSits.toArray();
}