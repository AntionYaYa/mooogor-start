import {
  saveFavicon,
  getFavicon,
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
import {
  initializeFreshStoredConfig,
  initializeStoredConfig,
} from "../lib/DB/configMigration";
import {
  ensureDefaultEngineCategories,
  ensureDefaultEngines,
  ensureDefaultWebSites,
} from "../lib/DB/DB";
import { buildDefaultWebSites } from "../lib/config/defaultWebSites";
import { buildDefaultEngines } from "../lib/DB/defaultEnginesFactory";
import { buildDefaultEngineCategories } from "../lib/config/engineCategories";
import {
  deleteHistoryRange,
  deleteHistoryUrls,
  getFrequentSites,
  getHistoryItems,
  searchHistory,
} from "../lib/browser/history";
import enMessages from "@@/public/_locales/en/messages.json";
import zhCNMessages from "@@/public/_locales/zh_CN/messages.json";
import zhTWMessages from "@@/public/_locales/zh_TW/messages.json";
import {
  initializeDataSync,
  registerDataSyncListener,
} from "../lib/sync/dataSync";
import { persistLocalStorageHealthUpdate } from "../lib/storage/localStorageHealth";

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

let configurationReadyPromise: Promise<void> | null = null;
const CONFIG_LOG_PREFIX = "[Mooogor Config]";
type ConfigurationTrigger = "install" | "update" | "ensureConfigReady";

function prepareConfiguration(
  isFreshInstall = false,
  trigger: ConfigurationTrigger = "ensureConfigReady",
): Promise<void> {
  if (configurationReadyPromise) return configurationReadyPromise;

  const startedAt = Date.now();
  configurationReadyPromise = (async () => {
    if (isFreshInstall) {
      await initializeFreshStoredConfig();
    } else {
      await initializeStoredConfig();
    }
    const language = getEffectiveLanguage("auto");
    await ensureDefaultWebSites(buildDefaultWebSites(language));
    await ensureDefaultEngineCategories(buildDefaultEngineCategories());
    await ensureDefaultEngines(buildDefaultEngines(language));
    await initializeDataSync();
  })().catch((error) => {
    configurationReadyPromise = null;
    console.error(CONFIG_LOG_PREFIX, "initialization:failed", {
      trigger,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  });
  return configurationReadyPromise;
}

export default defineBackground(() => {
  registerDataSyncListener();
  browser.runtime.onInstalled.addListener((details) => {
    const isFreshInstall = details.reason === "install";
    const trigger: ConfigurationTrigger = isFreshInstall ? "install" : "update";
    void prepareConfiguration(isFreshInstall, trigger).catch((error) => {
      // A new-tab page can ask the service worker to retry if initialization
      // was interrupted during the install or update lifecycle event.
      console.error("Failed to initialize Mooogor configuration", error);
    });
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;
    const { type, payload, requestId, state } = message as {
      type?: string;
      requestId?: string;
      state?: unknown;
      payload?: {
        url?: string;
        faviconUrl?: string;
        domain?: string;
        query?: string;
        startTime?: number;
        endTime?: number;
        maxResults?: number;
        urls?: string[];
      };
    };
    if (type === "updateLocalStorageHealth") {
      return persistLocalStorageHealthUpdate(state ?? null);
    }
    if (type === "ensureConfigReady") {
      void prepareConfiguration(false, "ensureConfigReady").then(
        () => {
          sendResponse({ ok: true, requestId });
        },
        (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(CONFIG_LOG_PREFIX, "message:ensureConfigReady:failed", {
            requestId,
            error,
          });
          sendResponse({ ok: false, requestId, error: errorMessage });
        },
      );
      // Keep the response channel open on Chromium versions that do not support
      // returning a Promise directly from an onMessage listener.
      return true;
    }
    if (type === "getFrequentSites") return getFrequentSites();
    if (type === "getHistoryItems") return getHistoryItems(payload);
    if (type === "searchHistory") {
      return searchHistory(payload?.query ?? "", payload?.maxResults);
    }
    if (type === "deleteHistoryRange") {
      if (payload?.startTime == null || payload.endTime == null) return;
      return deleteHistoryRange({
        startTime: payload.startTime,
        endTime: payload.endTime,
      });
    }
    if (type === "deleteHistoryUrls") {
      if (!payload?.urls?.length) return;
      return deleteHistoryUrls(payload.urls);
    }
    if (type === "getFaviconData") return onGetFaviconData(payload);
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

async function onGetFaviconData(data?: { domain?: string }) {
  if (!data?.domain) return null;
  const favicon = await getFavicon(data.domain);
  if (!favicon?.blob) return null;
  return { dataUrl: await blobToDataUrl(favicon.blob) };
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
