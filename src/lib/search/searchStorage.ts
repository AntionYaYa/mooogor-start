import { getExtensionStorage } from "@/lib/DB/configStorage";

const ENGINE_CATEGORY_KEY = "nt_engine_category";
const SELECTED_ENGINE_KEY_PREFIX = "nt_selected_search_engine";
const SEARCH_KEYS_KEY = "nt_search_keys";
const STORAGE_KEY = "mooogor.search-ui.v1";
export const MAX_SEARCH_KEYS = 10;

type SearchUiState = {
  selectedCategoryId?: string;
  selectedEngineUrls: Record<string, string>;
  searchKeysByCategory: Record<string, string[]>;
  searchKeys?: string[];
};

let state: SearchUiState = {
  selectedEngineUrls: {},
  searchKeysByCategory: {},
};
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let writeQueue = Promise.resolve();

function normalizeSearchKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? normalizeSearchKey(item) : ""))
    .filter(Boolean)
    .slice(0, MAX_SEARCH_KEYS);
}

function readLegacyState(): SearchUiState {
  if (typeof localStorage === "undefined") return state;
  const selectedCategoryId = localStorage.getItem(ENGINE_CATEGORY_KEY) ?? undefined;
  const selectedEngineUrls: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(`${SELECTED_ENGINE_KEY_PREFIX}:`)) continue;
    const value = localStorage.getItem(key);
    if (value) selectedEngineUrls[key.slice(SELECTED_ENGINE_KEY_PREFIX.length + 1)] = value;
  }
  let searchKeys: string[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SEARCH_KEYS_KEY) ?? "[]");
    if (Array.isArray(parsed)) {
      searchKeys = normalizeSearchKeys(parsed);
    }
  } catch {
    // Ignore invalid legacy values.
  }
  return { selectedCategoryId, selectedEngineUrls, searchKeysByCategory: {}, searchKeys };
}

function clearLegacySearchKeys() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SEARCH_KEYS_KEY);
}

function normalizeState(value: unknown): SearchUiState {
  if (!value || typeof value !== "object") {
    return { selectedEngineUrls: {}, searchKeysByCategory: {} };
  }
  const candidate = value as Partial<SearchUiState>;
  const selectedEngineUrls = Object.fromEntries(
    Object.entries(candidate.selectedEngineUrls ?? {}).filter(
      ([, url]) => typeof url === "string",
    ),
  );
  const searchKeysByCategory = Object.fromEntries(
    Object.entries(candidate.searchKeysByCategory ?? {})
      .map(([categoryId, keys]) => [categoryId, normalizeSearchKeys(keys)])
      .filter(([, keys]) => (keys as string[]).length > 0),
  );
  const legacySearchKeys = normalizeSearchKeys(candidate.searchKeys);
  return {
    selectedCategoryId:
      typeof candidate.selectedCategoryId === "string" ? candidate.selectedCategoryId : undefined,
    selectedEngineUrls,
    searchKeysByCategory,
    ...(legacySearchKeys.length ? { searchKeys: legacySearchKeys } : {}),
  };
}

async function persistState() {
  const snapshot = structuredClone(state);
  const task = writeQueue.then(() =>
    getExtensionStorage().set({ [STORAGE_KEY]: snapshot }),
  );
  writeQueue = task.then(() => undefined, () => undefined);
  await task;
}

export async function hydrateSearchStorage() {
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const stored = (await getExtensionStorage().get(STORAGE_KEY))[STORAGE_KEY];
      if (stored) {
        state = normalizeState(stored);
      } else {
        state = readLegacyState();
        await persistState();
      }
      hydrated = true;
    })();
  }
  try {
    await hydratePromise;
  } catch (error) {
    hydratePromise = null;
    throw error;
  }
}

export function readSelectedCategoryId(): string | null {
  return state.selectedCategoryId ?? null;
}

export function persistSelectedCategoryId(categoryId: string) {
  state.selectedCategoryId = categoryId;
  void persistState();
}

export function clearPersistedSelectedCategoryId() {
  state.selectedCategoryId = undefined;
  void persistState();
}

export function readSelectedEngineUrl(categoryId: string) {
  return state.selectedEngineUrls[categoryId || "all"] ?? "";
}

export function persistSelectedEngineUrl(engineUrl: string, categoryId: string) {
  state.selectedEngineUrls[categoryId || "all"] = engineUrl;
  void persistState();
}

export async function migrateLegacySearchKeys(firstCategoryId: string) {
  await hydrateSearchStorage();
  if (!state.searchKeys || !firstCategoryId) return;
  const legacyKeys = normalizeSearchKeys(state.searchKeys);
  if (legacyKeys.length) {
    const currentKeys = state.searchKeysByCategory[firstCategoryId] ?? [];
    state.searchKeysByCategory[firstCategoryId] = [
      ...legacyKeys,
      ...currentKeys.filter((item) => !legacyKeys.includes(item)),
    ].slice(0, MAX_SEARCH_KEYS);
  }
  delete state.searchKeys;
  await persistState();
  clearLegacySearchKeys();
}

export function readSearchKeys(categoryId: string): string[] {
  return [...(state.searchKeysByCategory[categoryId] ?? [])];
}

export function persistSearchKeys(categoryId: string, keys: string[]) {
  if (!categoryId) return;
  const normalized = normalizeSearchKeys(keys);
  if (normalized.length) {
    state.searchKeysByCategory[categoryId] = normalized;
  } else {
    delete state.searchKeysByCategory[categoryId];
  }
  void persistState();
}

export async function deleteSearchKeysForCategory(categoryId: string) {
  await hydrateSearchStorage();
  if (!(categoryId in state.searchKeysByCategory)) return;
  delete state.searchKeysByCategory[categoryId];
  await persistState();
}

export async function retainSearchKeysForCategories(categoryIds: string[]) {
  await hydrateSearchStorage();
  const retainedIds = new Set(categoryIds);
  const staleIds = Object.keys(state.searchKeysByCategory).filter(
    (categoryId) => !retainedIds.has(categoryId),
  );
  if (!staleIds.length) return;
  for (const categoryId of staleIds) {
    delete state.searchKeysByCategory[categoryId];
  }
  await persistState();
}

export function normalizeSearchKey(value: string) {
  return value.trim();
}
