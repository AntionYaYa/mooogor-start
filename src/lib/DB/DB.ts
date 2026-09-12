export { db } from "./database";
export { getDomainFromUrl } from "./utils";

export type { Favicon } from "./database";
export { saveFavicon, getFavicon } from "./favicons";

export type { WebSite } from "./database";
export {
  addWebSite,
  updateWebSite,
  updateWebSiteBackgroundColor,
  deleteWebSite,
  getAllWebSite,
  getWebSite,
  updateWebSiteScreenshot,
  removeWebSiteScreenshot,
  updateWebSitesOrder,
  moveWebSitesToFolder,
  ensureDefaultWebSites,
  resetWebSitesToDefault,
} from "./websites";

export type { WebSiteFolder } from "./database";
export {
  addWebSiteFolder,
  updateWebSiteFolder,
  deleteWebSiteFolder,
  getAllWebSiteFolders,
  updatePinnedItemsOrder,
} from "./websiteFolders";
export type { PinnedOrderItem } from "./websiteFolders";

export type { WebSiteScreenshot } from "./database";
export {
  saveWebSiteScreenshot,
  getWebSiteScreenshot,
  deleteWebSiteScreenshot,
  clearWebSiteScreenshots,
} from "./websiteScreenshots";

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
  FALLBACK_ENGINE_CATEGORY_ID,
  addEngineCategory,
  renameEngineCategory,
  deleteEngineCategory,
  updateEngineCategoriesOrder,
} from "./engineCategories";
