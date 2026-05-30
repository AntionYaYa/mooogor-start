import {
  saveFavicon,
  getDomainFromUrl,
  getWebSite,
  getEngine,
  getAllEnableEngine,
} from "../lib/DB/DB";
import type { Engine, Favicon } from "../lib/DB/DB";
import { loadSettings } from "../lib/utils/settings";

type RelatedSearchEngine = Pick<
  Engine,
  "id" | "title" | "engineUrl" | "faviconUrl" | "category" | "order"
>;

type RelatedSearchPayload = {
  matchedEngine: RelatedSearchEngine;
  engines: RelatedSearchEngine[];
};

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") return;
    const { type, payload } = message as {
      type?: string;
      payload?: { url?: string; faviconUrl?: string };
    };
    if (type === "saveFavicon") return onFavicon(payload);
    if (type === "shouldStoreFavicon") return onShouldStoreFavicon(payload);
    if (type === "getRelatedSearchEngines") {
      return onGetRelatedSearchEngines(payload);
    }
  });
});

function normalizeHost(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function getEngineHost(engine: Pick<Engine, "engineUrl">) {
  try {
    return normalizeHost(new URL(engine.engineUrl.replace("%s", "search")).hostname);
  } catch {
    return "";
  }
}

async function onGetRelatedSearchEngines(data?: {
  url?: string;
}): Promise<RelatedSearchPayload | null> {
  if (!data?.url) return null;
  const settings = await loadSettings();
  if (!settings.injectRelatedSearch) return null;

  let currentHost = "";
  try {
    currentHost = normalizeHost(new URL(data.url).hostname);
  } catch {
    return null;
  }

  const enabledEngines = await getAllEnableEngine();
  const matchedEngine = enabledEngines.find(
    (engine) => getEngineHost(engine) === currentHost,
  );
  if (!matchedEngine) return null;

  const category = matchedEngine.category?.trim() || "1";
  const engines = enabledEngines.filter(
    (engine) => (engine.category?.trim() || "1") === category,
  );

  return {
    matchedEngine,
    engines,
  };
}

async function onFavicon(data?: { url?: string; faviconUrl?: string }) {
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

async function onShouldStoreFavicon(data?: { url?: string }) {
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
