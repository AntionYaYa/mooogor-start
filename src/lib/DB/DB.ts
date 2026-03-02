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
} from "./websites";

export type { Engine } from "./database";
export {
  addEngine,
  updateEngine,
  deleteEngine,
  getEnabledEngines,
  getDisabledEngines,
  getAllEnableEngine,
  getEngine,
  updateEnginesOrder,
  updateEnginesState,
  ensureDefaultEngines,
} from "./engines";
