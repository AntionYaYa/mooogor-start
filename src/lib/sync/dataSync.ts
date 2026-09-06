import type { Engine, EngineCategoryItem, WebSite } from "@/lib/DB/database";
import {
  normalizeBackgroundItems,
  type BackgroundItem,
} from "@/lib/background/background";
import {
  getExtensionStorage,
  readStoredConfig,
  updateStoredConfig,
} from "@/lib/DB/configStorage";
import type {
  BackgroundSettings,
  UserSettings,
} from "@/lib/utils/settings";
import { browser } from "wxt/browser";

const ENABLED_KEY = "mooogor.data-sync-enabled.v1";
const MANIFEST_KEY = "mooogor.data-sync-manifest.v1";
const CHUNK_KEY_PREFIX = "mooogor.data-sync-chunk.v1.";
export const DATA_SYNC_RUNTIME_KEY = "mooogor.data-sync-runtime.v1";
const SETTINGS_KEY = "settings";
const CHUNK_BYTE_LIMIT = 5_500;
const SYNCED_LOCAL_KEYS = new Set([
  "mooogor.websites.v1",
  "mooogor.engines.v1",
  "mooogor.engine-categories.v1",
  "mooogor.backgrounds.v1",
  "mooogor.metadata.v1",
]);

type SyncStorageArea = {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  getBytesInUse(keys?: string | string[] | null): Promise<number>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  readonly QUOTA_BYTES?: number;
};

type SyncedSettings = Pick<
  UserSettings,
  | "defaultOpen"
  | "newTabOpen"
  | "searchBookmarks"
  | "searchHistory"
  | "recordSearchKeywords"
  | "rememberSearchEngineCategory"
  | "autoFocusSearch"
  | "injectRelatedSearch"
  | "language"
  | "theme"
  | "background"
>;

type SyncedData = {
  schemaVersion: 1;
  websites: WebSite[];
  engines: Engine[];
  engineCategories: EngineCategoryItem[];
  backgrounds?: BackgroundItem[];
  settings: Partial<SyncedSettings>;
};

type SyncManifest = {
  schemaVersion: 1;
  chunkCount: number;
  contentHash: string;
  updatedAt: number;
};

type SyncActivation = {
  enabled: boolean;
  contentHash?: string;
  updatedAt: number;
};

type DataSyncRuntimeState = {
  phase: "idle" | "pending" | "error";
  errorCode?: "quota" | "rate" | "unknown";
  lastAttemptAt?: number;
  lastSuccessfulWriteAt?: number;
};

export type DataSyncState = {
  enabled: boolean;
  lastSyncedAt: number | null;
  phase: DataSyncRuntimeState["phase"];
  errorCode: DataSyncRuntimeState["errorCode"] | null;
  usedBytes: number;
  quotaBytes: number;
  localUsedBytes: number;
  localQuotaBytes: number;
};

let syncQueue = Promise.resolve();
let lastAppliedHash = "";
let readyForLocalUploads = false;
let initializationPromise: Promise<boolean> | null = null;

function getSyncStorage() {
  return browser.storage.sync as SyncStorageArea;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isManifest(value: unknown): value is SyncManifest {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === 1 &&
    typeof value.chunkCount === "number" &&
    Number.isInteger(value.chunkCount) &&
    value.chunkCount >= 0 &&
    typeof value.contentHash === "string" &&
    typeof value.updatedAt === "number"
  );
}

function normalizeActivation(value: unknown): SyncActivation {
  if (value === undefined) return { enabled: true, updatedAt: 0 };
  if (value === true) return { enabled: true, updatedAt: 0 };
  if (!isRecord(value)) return { enabled: false, updatedAt: 0 };
  return {
    enabled: value.enabled === true,
    contentHash:
      typeof value.contentHash === "string" ? value.contentHash : undefined,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
  };
}

function normalizeRuntimeState(value: unknown): DataSyncRuntimeState {
  if (!isRecord(value)) return { phase: "idle" };
  const phase = ["idle", "pending", "error"].includes(String(value.phase))
    ? value.phase as DataSyncRuntimeState["phase"]
    : "idle";
  const errorCode = ["quota", "rate", "unknown"].includes(String(value.errorCode))
    ? value.errorCode as DataSyncRuntimeState["errorCode"]
    : undefined;
  return {
    phase,
    errorCode,
    lastAttemptAt:
      typeof value.lastAttemptAt === "number" ? value.lastAttemptAt : undefined,
    lastSuccessfulWriteAt:
      typeof value.lastSuccessfulWriteAt === "number"
        ? value.lastSuccessfulWriteAt
        : undefined,
  };
}

