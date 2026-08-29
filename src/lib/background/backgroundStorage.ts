import {
  getStoredConfig,
  updateStoredConfig,
} from "@/lib/DB/configStorage";
import {
  cloneBackgroundItem,
  normalizeBackgroundItems,
  type BackgroundItem,
} from "./background";
import {
  SETTINGS_KEY,
  type BackgroundSettings,
  type UserSettings,
} from "@/lib/utils/settings";

export async function loadBackgroundItems() {
  const config = await getStoredConfig();
  const settings = config.metadata[SETTINGS_KEY] as Partial<UserSettings> & {
    background?: {
      enabled?: unknown;
      current?: { id?: unknown };
      items?: unknown;
    };
  } | undefined;
  const legacyBackground = settings?.background;
  if (!Array.isArray(legacyBackground?.items)) {
    return normalizeBackgroundItems(config.backgrounds);
  }
  const items = normalizeBackgroundItems(legacyBackground.items);
  const id = typeof legacyBackground.current?.id === "string"
    ? legacyBackground.current.id
    : null;
  const setting: BackgroundSettings = {
    enabled: legacyBackground.enabled === true && id !== null,
    id,
  };
  await saveBackgroundConfiguration(setting, items);
  return items;
}

export async function saveBackgroundConfiguration(
  setting: BackgroundSettings,
  items: BackgroundItem[],
) {
  await updateStoredConfig((config) => {
    const stored = config.metadata[SETTINGS_KEY];
    const settings = stored && typeof stored === "object" && !Array.isArray(stored)
      ? stored as Partial<UserSettings>
      : {};
    config.backgrounds = normalizeBackgroundItems(items).map(cloneBackgroundItem);
    config.metadata[SETTINGS_KEY] = {
      ...settings,
      background: setting,
    };
  });
}
