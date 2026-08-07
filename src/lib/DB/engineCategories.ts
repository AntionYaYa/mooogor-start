import type { EngineCategoryItem } from "./database";
import { getStoredConfig, updateStoredConfig } from "./configStorage";

export const FALLBACK_ENGINE_CATEGORY_ID = "__fallback__";

const byOrder = (a: EngineCategoryItem, b: EngineCategoryItem) => (a.order ?? 0) - (b.order ?? 0);
const normalizeCategoryName = (name: string) => name.trim();

function generateCategoryId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getEngineCategories() {
  return [...(await getStoredConfig()).engineCategories].sort(byOrder);
}

export async function ensureDefaultEngineCategories(defaults: Pick<EngineCategoryItem, "id" | "name">[]) {
  await updateStoredConfig((config) => {
    if (config.engineCategories.length) return;
    const now = Date.now();
    config.engineCategories = defaults.map((item, index) => ({ ...item, name: normalizeCategoryName(item.name), order: index, createAt: now, updateAt: now }));
  });
}

export async function clearAllEngineCategories() {
  await updateStoredConfig((config) => { config.engineCategories = []; });
}

export async function resetEngineCategoriesToDefault(defaults: Pick<EngineCategoryItem, "id" | "name">[]) {
  await updateStoredConfig((config) => {
    const now = Date.now();
    config.engineCategories = defaults.map((item, index) => ({ ...item, name: normalizeCategoryName(item.name), order: index, createAt: now, updateAt: now }));
  });
}

export async function addEngineCategory(name: string): Promise<string> {
  const normalized = normalizeCategoryName(name);
  if (!normalized) throw new Error("Category name required");
  return await updateStoredConfig((config) => {
    const id = generateCategoryId();
    const now = Date.now();
    config.engineCategories.push({ id, name: normalized, order: config.engineCategories.length, createAt: now, updateAt: now });
    return id;
  });
}

export async function ensureEngineCategory(item: Pick<EngineCategoryItem, "id" | "name">, options: { order?: number } = {}) {
  const normalized = normalizeCategoryName(item.name);
  if (!normalized) throw new Error("Category name required");
  return await updateStoredConfig((config) => {
    if (config.engineCategories.some((category) => category.id === item.id)) return item.id;
    const now = Date.now();
    config.engineCategories.push({ ...item, name: normalized, order: options.order ?? config.engineCategories.length, createAt: now, updateAt: now });
    return item.id;
  });
}

export async function renameEngineCategory(id: string, name: string) {
  const normalized = normalizeCategoryName(name);
  if (!normalized) throw new Error("Category name required");
  await updateStoredConfig((config) => {
    const category = config.engineCategories.find((item) => item.id === id);
    if (category) { category.name = normalized; category.updateAt = Date.now(); }
  });
}

export async function deleteEngineCategory(id: string) {
  await updateStoredConfig((config) => {
    config.engines = config.engines.filter((engine) => engine.category !== id);
    config.engineCategories = config.engineCategories.filter((item) => item.id !== id).sort(byOrder);
    const now = Date.now();
    config.engineCategories.forEach((item, index) => { item.order = index; item.updateAt = now; });
  });
}

export async function updateEngineCategoriesOrder(items: (EngineCategoryItem & { id: string })[]) {
  await updateStoredConfig((config) => {
    const orderById = new Map(items.map((item, index) => [item.id, index]));
    const now = Date.now();
    config.engineCategories = config.engineCategories.map((item) =>
      orderById.has(item.id) ? { ...item, order: orderById.get(item.id), updateAt: now } : item,
    );
  });
}
