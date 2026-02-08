import { db } from "./database";
import type { Engine } from "./database";

export async function addEngine(engine: Omit<Engine, "id">) {
  const now = Date.now();
  const count = await db.engines.count();
  return await db.engines.add({
    ...engine,
    order: engine.order ?? count,
    createAt: now,
    updateAt: now,
  });
}

export async function updateEngine(engine: Engine & { id: number }) {
  const now = Date.now();
  const existing = await db.engines.get(engine.id);
  return await db.engines.put({
    ...engine,
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

export async function ensureDefaultEngines(
  defaults: Omit<Engine, "id">[],
) {
  const count = await db.engines.count();
  if (count > 0) return;

  const now = Date.now();
  await db.engines.bulkAdd(
    defaults.map((engine, i) => ({
      ...engine,
      enabled: engine.enabled ?? true,
      order: engine.order ?? i,
      createAt: now,
      updateAt: now,
    })),
  );
}
