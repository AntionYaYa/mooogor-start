import { db } from "./database";
import type { Engine, EngineCategoryItem, WebSite } from "./database";

export const CONFIG_STORAGE_KEY = "mooogor.config.v1";

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
  get(keys: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

function getExtensionStorage() {
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
    data.migration?.status === "completed" &&
    Array.isArray(data.websites) &&
    Array.isArray(data.engines) &&
    Array.isArray(data.engineCategories) &&
    !!data.metadata
  );
}

async function migrateFromDexie(): Promise<StoredConfig> {
  const storage = getExtensionStorage();
  const existing = (await storage.get(CONFIG_STORAGE_KEY))[
    CONFIG_STORAGE_KEY
  ];
  if (isStoredConfig(existing)) return existing;

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

  await storage.set({ [CONFIG_STORAGE_KEY]: data });
  const written = (await storage.get(CONFIG_STORAGE_KEY))[
    CONFIG_STORAGE_KEY
  ];
  if (
    !isStoredConfig(written) ||
    written.websites.length !== websites.length ||
    written.engines.length !== engines.length ||
    written.engineCategories.length !== engineCategories.length
  ) {
    throw new Error("Configuration migration validation failed");
  }
  return written;
}

async function ensureMigration(): Promise<void> {
  migrationPromise ??= migrateFromDexie().then(() => undefined);
  await migrationPromise;
}

export async function getStoredConfig(): Promise<StoredConfig> {
  await ensureMigration();
  const config = (await getExtensionStorage().get(CONFIG_STORAGE_KEY))[
    CONFIG_STORAGE_KEY
  ];

  if (isStoredConfig(config)) return config;

  // 存储被外部清除或写入了无效值时，重新执行迁移，而不是继续使用旧快照。
  migrationPromise = null;
  await ensureMigration();
  return await getStoredConfig();
}

export async function updateStoredConfig<T>(
  mutate: (config: StoredConfig) => T | Promise<T>,
): Promise<T> {
  const task = writeQueue.then(async () => {
    const current = await getStoredConfig();
    const next: StoredConfig = structuredClone(current);
    const result = await mutate(next);
    await getExtensionStorage().set({ [CONFIG_STORAGE_KEY]: next });
    return result;
  });
  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return await task;
}
