import { addFavicon } from "../lib/DB/DB";
import type { Favicon } from "../lib/DB/DB";

export default defineBackground(() => {
  browser.webNavigation.onCompleted.addListener(async (activeInfo) => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (!tab || !tab.url) return;
    const newFavicon: Favicon = {
      domain: new URL(tab.url).hostname,
      faviconUrl: tab.favIconUrl ?? '',
      lastUpdated: Date.now()
    }
    await addFavicon(newFavicon)
  });
});






