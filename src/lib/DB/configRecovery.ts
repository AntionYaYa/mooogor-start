import { createDefaultSearchConfig } from "./defaultSearchConfig";
import { buildDefaultWebSites } from "@/lib/config/defaultWebSites";
import { buildDefaultEngineCategories } from "@/lib/config/engineCategories";
import { buildDefaultEngines } from "@/lib/DB/defaultEnginesFactory";
import { readStoredConfig, writeStoredConfig, type StoredConfig } from "./configStorage";
import { DEFAULT_SETTINGS, type AppLanguage } from "@/lib/utils/settings";
import { getEffectiveLanguage } from "@/lib/utils/i18n";
import {
  PRESET_BACKGROUNDS,
  cloneBackgroundItem,
} from "@/lib/background/background";
import { clearWebSiteScreenshots } from "./websiteScreenshots";

export async function resetConfigurationToDefaults(
  language: AppLanguage = "auto",
): Promise<void> {
  await clearWebSiteScreenshots();
  const now = Date.now();
  const effectiveLanguage = getEffectiveLanguage(language);
  const websites = buildDefaultWebSites(effectiveLanguage).map((site, index) => ({
    ...site,
    id: index + 1,
    order: index,
    createAt: now,
    updateAt: now,
  }));
  const previous = await readStoredConfig();
  const { engines, engineCategories } = createDefaultSearchConfig(
    buildDefaultEngineCategories(), buildDefaultEngines(language), previous?.engines,
  );
  const config: StoredConfig = {
    schemaVersion: 1,
    migration: {
      status: "completed",
      source: "fresh",
      completedAt: now,
    },
    websites,
    websiteFolders: [],
    engines,
    engineCategories,
    backgrounds: PRESET_BACKGROUNDS.map(cloneBackgroundItem),
    metadata: {
      settings: { ...DEFAULT_SETTINGS, language },
    },
  };

  await writeStoredConfig(config);
  if (!(await readStoredConfig())) {
    throw new Error("Full configuration reset validation failed");
  }
}
