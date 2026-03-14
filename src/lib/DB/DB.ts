export { db } from "./database";
export { getDomainFromUrl } from "./utils";

export type { Favicon } from "./database";
export { saveFavicon, getFavicon } from "./favicons";

export type { WebSite } from "./database";
export {
  addWebSite,
  updateWebSite,
  deleteWebSite,
  getAllWebSite,
  getWebSite,
  updateWebSitesOrder,
  ensureDefaultWebSites,
  resetWebSitesToDefault,
} from "./websites";

export type { Engine, EngineCategory } from "./database";
export {
  addEngine,
  updateEngine,
  deleteEngine,
  getEnabledEngines,
  getDisabledEngines,
  getAllEnableEngine,
  getEngine,
  updateEnginesLayout,
  updateEnginesOrder,
  updateEnginesState,
  updateEngineCategory,
  ensureDefaultEngines,
  resetEnginesToDefault,
} from "./engines";

export { resetSearchEnginesToDefault } from "./resetSearchEngines";

export type { EngineCategoryItem } from "./database";
export {
  getEngineCategories,
  ensureDefaultEngineCategories,
  ensureEngineCategory,
  ensureFallbackEngineCategory,
  FALLBACK_ENGINE_CATEGORY_ID,
  addEngineCategory,
  renameEngineCategory,
  deleteEngineCategory,
  updateEngineCategoriesOrder,
} from "./engineCategories";
