import { db } from "./database";
import type { Engine, EngineCategoryItem, WebSite } from "./database";
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

function logMigration(step: string, details?: Record<string, unknown>) {
  if (details) {
    console.info(MIGRATION_LOG_PREFIX, step, details);
  } else {
    console.info(MIGRATION_LOG_PREFIX, step);
  }
}

function createConfig(
  source: StoredConfig["migration"]["source"],
  data: Pick<StoredConfig, "websites" | "engines" | "engineCategories" | "metadata">,
): StoredConfig {
  return {
    schemaVersion: 1,
    migration: { status: "completed", source, completedAt: Date.now() },
    ...data,
  };
}

async function validateStoredConfig(expected: StoredConfig): Promise<StoredConfig> {
  logMigration("validation:start", { source: expected.migration.source });
  const written = await readStoredConfig();
  if (!written) throw new Error("Configuration migration validation failed");
  for (const key of ["websites", "engines", "engineCategories", "metadata"] as const) {
    if (stableStringify(written[key]) !== stableStringify(expected[key])) {
      throw new Error(`Configuration migration validation failed: ${key}`);
    }
  }
  logMigration("validation:success");
  return written;
}

async function removeLegacySources() {
  logMigration("legacy-cleanup:start");
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
  logMigration("legacy-cleanup:success");
}

async function migrateStoredConfig(): Promise<void> {
  logMigration("check:start");
  const existingConfig = await readStoredConfig();
  if (existingConfig) {
    logMigration("check:already-completed", {
      source: existingConfig.migration.source,
      completedAt: existingConfig.migration.completedAt,
    });
    return;
  }

  const storage = getExtensionStorage();
  const legacyConfig = (await storage.get(CONFIG_STORAGE_KEY))[CONFIG_STORAGE_KEY];
  if (isStoredConfig(legacyConfig)) {
    logMigration("legacy-storage-config:found");
    await writeStoredConfig(legacyConfig);
    await validateStoredConfig(legacyConfig);
    await removeLegacySources();
    logMigration("complete", { source: legacyConfig.migration.source });
    return;
  }

  logMigration("dexie:read:start");
  const [websites, engines, engineCategories, settings] = await Promise.all([
    db.webSites.toArray(),
    db.engines.toArray(),
    db.engineCategories.toArray(),
    db.settings.toArray(),
  ]);
  const hasDexieData =
    websites.length || engines.length || engineCategories.length || settings.length;
  logMigration("dexie:read:success", {
    websites: websites.length,
    engines: engines.length,
    engineCategories: engineCategories.length,
    settings: settings.length,
    hasLegacyData: Boolean(hasDexieData),
  });
  const config = createConfig(hasDexieData ? "dexie-v2" : "fresh", {
    websites,
    engines,
    engineCategories,
    metadata: Object.fromEntries(settings.map((row) => [row.key, row.value])),
  });
  logMigration("storage-write:start", { source: config.migration.source });
  await writeStoredConfig(config);
  logMigration("storage-write:success");
  await validateStoredConfig(config);
  if (hasDexieData) await removeLegacySources();
  logMigration("complete", { source: config.migration.source });
}

export async function initializeStoredConfig(): Promise<void> {
  if (migrationPromise) {
    logMigration("request:reuse-running-promise");
  } else {
    logMigration("request:start");
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
  logMigration("fresh-install:start");
  const existingConfig = await readStoredConfig();
  if (existingConfig) {
    logMigration("fresh-install:already-initialized", {
      source: existingConfig.migration.source,
      completedAt: existingConfig.migration.completedAt,
    });
    return;
  }
  const storage = getExtensionStorage();
  const legacyConfig = (await storage.get(CONFIG_STORAGE_KEY))[CONFIG_STORAGE_KEY];
  if (isStoredConfig(legacyConfig)) {
    logMigration("fresh-install:legacy-storage-config-found");
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
  logMigration("fresh-install:complete", { source: "fresh" });
}
