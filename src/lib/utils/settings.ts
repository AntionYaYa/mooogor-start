import { db } from "@/lib/DB/DB";

export type AppLanguage =
  | "auto"
  | "zh_CN"
  | "zh_TW"
  | "en";
export type OpenTab = "common" | "bookmark" | "history";
export type DefaultOpen = OpenTab | "last";

export type UserSettings = {
  defaultOpen: DefaultOpen;
  lastOpenTab: OpenTab;
  newTabOpen: boolean;
  language: AppLanguage;
};

export const DEFAULT_SETTINGS: UserSettings = {
  defaultOpen: "common",
  lastOpenTab: "common",
  newTabOpen: false,
  language: "auto",
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

export async function loadSettings(): Promise<UserSettings> {
  const row = await db.settings.get(SETTINGS_KEY);
  const stored = row?.value as Partial<UserSettings> | undefined;
  return {
    defaultOpen: isDefaultOpen(stored?.defaultOpen)
      ? stored.defaultOpen
      : DEFAULT_SETTINGS.defaultOpen,
    lastOpenTab: isOpenTab(stored?.lastOpenTab)
      ? stored.lastOpenTab
      : DEFAULT_SETTINGS.lastOpenTab,
    newTabOpen: stored?.newTabOpen ?? DEFAULT_SETTINGS.newTabOpen,
    language: isLanguage(stored?.language)
      ? stored.language
      : DEFAULT_SETTINGS.language,
  };
}

export async function saveSettings(next: UserSettings): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEY, value: next });
}
