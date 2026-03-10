import { db } from "./database";
import type { EngineCategoryItem } from "./database";

function normalizeCategoryName(name: string) {
  return name.trim();
}

function generateCategoryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getEngineCategories(): Promise<EngineCategoryItem[]> {
  return await db.engineCategories.orderBy("order").toArray();
}

export async function ensureDefaultEngineCategories(
  defaults: Pick<EngineCategoryItem, "id" | "name">[],
) {
  const count = await db.engineCategories.count();
  if (count > 0) return;
  const now = Date.now();
  await db.engineCategories.bulkAdd(
    defaults.map((item, index) => ({
      id: item.id,
      name: normalizeCategoryName(item.name),
      order: index,
      createAt: now,
      updateAt: now,
    })),
  );
}

export async function clearAllEngineCategories() {
  await db.engineCategories.clear();
}

function addEngineCategoriesUnsafe(
  defaults: Pick<EngineCategoryItem, "id" | "name">[],
) {
  const now = Date.now();
  return db.engineCategories.bulkAdd(
    defaults.map((item, index) => ({
      id: item.id,
      name: normalizeCategoryName(item.name),
      order: index,
      createAt: now,
      updateAt: now,
    })),
  );
}

export async function resetEngineCategoriesToDefault(
  defaults: Pick<EngineCategoryItem, "id" | "name">[],
) {
  await db.transaction("rw", db.engineCategories, async () => {
    await db.engineCategories.clear();
    await addEngineCategoriesUnsafe(defaults);
  });
}

export async function addEngineCategory(name: string): Promise<string> {
  const normalized = normalizeCategoryName(name);
  if (!normalized) {
    throw new Error("Category name required");
  }
  const now = Date.now();
  const count = await db.engineCategories.count();
  const id = generateCategoryId();
  await db.engineCategories.add({
    id,
    name: normalized,
    order: count,
    createAt: now,
    updateAt: now,
  });
  return id;
}

export async function renameEngineCategory(id: string, name: string) {
  const normalized = normalizeCategoryName(name);
  if (!normalized) {
    throw new Error("Category name required");
  }
  const now = Date.now();
  await db.engineCategories.update(id, {
    name: normalized,
    updateAt: now,
  });
}

export async function deleteEngineCategory(
  id: string,
  fallbackCategoryId: string,
) {
  if (id === fallbackCategoryId) {
    throw new Error("Fallback category must be different");
  }
  const now = Date.now();
  await db.transaction("rw", db.engineCategories, db.engines, async () => {
    await db.engineCategories.delete(id);
    await db.engines
      .where("category")
      .equals(id)
      .modify({ category: fallbackCategoryId, updateAt: now });

    const categories = await db.engineCategories.orderBy("order").toArray();
    for (let i = 0; i < categories.length; i++) {
      const item = categories[i];
      if ((item.order ?? i) === i) continue;
      await db.engineCategories.update(item.id, {
        order: i,
        updateAt: now,
      });
    }
  });
}

export async function updateEngineCategoriesOrder(
  items: (EngineCategoryItem & { id: string })[],
) {
  const now = Date.now();
  await db.transaction("rw", db.engineCategories, async () => {
    for (let i = 0; i < items.length; i++) {
      await db.engineCategories.update(items[i].id, {
        order: i,
        updateAt: now,
      });
    }
  });
}
