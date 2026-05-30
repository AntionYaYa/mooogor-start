import {
  saveFavicon,
  getDomainFromUrl,
  getWebSite,
  getEngine,
  getAllEnableEngine,
} from "../lib/DB/DB";
import type { Engine, Favicon } from "../lib/DB/DB";
import type { AppLanguage } from "../lib/utils/settings";
import { loadSettings } from "../lib/utils/settings";
import { resolveTheme } from "../lib/utils/theme";
import { getEffectiveLanguage } from "../lib/utils/i18n";
import enMessages from "@@/public/_locales/en/messages.json";
import zhCNMessages from "@@/public/_locales/zh_CN/messages.json";
import zhTWMessages from "@@/public/_locales/zh_TW/messages.json";

type RelatedSearchEngine = Pick<
  Engine,
  "id" | "title" | "engineUrl" | "faviconUrl" | "category" | "order"
> & {
  iconUrl?: string;
};

type RelatedSearchPayload = {
  matchedEngine: RelatedSearchEngine;
  engines: RelatedSearchEngine[];
  theme: ReturnType<typeof resolveTheme>;
  language: AppLanguage;
  texts: RelatedSearchTexts;
};

type RelatedSearchTexts = {
  placeholder: string;
  searchShortcutTip: string;
  switchShortcutTip: string;
};

type MessageMap = Record<string, { message?: string }>;

const localeMessages: Record<Exclude<AppLanguage, "auto">, MessageMap> = {
  en: enMessages,
  zh_CN: zhCNMessages,
  zh_TW: zhTWMessages,
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
    matchedEngine: await withInjectableIcon(matchedEngine),
    engines: await Promise.all(engines.map(withInjectableIcon)),
    theme: resolveTheme(settings.theme),
    language: settings.language,
    texts: getRelatedSearchTexts(settings.language),
  };
}

function getRelatedSearchTexts(language: AppLanguage): RelatedSearchTexts {
  return {
    placeholder: getLocaleMessage(language, "nt_search_placeholder_fallback"),
    searchShortcutTip: getLocaleMessage(
      language,
      "nt_related_search_shortcut_search",
    ),
    switchShortcutTip: getLocaleMessage(
      language,
      "nt_related_search_shortcut_switch",
    ),
  };
}

function getLocaleMessage(language: AppLanguage, key: string) {
  const effectiveLanguage = getEffectiveLanguage(language);
  return localeMessages[effectiveLanguage][key]?.message ?? key;
}

async function withInjectableIcon(
  engine: Engine,
): Promise<RelatedSearchEngine> {
  return {
    ...engine,
    iconUrl: await toInjectableIconUrl(engine.faviconUrl),
  };
}

async function toInjectableIconUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http")) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return "";
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
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