async function readActivation() {
  return normalizeActivation(
    (await getSyncStorage().get(ENABLED_KEY))[ENABLED_KEY],
  );
}

async function readRuntimeState() {
  return normalizeRuntimeState(
    (await browser.storage.local.get(DATA_SYNC_RUNTIME_KEY))[DATA_SYNC_RUNTIME_KEY],
  );
}

async function writeRuntimeState(state: DataSyncRuntimeState) {
  await getExtensionStorage().set({ [DATA_SYNC_RUNTIME_KEY]: state });
}

function classifySyncError(error: unknown): DataSyncRuntimeState["errorCode"] {
  const message = error instanceof Error ? error.message : String(error);
  if (/quota|max_items|bytes_per_item/i.test(message)) return "quota";
  if (/max_write|rate|thrott/i.test(message)) return "rate";
  return "unknown";
}

function isSyncedData(value: unknown): value is SyncedData {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === 1 &&
    Array.isArray(value.websites) &&
    Array.isArray(value.engines) &&
    Array.isArray(value.engineCategories) &&
    (value.backgrounds === undefined || Array.isArray(value.backgrounds)) &&
    isRecord(value.settings)
  );
}

function selectSyncedSettings(value: unknown): Partial<SyncedSettings> {
  if (!isRecord(value)) return {};
  const settings: Partial<SyncedSettings> = {};
  if (["common", "bookmark", "history", "last"].includes(String(value.defaultOpen))) {
    settings.defaultOpen = value.defaultOpen as SyncedSettings["defaultOpen"];
  }
  const booleanKeys: (keyof Pick<
    SyncedSettings,
    | "newTabOpen"
    | "searchBookmarks"
    | "searchHistory"
    | "recordSearchKeywords"
    | "rememberSearchEngineCategory"
    | "autoFocusSearch"
    | "injectRelatedSearch"
  >)[] = [
    "newTabOpen",
    "searchBookmarks",
    "searchHistory",
    "recordSearchKeywords",
    "rememberSearchEngineCategory",
    "autoFocusSearch",
    "injectRelatedSearch",
  ];
  for (const key of booleanKeys) {
    if (typeof value[key] === "boolean") settings[key] = value[key];
  }
  if (["auto", "zh_CN", "zh_TW", "en"].includes(String(value.language))) {
    settings.language = value.language as SyncedSettings["language"];
  }
  if (["default", "ocean", "sunset", "purple", "yellow", "random"].includes(String(value.theme))) {
    settings.theme = value.theme as SyncedSettings["theme"];
  }
  if (isRecord(value.background)) {
    const id = typeof value.background.id === "string" && value.background.id
      ? value.background.id
      : null;
    settings.background = {
      enabled: value.background.enabled === true && id !== null,
      id,
    } satisfies BackgroundSettings;
  }
  return settings;
}

