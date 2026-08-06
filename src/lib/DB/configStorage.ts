import type { Engine, EngineCategoryItem, WebSite } from "./database";
import { browser } from "wxt/browser";

const CONFIG_STORAGE_KEYS = {
  websites: "mooogor.websites.v1",
  engines: "mooogor.engines.v1",
  engineCategories: "mooogor.engine-categories.v1",
  metadata: "mooogor.metadata.v1",
} as const;

export type StoredConfig = {
  schemaVersion: 1;
  websites: WebSite[];
  engines: Engine[];
  engineCategories: EngineCategoryItem[];
  metadata: Record<string, unknown>;
};

type ExtensionStorageArea = {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

let writeQueue = Promise.resolve();
let initializationPromise: Promise<void> | null = null;

export function getExtensionStorage() {
  return browser.storage.local as ExtensionStorageArea;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isStoredConfig(value: unknown): value is StoredConfig {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<StoredConfig>;
  return (
    data.schemaVersion === 1 &&
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
    isRecord(value[CONFIG_STORAGE_KEYS.metadata])
  );
}

function toStoredConfig(value: Record<string, unknown>): StoredConfig {
  return {
    schemaVersion: 1,
    websites: value[CONFIG_STORAGE_KEYS.websites] as WebSite[],
    engines: value[CONFIG_STORAGE_KEYS.engines] as Engine[],
    engineCategories: value[CONFIG_STORAGE_KEYS.engineCategories] as EngineCategoryItem[],
    metadata: value[CONFIG_STORAGE_KEYS.metadata] as Record<string, unknown>,
  };
}

export function toStorageParts(config: StoredConfig): Record<string, unknown> {
  return {
    [CONFIG_STORAGE_KEYS.websites]: config.websites,
    [CONFIG_STORAGE_KEYS.engines]: config.engines,
    [CONFIG_STORAGE_KEYS.engineCategories]: config.engineCategories,
    [CONFIG_STORAGE_KEYS.metadata]: config.metadata,
  };
}

export async function readStoredConfig(): Promise<StoredConfig | null> {
  const value = await getExtensionStorage().get(Object.values(CONFIG_STORAGE_KEYS));
  return isConfigParts(value) ? toStoredConfig(value) : null;
}

export async function writeStoredConfig(config: StoredConfig): Promise<void> {
  await getExtensionStorage().set(toStorageParts(config));
}

export async function initializeStoredConfig(): Promise<void> {
  initializationPromise ??= (async () => {
    if (await readStoredConfig()) return;
    await writeStoredConfig({
      schemaVersion: 1,
      websites: [],
      engines: [],
      engineCategories: [],
      metadata: {},
    });
    if (!(await readStoredConfig())) {
      throw new Error("Failed to initialize extension configuration");
    }
  })().catch((error) => {
    initializationPromise = null;
    throw error;
  });
  await initializationPromise;
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
