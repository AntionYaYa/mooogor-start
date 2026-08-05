import { db } from "./database";
import type { Engine, EngineCategoryItem, WebSite } from "./database";

export const CONFIG_STORAGE_KEY = "mooogor.config.v1";
const CONFIG_STORAGE_KEYS = {
  websites: "mooogor.websites.v1",
  engines: "mooogor.engines.v1",
  engineCategories: "mooogor.engine-categories.v1",
  metadata: "mooogor.metadata.v1",
  migration: "mooogor.config-migration.v1",
} as const;

export type StoredConfig = {
  schemaVersion: 1;
  migration: {
    status: "completed";
    source: "dexie-v2" | "fresh";
    completedAt: number;
  };
  websites: WebSite[];
  engines: Engine[];
  engineCategories: EngineCategoryItem[];
  metadata: Record<string, unknown>;
};

let migrationPromise: Promise<void> | null = null;
let writeQueue = Promise.resolve();

type ExtensionStorageArea = {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
};

export function getExtensionStorage() {
  const extensionGlobal = globalThis as typeof globalThis & {
    browser?: { storage?: { local?: ExtensionStorageArea } };
    chrome?: { storage?: { local?: ExtensionStorageArea } };
  };
  const storage =
    extensionGlobal.browser?.storage?.local ??
    extensionGlobal.chrome?.storage?.local;
  if (!storage) {
    throw new Error("Extension storage API is unavailable");
  }
  return storage;
}

function isStoredConfig(value: unknown): value is StoredConfig {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<StoredConfig>;
  return (
    data.schemaVersion === 1 &&
    isMigration(data.migration) &&
    Array.isArray(data.websites) &&
    Array.isArray(data.engines) &&
    Array.isArray(data.engineCategories) &&
    isRecord(data.metadata)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isMigration(value: unknown): value is StoredConfig["migration"] {
  if (!value || typeof value !== "object") return false;
  const migration = value as Partial<StoredConfig["migration"]>;
  return (
    migration.status === "completed" &&
    (migration.source === "dexie-v2" || migration.source === "fresh") &&
    typeof migration.completedAt === "number"
  );
}

function isConfigParts(value: Record<string, unknown>) {
  return (
    Array.isArray(value[CONFIG_STORAGE_KEYS.websites]) &&
    Array.isArray(value[CONFIG_STORAGE_KEYS.engines]) &&
    Array.isArray(value[CONFIG_STORAGE_KEYS.engineCategories]) &&
    isRecord(value[CONFIG_STORAGE_KEYS.metadata]) &&
    isMigration(value[CONFIG_STORAGE_KEYS.migration])
  );
}

function toStoredConfig(value: Record<string, unknown>): StoredConfig {
  return {
    schemaVersion: 1,
    migration: value[CONFIG_STORAGE_KEYS.migration] as StoredConfig["migration"],
    websites: value[CONFIG_STORAGE_KEYS.websites] as WebSite[],
    engines: value[CONFIG_STORAGE_KEYS.engines] as Engine[],
    engineCategories: value[CONFIG_STORAGE_KEYS.engineCategories] as EngineCategoryItem[],
    metadata: value[CONFIG_STORAGE_KEYS.metadata] as Record<string, unknown>,
  };
}

function toStorageParts(config: StoredConfig): Record<string, unknown> {
  return {
    [CONFIG_STORAGE_KEYS.websites]: config.websites,
    [CONFIG_STORAGE_KEYS.engines]: config.engines,
    [CONFIG_STORAGE_KEYS.engineCategories]: config.engineCategories,
    [CONFIG_STORAGE_KEYS.metadata]: config.metadata,
    [CONFIG_STORAGE_KEYS.migration]: config.migration,
  };
}

async function readConfigParts(): Promise<StoredConfig | null> {
  const value = await getExtensionStorage().get(Object.values(CONFIG_STORAGE_KEYS));
  return isConfigParts(value) ? toStoredConfig(value) : null;
}

function stableStringify(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, nestedValue) => {
    if (!isRecord(nestedValue)) return nestedValue;
    return Object.fromEntries(
      Object.keys(nestedValue)
        .sort()
        .map((key) => [key, nestedValue[key]]),
    );
  });
}

