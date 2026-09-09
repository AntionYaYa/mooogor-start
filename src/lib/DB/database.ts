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
  /** Colors calculated from the site's icon when it is added. */
  backgroundColor?: string;
  backgroundColorAlt?: string;
  /** Undefined means the site lives at the root level. */
  folderId?: number;
  order?: number; // 排序顺序，越小越靠前
  createAt?: number;
  updateAt?: number;
}

export interface WebSiteScreenshot {
  websiteId: number;
  /** Guards against a locally reused numeric id pointing at another site. */
  url: string;
  blob: Blob;
  updatedAt: number;
}

export interface WebSiteFolder {
  id?: number;
  title: string;
  order?: number;
  createAt?: number;
  updateAt?: number;
}

export type EngineCategory = string;

export interface EngineCategoryItem {
  id: string; // 分类ID
  name: string;
  order?: number;
  createAt?: number;
  updateAt?: number;
}

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
  webSiteFolders: EntityTable<WebSiteFolder, "id">;
  webSiteScreenshots: EntityTable<WebSiteScreenshot, "websiteId">;
  engines: EntityTable<Engine, "id">;
  engineCategories: EntityTable<EngineCategoryItem, "id">;
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
    webSites: "++id,domain,order",
    engines: "++id,domain,category,enabled,order",
    engineCategories: "id,order",
    settings: "key",
  })
  .upgrade(async (tx) => {
    const table = tx.table("webSites");
    const items = await table.toArray();
    if (!items.length) return;

    let maxOrder = -1;
    for (const item of items) {
      const order = (item as WebSite).order;
      if (typeof order === "number" && Number.isFinite(order) && order > maxOrder) {
        maxOrder = order;
      }
    }

    let nextOrder = maxOrder + 1;
    const updates = items.flatMap((item) => {
      const order = (item as WebSite).order;
      if (typeof order === "number" && Number.isFinite(order)) return [];
      return [{ ...item, order: nextOrder++ }];
    });

    if (updates.length) {
      await table.bulkPut(updates);
    }
  });

db.version(3).stores({
  favicons: "domain",
  webSites: "++id,domain,order,folderId",
  webSiteFolders: "++id,order",
  engines: "++id,domain,category,enabled,order",
  engineCategories: "id,order",
  settings: "key",
});

db.version(4).stores({
  favicons: "domain",
  webSites: "++id,domain,order,folderId",
  webSiteFolders: "++id,order",
  webSiteScreenshots: "websiteId,url,updatedAt",
  engines: "++id,domain,category,enabled,order",
  engineCategories: "id,order",
  settings: "key",
});
