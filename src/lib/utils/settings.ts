import { db } from "@/lib/DB/DB";

export type AppLanguage =
  | "auto"
  | "zh_CN"
  | "zh_TW"
  | "en";
export type OpenTab = "common" | "bookmark" | "history";
export type DefaultOpen = OpenTab | "last";
export type AppTheme =
  | "default"
  | "ocean"
  | "sunset"
  | "purple"
  | "yellow"
  | "random";

export type UserSettings = {
  defaultOpen: DefaultOpen;
  lastOpenTab: OpenTab;
  newTabOpen: boolean;
  searchBookmarks: boolean;
  searchHistory: boolean;
  rememberSearchEngineCategory: boolean;
  injectRelatedSearch: boolean;
  language: AppLanguage;
  theme: AppTheme;
};

export const DEFAULT_SETTINGS: UserSettings = {
  defaultOpen: "common",
  lastOpenTab: "common",
  newTabOpen: false,
  searchBookmarks: true,
  searchHistory: true,
  rememberSearchEngineCategory: false,
  injectRelatedSearch: true,
  language: "auto",
  theme: "default",
};

const SETTINGS_KEY = "settings";
const DEFAULT_OPEN_VALUES = ["common", "bookmark", "history", "last"] as const;
const OPEN_TAB_VALUES = ["common", "bookmark", "history"] as const;
const LANGUAGE_VALUES = [
  "auto",
  "zh_CN",
  "zh_TW",
  "en",
] as const;
const THEME_VALUES = [
  "default",
  "ocean",
  "sunset",
  "purple",
  "yellow",
  "random",
] as const;

function isDefaultOpen(
  value: unknown,
): value is DefaultOpen {
  return DEFAULT_OPEN_VALUES.includes(
    value as (typeof DEFAULT_OPEN_VALUES)[number],
  );
}

function isOpenTab(value: unknown): value is OpenTab {
  return OPEN_TAB_VALUES.includes(value as OpenTab);
}

function isLanguage(value: unknown): value is AppLanguage {
  return LANGUAGE_VALUES.includes(value as AppLanguage);
}

function isTheme(value: unknown): value is AppTheme {
  return THEME_VALUES.includes(value as AppTheme);
}

async function loadStoredSettings(): Promise<Partial<UserSettings> | undefined> {
  const row = await db.settings.get(SETTINGS_KEY);
  return row?.value as Partial<UserSettings> | undefined;
}

export async function loadSettings(): Promise<UserSettings> {
  const stored = await loadStoredSettings();
  return {
    defaultOpen: isDefaultOpen(stored?.defaultOpen)
      ? stored.defaultOpen
      : DEFAULT_SETTINGS.defaultOpen,
    lastOpenTab: isOpenTab(stored?.lastOpenTab)
      ? stored.lastOpenTab
      : DEFAULT_SETTINGS.lastOpenTab,
    newTabOpen: stored?.newTabOpen ?? DEFAULT_SETTINGS.newTabOpen,
    searchBookmarks:
      stored?.searchBookmarks ?? DEFAULT_SETTINGS.searchBookmarks,
    searchHistory: stored?.searchHistory ?? DEFAULT_SETTINGS.searchHistory,
    rememberSearchEngineCategory:
      stored?.rememberSearchEngineCategory ??
      DEFAULT_SETTINGS.rememberSearchEngineCategory,
    injectRelatedSearch:
      stored?.injectRelatedSearch ?? DEFAULT_SETTINGS.injectRelatedSearch,
    language: isLanguage(stored?.language)
      ? stored.language
      : DEFAULT_SETTINGS.language,
    theme: isTheme(stored?.theme) ? stored.theme : DEFAULT_SETTINGS.theme,
  };
}

export async function saveSettings(next: UserSettings): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEY, value: next });
}
