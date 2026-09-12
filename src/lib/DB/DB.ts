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
  getEnabledEngines,
  getEngines,
  getDisabledEngines,
  getAllEnableEngine,
  getEngine,
} from "./engines";

export * from "./engineCommands";

export type { EngineCategoryItem } from "./database";
export {
  getEngineCategories,
  FALLBACK_ENGINE_CATEGORY_ID,
} from "./engineCategories";
