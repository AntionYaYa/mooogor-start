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

export const ENGINE_CATEGORY_KEYS = ["1", "2", "3", "4", "5", "6"] as const;
export type EngineCategory = (typeof ENGINE_CATEGORY_KEYS)[number];

export interface Engine {
  id?: number; // 自增主键，新增时不需要提供
  title?: string;
  engineUrl: string;
  faviconUrl: string;
  category?: EngineCategory; // 搜索分类，默认综合（1）
  enabled?: boolean;
  order?: number; // 排序顺序，越小越靠前
  createAt?: number;
  updateAt?: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export const db = new Dexie("Mooogor") as Dexie & {
  favicons: EntityTable<Favicon, "domain">;
  webSites: EntityTable<WebSite, "id">;
  engines: EntityTable<Engine, "id">;
  settings: EntityTable<SettingRow, "key">;
};

db.version(1).stores({
  favicons: "domain",
  webSites: "++id,domain",
  engines: "++id,domain",
  settings: "key",
});

db.version(2)
  .stores({
    favicons: "domain",
    webSites: "++id,domain",
    engines: "++id,domain,category,enabled,order",
    settings: "key",
  })
  .upgrade(async (tx) => {
    await tx
      .table("engines")
      .toCollection()
      .modify((engine: Engine) => {
        if (!engine.category) {
          engine.category = "1";
        }
      });
  });
