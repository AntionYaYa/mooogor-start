import { db } from "./database";
import type { Engine, EngineCategory } from "./database";
import { ensureEngineFavicons } from "./favicons";

function normalizeEngineCategory(category?: string): EngineCategory {
  return category?.trim() || "1";
}

export async function addEngine(engine: Omit<Engine, "id">) {
  const now = Date.now();
  const count = await db.engines.count();
  return await db.engines.add({
    ...engine,
    category: normalizeEngineCategory(engine.category),
    enabled: engine.enabled ?? true,
    order: engine.order ?? count,
    createAt: now,
    updateAt: now,
  });
}

export async function updateEngine(engine: Engine & { id: number }) {
  const now = Date.now();
  const existing = await db.engines.get(engine.id);
  const nextEnabled =
    typeof engine.enabled === "boolean" ? engine.enabled : existing?.enabled ?? true;
  return await db.engines.put({
    ...engine,
    category: normalizeEngineCategory(engine.category ?? existing?.category),
    enabled: nextEnabled,
    createAt: existing?.createAt ?? engine.createAt ?? now,
    updateAt: now,
  });
}

export async function deleteEngine(id: number) {
  return await db.engines.delete(id);
}

// export async function getAllEngine(): Promise<Engine[]> {
//   return await db.engines.toArray();
// }

export async function getEnabledEngines(): Promise<Engine[]> {
  return await db.engines
    .filter((e) => e.enabled !== false)
    .sortBy("order");
}

export async function getDisabledEngines(): Promise<Engine[]> {
  return await db.engines
    .filter((e) => e.enabled === false)
    .sortBy("order");
}

export async function getAllEnableEngine(): Promise<Engine[]> {
  const engines = await db.engines.toArray();
  return engines
    .filter((e) => e.enabled !== false)
    .sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));
}

export async function getEngine(domain: string): Promise<Engine | undefined> {
  return await db.engines.where("domain").equals(domain).first();
}

export async function updateEnginesOrder(items: (Engine & { id: number })[]) {
  const now = Date.now();
  await db.transaction("rw", db.engines, async () => {
    for (let i = 0; i < items.length; i++) {
      await db.engines.update(items[i].id, { order: i, updateAt: now });
    }
  });
}

export async function updateEnginesLayout(items: (Engine & { id: number })[]) {
  const now = Date.now();
  await db.transaction("rw", db.engines, async () => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.engines.update(item.id, {
        order: i,
        category: normalizeEngineCategory(item.category),
        enabled: item.enabled !== false,
        updateAt: now,
      });
    }
  });
}

export async function updateEnginesState(
  enabledItems: (Engine & { id: number })[],
  disabledItems: (Engine & { id: number })[],
) {
  const now = Date.now();
  await db.transaction("rw", db.engines, async () => {
    for (let i = 0; i < enabledItems.length; i++) {
      await db.engines.update(enabledItems[i].id, {
        order: i,
        enabled: true,
        updateAt: now,
      });
    }
    for (let i = 0; i < disabledItems.length; i++) {
      await db.engines.update(disabledItems[i].id, {
        order: i,
        enabled: false,
        updateAt: now,
      });
    }
  });
}

export async function updateEngineCategory(
  id: number,
  category: EngineCategory,
) {
  const now = Date.now();
  await db.engines.update(id, {
    category: normalizeEngineCategory(category),
    updateAt: now,
  });
}

export async function ensureDefaultEngines(
  defaults: Omit<Engine, "id">[],
) {
  const count = await db.engines.count();
  if (count === 0) {
    const now = Date.now();
    await db.engines.bulkAdd(
      defaults.map((engine, i) => ({
        ...engine,
        category: normalizeEngineCategory(engine.category),
        enabled: engine.enabled ?? true,
        order: i,
        createAt: now,
        updateAt: now,
      })),
    );
  }
  await ensureEngineFavicons(defaults);
}

export async function clearAllEngines() {
  await db.engines.clear();
}

function addEnginesUnsafe(defaults: Omit<Engine, "id">[]) {
  const now = Date.now();
  return db.engines.bulkAdd(
    defaults.map((engine, i) => ({
      ...engine,
      category: normalizeEngineCategory(engine.category),
      enabled: engine.enabled ?? true,
      order: i,
      createAt: now,
      updateAt: now,
    })),
  );
}

export async function resetEnginesToDefault(defaults: Omit<Engine, "id">[]) {
  await db.transaction("rw", db.engines, async () => {
    await db.engines.clear();
    await addEnginesUnsafe(defaults);
  });
  await ensureEngineFavicons(defaults);
}