function validateMigratedConfig(
  written: StoredConfig | null,
  expected: Pick<StoredConfig, "websites" | "engines" | "engineCategories" | "metadata">,
): asserts written is StoredConfig {
  if (!written) {
    throw new Error("Configuration migration validation failed: invalid stored structure");
  }

  const mismatchedParts = (
    ["websites", "engines", "engineCategories", "metadata"] as const
  ).filter((key) => stableStringify(written[key]) !== stableStringify(expected[key]));
  if (mismatchedParts.length) {
    throw new Error(
      `Configuration migration validation failed: ${mismatchedParts.join(", ")}`,
    );
  }
}

async function migrateFromDexie(): Promise<StoredConfig> {
  const storage = getExtensionStorage();
  const splitConfig = await readConfigParts();
  if (splitConfig) {
    // 拆分存储已经可用后移除旧快照，避免部分数据异常时回滚到过期配置。
    await storage.remove(CONFIG_STORAGE_KEY);
    return splitConfig;
  }

  const legacyConfig = (await storage.get(CONFIG_STORAGE_KEY))[CONFIG_STORAGE_KEY];
  if (isStoredConfig(legacyConfig)) {
    await storage.set(toStorageParts(legacyConfig));
    const written = await readConfigParts();
    validateMigratedConfig(written, legacyConfig);
    await storage.remove(CONFIG_STORAGE_KEY);
    return written;
  }

  const [websites, engines, engineCategories, settings] = await Promise.all([
    db.webSites.toArray(),
    db.engines.toArray(),
    db.engineCategories.toArray(),
    db.settings.toArray(),
  ]);
  const source: StoredConfig["migration"]["source"] =
    websites.length || engines.length || engineCategories.length || settings.length
      ? "dexie-v2"
      : "fresh";
  const data: StoredConfig = {
    schemaVersion: 1,
    migration: { status: "completed", source, completedAt: Date.now() },
    websites,
    engines,
    engineCategories,
    metadata: Object.fromEntries(settings.map((row) => [row.key, row.value])),
  };

  await storage.set(toStorageParts(data));
  const written = await readConfigParts();
  validateMigratedConfig(written, data);
  return written;
}

async function ensureMigration(): Promise<void> {
  migrationPromise ??= migrateFromDexie().then(() => undefined);
  try {
    await migrationPromise;
  } catch (error) {
    // 存储或 IndexedDB 的瞬时错误不应让当前页面永久缓存失败状态。
    migrationPromise = null;
    throw error;
  }
}

export async function getStoredConfig(): Promise<StoredConfig> {
  await ensureMigration();
  const config = await readConfigParts();

  if (config) return config;

  // 存储被外部清除或写入了无效值时，重新执行迁移，而不是继续使用旧快照。
  migrationPromise = null;
  await ensureMigration();
  const recovered = await readConfigParts();
  if (!recovered) {
    throw new Error("Configuration migration completed without valid stored data");
  }
  return recovered;
}

export async function updateStoredConfig<T>(
  mutate: (config: StoredConfig) => T | Promise<T>,
): Promise<T> {
  const task = writeQueue.then(async () => {
    const current = await getStoredConfig();
    const next: StoredConfig = structuredClone(current);
    const result = await mutate(next);
    const changed: Record<string, unknown> = {};
    const currentParts = toStorageParts(current);
    const nextParts = toStorageParts(next);
    for (const [key, value] of Object.entries(nextParts)) {
      if (stableStringify(value) !== stableStringify(currentParts[key])) {
        changed[key] = value;
      }
    }
    if (Object.keys(changed).length) {
      await getExtensionStorage().set(changed);
    }
    return result;
  });
  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return await task;
}
