const ENGINE_CATEGORY_KEY = "nt_engine_category";
const SELECTED_ENGINE_KEY_PREFIX = "nt_selected_search_engine";
const SEARCH_KEYS_KEY = "nt_search_keys";
export const MAX_SEARCH_KEYS = 10;

function hasLocalStorage() {
  return typeof localStorage !== "undefined";
}

// Kept async so Search can initialize the same way as before.
export async function hydrateSearchStorage() {}

export function readSelectedCategoryId(): string | null {
  if (!hasLocalStorage()) return null;
  return localStorage.getItem(ENGINE_CATEGORY_KEY) || null;
}

export function persistSelectedCategoryId(categoryId: string) {
  if (!hasLocalStorage()) return;
  localStorage.setItem(ENGINE_CATEGORY_KEY, categoryId);
}

export function clearPersistedSelectedCategoryId() {
  if (!hasLocalStorage()) return;
  localStorage.removeItem(ENGINE_CATEGORY_KEY);
}

function getSelectedEngineStorageKey(categoryId: string) {
  return `${SELECTED_ENGINE_KEY_PREFIX}:${categoryId || "all"}`;
}

export function readSelectedEngineUrl(engineCategoryId: string) {
  if (!hasLocalStorage()) return "";
  return localStorage.getItem(getSelectedEngineStorageKey(engineCategoryId)) ?? "";
}

export function persistSelectedEngineUrl(engineUrl: string, engineCategoryId: string) {
  if (!hasLocalStorage()) return;
  localStorage.setItem(getSelectedEngineStorageKey(engineCategoryId), engineUrl);
}

export function readSearchKeys(): string[] {
  if (!hasLocalStorage()) return [];
  try {
    const value = localStorage.getItem(SEARCH_KEYS_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed)
      ? parsed
          .map((item) => (typeof item === "string" ? normalizeSearchKey(item) : ""))
          .filter(Boolean)
          .slice(0, MAX_SEARCH_KEYS)
      : [];
  } catch {
    return [];
  }
}

export function persistSearchKeys(keys: string[]) {
  if (!hasLocalStorage()) return;
  localStorage.setItem(SEARCH_KEYS_KEY, JSON.stringify(keys.slice(0, MAX_SEARCH_KEYS)));
}

export function normalizeSearchKey(value: string) {
  return value.trim();
}
