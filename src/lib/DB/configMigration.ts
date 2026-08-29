import { db } from "./database";
import type { Engine, EngineCategoryItem, WebSite } from "./database";
import {
  PRESET_BACKGROUNDS,
  cloneBackgroundItem,
} from "@/lib/background/background";
import {
  CONFIG_STORAGE_KEY,
  getExtensionStorage,
  isStoredConfig,
  readStoredConfig,
  stableStringify,
  type StoredConfig,
  writeStoredConfig,
} from "./configStorage";

let migrationPromise: Promise<void> | null = null;
const MIGRATION_LOG_PREFIX = "[Mooogor Config Migration]";

function createConfig(
  source: StoredConfig["migration"]["source"],
  data: Pick<StoredConfig, "websites" | "engines" | "engineCategories" | "metadata">,
): StoredConfig {
  return {
    schemaVersion: 1,
    migration: { status: "completed", source, completedAt: Date.now() },
    backgrounds: PRESET_BACKGROUNDS.map(cloneBackgroundItem),
    ...data,
  };
}

async function validateStoredConfig(expected: StoredConfig): Promise<StoredConfig> {
  const written = await readStoredConfig();
  if (!written) throw new Error("Configuration migration validation failed");
  for (const key of [
    "websites",
    "engines",
    "engineCategories",
    "backgrounds",
    "metadata",
  ] as const) {
    const expectedValue = key === "backgrounds"
      ? expected.backgrounds ?? PRESET_BACKGROUNDS
      : expected[key];
    if (stableStringify(written[key]) !== stableStringify(expectedValue)) {
      throw new Error(`Configuration migration validation failed: ${key}`);
    }
  }
  return written;
}

async function removeLegacySources() {
  await db.transaction(
    "rw",
    db.webSites,
    db.engines,
    db.engineCategories,
    db.settings,
    async () => {
      await Promise.all([
        db.webSites.clear(),
        db.engines.clear(),
        db.engineCategories.clear(),
        db.settings.clear(),
      ]);
    },
  );
  await getExtensionStorage().remove(CONFIG_STORAGE_KEY);
}

async function migrateStoredConfig(): Promise<void> {
  const existingConfig = await readStoredConfig();
  if (existingConfig) {
    return;
  }

  const storage = getExtensionStorage();
  const legacyConfig = (await storage.get(CONFIG_STORAGE_KEY))[CONFIG_STORAGE_KEY];
  if (isStoredConfig(legacyConfig)) {
    await writeStoredConfig(legacyConfig);
    await validateStoredConfig(legacyConfig);
    await removeLegacySources();
    return;
  }

  const [websites, engines, engineCategories, settings] = await Promise.all([
    db.webSites.toArray(),
    db.engines.toArray(),
    db.engineCategories.toArray(),
    db.settings.toArray(),
  ]);
  const hasDexieData =
    websites.length || engines.length || engineCategories.length || settings.length;
  const config = createConfig(hasDexieData ? "dexie-v2" : "fresh", {
    websites,
    engines,
    engineCategories,
    metadata: Object.fromEntries(settings.map((row) => [row.key, row.value])),
  });
  await writeStoredConfig(config);
  await validateStoredConfig(config);
  if (hasDexieData) await removeLegacySources();
}

export async function initializeStoredConfig(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = migrateStoredConfig();
  }
  try {
    await migrationPromise;
  } catch (error) {
    console.error(MIGRATION_LOG_PREFIX, "failed", error);
    migrationPromise = null;
    throw error;
  }
}

export async function initializeFreshStoredConfig(): Promise<void> {
  const existingConfig = await readStoredConfig();
  if (existingConfig) {
    return;
  }
  const storage = getExtensionStorage();
  const legacyConfig = (await storage.get(CONFIG_STORAGE_KEY))[CONFIG_STORAGE_KEY];
  if (isStoredConfig(legacyConfig)) {
    await initializeStoredConfig();
    return;
  }
  const fresh = createConfig("fresh", {
    websites: [] as WebSite[],
    engines: [] as Engine[],
    engineCategories: [] as EngineCategoryItem[],
    metadata: {},
  });
  await writeStoredConfig(fresh);
  await validateStoredConfig(fresh);
}