function buildSyncedData(config: NonNullable<Awaited<ReturnType<typeof readStoredConfig>>>): SyncedData {
  return {
    schemaVersion: 1,
    websites: config.websites,
    engines: config.engines,
    engineCategories: config.engineCategories,
    backgrounds: normalizeBackgroundItems(config.backgrounds),
    settings: selectSyncedSettings(config.metadata[SETTINGS_KEY]),
  };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function splitUtf8(value: string) {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let chunk = "";
  let chunkBytes = 0;
  for (const character of value) {
    const bytes = encoder.encode(character).length;
    if (chunk && chunkBytes + bytes > CHUNK_BYTE_LIMIT) {
      chunks.push(toBase64(chunk));
      chunk = "";
      chunkBytes = 0;
    }
    chunk += character;
    chunkBytes += bytes;
  }
  if (chunk || !chunks.length) chunks.push(toBase64(chunk));
  return chunks;
}

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function chunkKey(contentHash: string, index: number) {
  return `${CHUNK_KEY_PREFIX}${contentHash}.${index}`;
}

async function readManifest() {
  const value = (await getSyncStorage().get(MANIFEST_KEY))[MANIFEST_KEY];
  return isManifest(value) ? value : null;
}

async function readRemoteData(
  knownManifest?: SyncManifest,
): Promise<{ data: SyncedData; manifest: SyncManifest } | null> {
  const storage = getSyncStorage();
  const manifest = knownManifest ?? await readManifest();
  if (!manifest || manifest.chunkCount === 0) return null;
  const keys = Array.from(
    { length: manifest.chunkCount },
    (_, index) => chunkKey(manifest.contentHash, index),
  );
  const values = await storage.get(keys);
  if (keys.some((key) => typeof values[key] !== "string")) return null;
  let serialized = "";
  try {
    serialized = keys
      .map((key) => fromBase64(values[key] as string))
      .join("");
  } catch {
    return null;
  }
  if (hashString(serialized) !== manifest.contentHash) return null;
  try {
    const parsed = JSON.parse(serialized);
    return isSyncedData(parsed) ? { data: parsed, manifest } : null;
  } catch {
    return null;
  }
}

async function writeRemoteData(data: SyncedData) {
  const attemptAt = Date.now();
  const storage = getSyncStorage();
  const serialized = JSON.stringify(data);
  const contentHash = hashString(serialized);
  const current = await readManifest();
  const currentIsComplete = current?.contentHash === contentHash
    ? await readRemoteData(current)
    : null;
  if (currentIsComplete) {
    lastAppliedHash = contentHash;
    const runtime = await readRuntimeState();
    if (runtime.phase !== "idle") {
      await writeRuntimeState({
        phase: "idle",
        lastAttemptAt: attemptAt,
        lastSuccessfulWriteAt: currentIsComplete.manifest.updatedAt,
      });
    }
    return currentIsComplete.manifest;
  }

  await writeRuntimeState({ phase: "pending", lastAttemptAt: attemptAt });
  try {
    const chunks = splitUtf8(serialized);
    const values = Object.fromEntries(
      chunks.map((chunk, index) => [chunkKey(contentHash, index), chunk]),
    );
    await storage.set(values);
    const manifest: SyncManifest = {
      schemaVersion: 1,
      chunkCount: chunks.length,
      contentHash,
      updatedAt: Date.now(),
    };
    await storage.set({ [MANIFEST_KEY]: manifest });
    if (current && current.contentHash !== contentHash) {
      await storage.remove(
        Array.from(
          { length: current.chunkCount },
          (_, index) => chunkKey(current.contentHash, index),
        ),
      );
    }
    lastAppliedHash = contentHash;
    await writeRuntimeState({
      phase: "idle",
      lastAttemptAt: attemptAt,
      lastSuccessfulWriteAt: manifest.updatedAt,
    });
    return manifest;
  } catch (error) {
    await writeRuntimeState({
      phase: "error",
      errorCode: classifySyncError(error),
      lastAttemptAt: attemptAt,
    });
    throw error;
  }
}

async function applyRemoteData(remote: Awaited<ReturnType<typeof readRemoteData>>) {
  if (!remote || remote.manifest.contentHash === lastAppliedHash) return false;
  const changed = await updateStoredConfig((local) => {
    if (hashString(JSON.stringify(buildSyncedData(local))) === remote.manifest.contentHash) {
      return false;
    }
    const localSettings = isRecord(local.metadata[SETTINGS_KEY])
      ? local.metadata[SETTINGS_KEY]
      : {};
    local.websites = remote.data.websites;
    local.engines = remote.data.engines;
    local.engineCategories = remote.data.engineCategories;
    if (remote.data.backgrounds) {
      local.backgrounds = normalizeBackgroundItems(remote.data.backgrounds);
    }
    local.metadata[SETTINGS_KEY] = {
      ...localSettings,
      ...selectSyncedSettings(remote.data.settings),
    };
    return true;
  });
  lastAppliedHash = remote.manifest.contentHash;
  return changed;
}

export async function getDataSyncState(): Promise<DataSyncState> {
  const storage = getSyncStorage();
  const localStorage = browser.storage.local as SyncStorageArea;
  const [activation, manifest, runtime, usedBytes, localUsedBytes] = await Promise.all([
    readActivation(),
    readManifest(),
    readRuntimeState(),
    storage.getBytesInUse(null),
    localStorage.getBytesInUse(null),
  ]);
  return {
    enabled: activation.enabled,
    lastSyncedAt:
      manifest && (!activation.contentHash || activation.contentHash === manifest.contentHash)
        ? manifest.updatedAt
        : null,
    phase: runtime.phase,
    errorCode: runtime.errorCode ?? null,
    usedBytes,
    quotaBytes: storage.QUOTA_BYTES ?? 102_400,
    localUsedBytes,
    localQuotaBytes: localStorage.QUOTA_BYTES ?? 10_485_760,
  };
}

export async function setDataSyncEnabled(enabled: boolean) {
  const storage = getSyncStorage();
  if (!enabled) {
    const manifest = await readManifest();
    await storage.set({
      [ENABLED_KEY]: {
        enabled: false,
        contentHash: manifest?.contentHash,
        updatedAt: Date.now(),
      } satisfies SyncActivation,
    });
    await writeRuntimeState({ phase: "idle" });
    return getDataSyncState();
  }
  const config = await readStoredConfig();
  if (!config) throw new Error("Configuration is not ready");
  const manifest = await writeRemoteData(buildSyncedData(config));
  await storage.set({
    [ENABLED_KEY]: {
      enabled: true,
      contentHash: manifest.contentHash,
      updatedAt: Date.now(),
    } satisfies SyncActivation,
  });
  return getDataSyncState();
}

export async function retryDataSync() {
  const activation = await readActivation();
  if (!activation.enabled) return getDataSyncState();
  const config = await readStoredConfig();
  if (!config) throw new Error("Configuration is not ready");
  const manifest = await writeRemoteData(buildSyncedData(config));
  const latestActivation = await readActivation();
  if (
    latestActivation.enabled &&
    latestActivation.contentHash !== manifest.contentHash
  ) {
    await getSyncStorage().set({
      [ENABLED_KEY]: {
        enabled: true,
        contentHash: manifest.contentHash,
        updatedAt: Date.now(),
      } satisfies SyncActivation,
    });
  }
  return getDataSyncState();
}

export function queueDataSyncFromLocal() {
  const task = syncQueue.then(async () => {
    if (!readyForLocalUploads) return;
    const activation = await readActivation();
    if (!activation.enabled) return;
    const currentManifest = await readManifest();
    if (
      activation.contentHash &&
      currentManifest?.contentHash !== activation.contentHash
    ) return;
    const config = await readStoredConfig();
    if (!config) return;
    const manifest = await writeRemoteData(buildSyncedData(config));
    const latestActivation = await readActivation();
    if (
      !latestActivation.enabled ||
      latestActivation.contentHash === manifest.contentHash
    ) return;
    await getSyncStorage().set({
      [ENABLED_KEY]: {
        enabled: true,
        contentHash: manifest.contentHash,
        updatedAt: Date.now(),
      } satisfies SyncActivation,
    });
  });
  syncQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export async function initializeDataSync() {
  if (initializationPromise) return initializationPromise;
  initializationPromise = (async () => {
    const activation = await readActivation();
    if (!activation.enabled) return false;
    const manifest = await readManifest();
    if (
      activation.contentHash &&
      (!manifest || manifest.contentHash !== activation.contentHash)
    ) {
      await writeRuntimeState({ phase: "pending" });
      return false;
    }
    if (manifest) {
      const remote = await readRemoteData(manifest);
      if (!remote) {
        await writeRuntimeState({ phase: "pending" });
        return false;
      }
      const changed = await applyRemoteData(remote);
      let lastSuccessfulWriteAt = manifest.updatedAt;
      if (remote.data.backgrounds === undefined) {
        const config = await readStoredConfig();
        if (config) {
          const published = await writeRemoteData(buildSyncedData(config));
          lastSuccessfulWriteAt = published.updatedAt;
          await getSyncStorage().set({
            [ENABLED_KEY]: {
              enabled: true,
              contentHash: published.contentHash,
              updatedAt: Date.now(),
            } satisfies SyncActivation,
          });
        }
      }
      await writeRuntimeState({
        phase: "idle",
        lastSuccessfulWriteAt,
      });
      return changed;
    }
    const config = await readStoredConfig();
    if (!config) return false;
    const published = await writeRemoteData(buildSyncedData(config));
    await getSyncStorage().set({
      [ENABLED_KEY]: {
        enabled: true,
        contentHash: published.contentHash,
        updatedAt: Date.now(),
      } satisfies SyncActivation,
    });
    return false;
  })().finally(() => {
    readyForLocalUploads = true;
    initializationPromise = null;
  });
  return initializationPromise;
}

export function registerDataSyncListener() {
  const listener = (
    changes: Record<string, { newValue?: unknown }>,
    areaName: string,
  ) => {
    if (areaName === "local") {
      if (![...SYNCED_LOCAL_KEYS].some((key) => key in changes)) return;
      void queueDataSyncFromLocal().catch((error) => {
        console.error("[Mooogor Data Sync]", "upload:failed", error);
      });
      return;
    }
    if (areaName !== "sync") return;
    if (!(
      ENABLED_KEY in changes ||
      MANIFEST_KEY in changes ||
      Object.keys(changes).some((key) => key.startsWith(CHUNK_KEY_PREFIX))
    )) return;
    void initializeDataSync()
      .then((changed) => {
        if (!changed) return;
        return browser.runtime
          .sendMessage({ type: "dataSyncApplied" })
          .catch(() => undefined);
      })
      .catch((error) => {
        console.error("[Mooogor Data Sync]", "apply:failed", error);
      });
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
