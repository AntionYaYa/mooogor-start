import Dexie from "dexie";
import type { EntityTable } from "dexie";

export interface Favicon {
  domain: string;
  faviconUrl: string;
  blob?: Blob;
  lastUpdated?: number;
}

export interface WebSite {
  id?: number; // 自增主键，新增时不需要提供
  domain: string;
  url: string;
  title?: string;
  order?: number; // 排序顺序，越小越靠前
  createAt?: number;
  updateAt?: number;
}

export interface Engine {
  id?: number; // 自增主键，新增时不需要提供
  domain: string;
  title?: string;
  engineUrl: string;
  order?: number; // 排序顺序，越小越靠前
  createAt?: number;
  updateAt?: number;
}

export const db = new Dexie("Mooogor") as Dexie & {
  favicons: EntityTable<Favicon, "domain">;
  webSites: EntityTable<WebSite, "id">;
  engines: EntityTable<Engine, "id">;
};

db.version(1).stores({
  favicons: "domain",
  webSites: "++id,domain",
  engines: "++id,domain",
});
