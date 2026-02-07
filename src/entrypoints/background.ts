import { saveFavicon, getDomainFromUrl, getWebSite,getEngine } from "../lib/DB/DB";
import type { Favicon } from "../lib/DB/DB";
import { onMessage } from "webext-bridge/background";

export default defineBackground(() => {
  onMessage("saveFavicon", onFavicon);
  onMessage("shouldStoreFavicon", onShouldStoreFavicon);
});


async function onFavicon({ data }: { data: any }) {
  if (!data?.url || !data?.faviconUrl) return;
  const shouldStore = await shouldStoreFavicon(data.url);
  if (!shouldStore) return;
  const domain = getDomainFromUrl(data.url);
  const blob: Blob | undefined = await urlToBlob(data.faviconUrl);
  const newFavicon: Favicon = {
    domain,
    faviconUrl: data.faviconUrl,
    blob,
  };
  await saveFavicon(newFavicon);

}

async function onShouldStoreFavicon({ data }: { data: any }) {
  if (!data?.url) return false;
  return await shouldStoreFavicon(data.url);
}

async function shouldStoreFavicon(url: string): Promise<boolean> {
  const domain = getDomainFromUrl(url);
  const inEngine = await getEngine(domain);
  if (inEngine) return true;
  const inWebSites = await getWebSite(domain);
  if (inWebSites) return true;
  return await hasBookmark(domain);
}

async function hasBookmark(domain: string): Promise<boolean> {
  try {
    const hasBookmarks = await browser.permissions.contains({
      permissions: ["bookmarks"],
    });
    if (!hasBookmarks) return false;
    const bookmarks = await browser.bookmarks.search({ query: domain });
    for (const b of bookmarks) {
      if (!b.url) continue;
      try {
        if (getDomainFromUrl(b.url) === domain) return true;
      } catch {
        continue;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function urlToBlob(url: string): Promise<Blob | undefined> {
  if (!url) return undefined;
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const blob = await response.blob();
  return blob;
}

// browser.contextMenus.onClicked.addListener((info, tab) => {
//   console.log(info,tab)
// });
