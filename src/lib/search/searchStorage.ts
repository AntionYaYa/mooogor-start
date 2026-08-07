import { getExtensionStorage } from "@/lib/DB/configStorage";

const ENGINE_CATEGORY_KEY = "nt_engine_category";
const SELECTED_ENGINE_KEY_PREFIX = "nt_selected_search_engine";
const SEARCH_KEYS_KEY = "nt_search_keys";
const STORAGE_KEY = "mooogor.search-ui.v1";
export const MAX_SEARCH_KEYS = 10;

type SearchUiState = {
  selectedCategoryId?: string;
  selectedEngineUrls: Record<string, string>;
  searchKeys: string[];
};

let state: SearchUiState = {
  selectedEngineUrls: {},
  searchKeys: [],
};
let hydrated = false;
let writeQueue = Promise.resolve();

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
      searchKeys = parsed
        .map((item) => (typeof item === "string" ? normalizeSearchKey(item) : ""))
        .filter(Boolean)
        .slice(0, MAX_SEARCH_KEYS);
    }
  } catch {
    // Ignore invalid legacy values.
  }
  return { selectedCategoryId, selectedEngineUrls, searchKeys };
}

function normalizeState(value: unknown): SearchUiState {
  if (!value || typeof value !== "object") return { selectedEngineUrls: {}, searchKeys: [] };
  const candidate = value as Partial<SearchUiState>;
  const selectedEngineUrls = Object.fromEntries(
    Object.entries(candidate.selectedEngineUrls ?? {}).filter(
      ([, url]) => typeof url === "string",
    ),
  );
  return {
    selectedCategoryId:
      typeof candidate.selectedCategoryId === "string" ? candidate.selectedCategoryId : undefined,
    selectedEngineUrls,
    searchKeys: Array.isArray(candidate.searchKeys)
      ? candidate.searchKeys
          .map((item) => (typeof item === "string" ? normalizeSearchKey(item) : ""))
          .filter(Boolean)
          .slice(0, MAX_SEARCH_KEYS)
      : [],
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
  const stored = (await getExtensionStorage().get(STORAGE_KEY))[STORAGE_KEY];
  if (stored) {
    state = normalizeState(stored);
  } else {
    state = readLegacyState();
    await persistState();
  }
  hydrated = true;
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

export function readSearchKeys(): string[] {
  return [...state.searchKeys];
}

export function persistSearchKeys(keys: string[]) {
  state.searchKeys = keys.slice(0, MAX_SEARCH_KEYS);
  void persistState();
}

export function normalizeSearchKey(value: string) {
  return value.trim();
}
