import Dexie from "dexie";

export interface Favicon {
  domain: string;
  faviconUrl: string;
  blob?: Blob;
  lastUpdated: number;
}

export class DB extends Dexie {
  favicons!: Dexie.Table<Favicon, string>;

  constructor() {
    super("MooogorDB");
    this.version(1).stores({
      favicons: "domain,lastUpdated"
    });
  }
}

export const db = new DB();


// 增：插入或覆盖
export async function addFavicon(favicon: Favicon) {
  return await db.favicons.put(favicon);
}

// 删：按 domain 删除
export async function deleteFavicon(domain: string) {
  return await db.favicons.delete(domain);
}

// 改：更新已存在 favicon（仅更新部分字段）
export async function updateFavicon(domain: string, data: Partial<Favicon>) {
  return await db.favicons.update(domain, { ...data, lastUpdated: Date.now() });
}

// 查：按 domain 获取
export async function getFavicon(domain: string) {
  return await db.favicons.get(domain);
}

// 查：获取所有 favicon
export async function getAllFavicons() {
  return await db.favicons.toArray();
}

// 查：按更新时间排序获取最近 N 条
export async function getRecentFavicons(limit = 10) {
  return await db.favicons.orderBy("lastUpdated").reverse().limit(limit).toArray();
}