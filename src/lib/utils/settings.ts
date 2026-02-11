import { db } from "@/lib/DB/DB";

export type UserSettings = {
  language: "zh-CN" | "en-US";
  defaultOpen: "common" | "bookmark" | "history";
  newTabOpen: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = {
  language: "zh-CN",
  defaultOpen: "common",
  newTabOpen: false,
};

const SETTINGS_KEY = "settings";

export async function loadSettings(): Promise<UserSettings> {
  const row = await db.settings.get(SETTINGS_KEY);
  const stored = row?.value as Partial<UserSettings> | undefined;
  return {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
  };
}

export async function saveSettings(next: UserSettings): Promise<void> {
  await db.settings.put({ key: SETTINGS_KEY, value: next });
}
