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
