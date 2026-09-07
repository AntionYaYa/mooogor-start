import type { Engine, EngineCategoryItem, WebSite, WebSiteFolder } from "./database";
import {
  PRESET_BACKGROUNDS,
  cloneBackgroundItem,
  type BackgroundItem,
} from "@/lib/background/background";
import { browser } from "wxt/browser";
import {
  clearLocalStorageWriteFailure,
  reportLocalStorageWriteFailure,
} from "@/lib/storage/localStorageHealth";

export const CONFIG_STORAGE_KEY = "mooogor.config.v1";
const CONFIG_STORAGE_KEYS = {
  websites: "mooogor.websites.v1",
  websiteFolders: "mooogor.website-folders.v1",
  engines: "mooogor.engines.v1",
  engineCategories: "mooogor.engine-categories.v1",
  backgrounds: "mooogor.backgrounds.v1",
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
  websiteFolders: WebSiteFolder[];
  engines: Engine[];
  engineCategories: EngineCategoryItem[];
  backgrounds: BackgroundItem[];
  metadata: Record<string, unknown>;
};

type ExtensionStorageArea = {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
};

let writeQueue = Promise.resolve();
let monitoredStorage: ExtensionStorageArea | null = null;

export function getExtensionStorage() {
  if (monitoredStorage) return monitoredStorage;
  const storage = browser.storage.local as ExtensionStorageArea;
  monitoredStorage = {
    get: (keys) => storage.get(keys),
    set: async (items) => {
      try {
        await storage.set(items);
        void clearLocalStorageWriteFailure();
      } catch (error) {
        await reportLocalStorageWriteFailure(error);
        throw error;
      }
    },
    remove: async (keys) => {
      try {
        await storage.remove(keys);
        void clearLocalStorageWriteFailure();
      } catch (error) {
        await reportLocalStorageWriteFailure(error);
        throw error;
      }
    },
  };
  return monitoredStorage;
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

export function isStoredConfig(value: unknown): value is StoredConfig {
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
    websiteFolders: Array.isArray(value[CONFIG_STORAGE_KEYS.websiteFolders])
      ? value[CONFIG_STORAGE_KEYS.websiteFolders] as WebSiteFolder[]
      : [],
    engines: value[CONFIG_STORAGE_KEYS.engines] as Engine[],
    engineCategories: value[CONFIG_STORAGE_KEYS.engineCategories] as EngineCategoryItem[],
    backgrounds: Array.isArray(value[CONFIG_STORAGE_KEYS.backgrounds])
      ? value[CONFIG_STORAGE_KEYS.backgrounds] as BackgroundItem[]
      : PRESET_BACKGROUNDS.map(cloneBackgroundItem),
    metadata: value[CONFIG_STORAGE_KEYS.metadata] as Record<string, unknown>,
  };
}

export function toStorageParts(config: StoredConfig): Record<string, unknown> {
  return {
    [CONFIG_STORAGE_KEYS.websites]: config.websites,
    [CONFIG_STORAGE_KEYS.websiteFolders]: config.websiteFolders ?? [],
    [CONFIG_STORAGE_KEYS.engines]: config.engines,
    [CONFIG_STORAGE_KEYS.engineCategories]: config.engineCategories,
    [CONFIG_STORAGE_KEYS.backgrounds]: config.backgrounds ??
      PRESET_BACKGROUNDS.map(cloneBackgroundItem),
    [CONFIG_STORAGE_KEYS.metadata]: config.metadata,
    [CONFIG_STORAGE_KEYS.migration]: config.migration,
  };
}

export async function readStoredConfig(): Promise<StoredConfig | null> {
  const value = await getExtensionStorage().get(Object.values(CONFIG_STORAGE_KEYS));
  return isConfigParts(value) ? toStoredConfig(value) : null;
}

export async function readStoredConfigMetadata(): Promise<Record<string, unknown> | null> {
  const value = await getExtensionStorage().get(CONFIG_STORAGE_KEYS.metadata);
  const metadata = value[CONFIG_STORAGE_KEYS.metadata];
  return isRecord(metadata) ? metadata : null;
}

export async function writeStoredConfig(config: StoredConfig): Promise<void> {
  await getExtensionStorage().set(toStorageParts(config));
}

export function stableStringify(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, nestedValue) => {
    if (!isRecord(nestedValue)) return nestedValue;
    return Object.fromEntries(
      Object.keys(nestedValue)
        .sort()
        .map((key) => [key, nestedValue[key]]),
    );
  });
}

export async function getStoredConfig(): Promise<StoredConfig> {
  const config = await readStoredConfig();
  if (config) return config;
  throw new Error("Configuration is not ready");
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
