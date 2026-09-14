import { createEngineId } from "./engineIdentity";
import type { Engine, EngineCategory } from "./database";
import { getStoredConfig, updateStoredConfig } from "./configStorage";

function normalizeEngineCategory(category?: string): EngineCategory {
  return category?.trim() || "1";
}

function requireCategory(categories: { id: string }[], category?: string) {
  const id = normalizeEngineCategory(category);
  if (!categories.some((item) => item.id === id)) throw new Error("Search category no longer exists");
  return id;
}

const byOrder = (a: Engine, b: Engine) => (a.order ?? 999999) - (b.order ?? 999999);

export async function getEngines() {
  return [...(await getStoredConfig()).engines].sort(byOrder);
}

export async function setEngineEnabled(id: number, enabled: boolean) {
  await updateStoredConfig((config) => {
    const engine = config.engines.find((item) => item.id === id);
    if (!engine) throw new Error(`Search engine ${id} does not exist`);
    engine.enabled = enabled;
    engine.updateAt = Date.now();
  });
}

export async function reorderEngineCategory(category: string, ids: number[]) {
  await updateStoredConfig((config) => {
    const engines = config.engines.filter((engine) => engine.category === category);
    const positions = new Map(ids.map((id, index) => [id, index]));
    if (positions.size !== ids.length || engines.length !== ids.length ||
        engines.some((engine) => engine.id === undefined || !positions.has(engine.id))) {
      throw new Error(`Search engine category ${category} changed before sorting was saved`);
    }
    const now = Date.now();
    for (const engine of engines) {
      engine.order = positions.get(engine.id!);
      engine.updateAt = now;
    }
  });
}

export async function addEngine(engine: Omit<Engine, "id">) {
  return await updateStoredConfig((config) => {
    const now = Date.now();
    const id = createEngineId(config.engines);
    config.engines.push({
      ...engine,
      id,
      category: requireCategory(config.engineCategories, engine.category),
      enabled: engine.enabled ?? true,
      order: engine.order ?? config.engines.length,
      createAt: now,
      updateAt: now,
    });
    return id;
  });
}

export async function updateEngine(engine: Pick<Engine, "title" | "engineUrl" | "faviconUrl" | "category" | "enabled"> & { id: number }) {
  return await updateStoredConfig((config) => {
    const existing = config.engines.find((item) => item.id === engine.id);
    if (!existing) throw new Error(`Search engine ${engine.id} does not exist`);
    Object.assign(existing, {
      title: engine.title,
      engineUrl: engine.engineUrl,
      faviconUrl: engine.faviconUrl,
      category: requireCategory(config.engineCategories, engine.category),
      enabled: engine.enabled,
      updateAt: Date.now(),
    });
    return engine.id;
  });
}

export async function deleteEngine(id: number) {
  await deleteEngines([id]);
  return id;
}

export async function deleteEngines(ids: number[]) {
  const selected = new Set(ids);
  await updateStoredConfig((config) => {
    config.engines = config.engines.filter((item) => item.id === undefined || !selected.has(item.id));
  });
}

export async function getEnabledEngines() {
  return (await getStoredConfig()).engines.filter((item) => item.enabled !== false).sort(byOrder);
}

export async function getDisabledEngines() {
  return (await getStoredConfig()).engines.filter((item) => item.enabled === false).sort(byOrder);
}

export async function getAllEnableEngine() {
  return (await getStoredConfig()).engines.filter((item) => item.enabled !== false).sort(byOrder);
}

export async function getEngine(domain: string) {
  return (await getStoredConfig()).engines.find((item) => {
    try {
      return new URL(item.engineUrl.replace("%s", "search")).hostname === domain;
    } catch {
      return false;
    }
  });
}

export async function updateEnginesOrder(items: (Engine & { id: number })[]) {
  await updateEnginesLayout(items);
}

export async function updateEnginesLayout(items: { id: number; category?: EngineCategory }[]) {
  await updateStoredConfig((config) => {
    const byId = new Map(items.map((item, index) => [item.id, { item, index }]));
    const now = Date.now();
    config.engines = config.engines.map((engine) => {
      const next = engine.id ? byId.get(engine.id) : undefined;
      return next
        ? {
            ...engine,
            order: next.index,
            category: requireCategory(config.engineCategories, next.item.category),
            updateAt: now,
          }
        : engine;
    });
  });
}

export async function updateEnginesState(enabledItems: (Engine & { id: number })[], disabledItems: (Engine & { id: number })[]) {
  await updateStoredConfig((config) => {
    const enabled = new Map(enabledItems.map((item, index) => [item.id, index]));
    const disabled = new Map(disabledItems.map((item, index) => [item.id, index]));
    const now = Date.now();
    config.engines = config.engines.map((engine) => {
      if (!engine.id) return engine;
      if (enabled.has(engine.id)) return { ...engine, enabled: true, order: enabled.get(engine.id), updateAt: now };
      if (disabled.has(engine.id)) return { ...engine, enabled: false, order: disabled.get(engine.id), updateAt: now };
      return engine;
    });
  });
}

export async function updateEngineCategory(id: number, category: EngineCategory) {
  await updateStoredConfig((config) => {
    const engine = config.engines.find((item) => item.id === id);
    if (engine) {
      engine.category = requireCategory(config.engineCategories, category);
      engine.updateAt = Date.now();
    }
  });
}

export async function ensureDefaultEngines(defaults: Omit<Engine, "id">[]) {
  await updateStoredConfig((config) => {
    if (config.engines.length) return;
    const now = Date.now();
    const allocated = [...config.engines];
    config.engines = defaults.map((engine, index) => {
      const id = createEngineId(allocated);
      allocated.push({ ...engine, id });
      return { ...engine, id, category: requireCategory(config.engineCategories, engine.category),
        enabled: engine.enabled ?? true, order: index, createAt: now, updateAt: now };
    });
  });
}

export async function clearAllEngines() {
  await updateStoredConfig((config) => { config.engines = []; });
}

export async function resetEnginesToDefault(defaults: Omit<Engine, "id">[]) {
  await updateStoredConfig((config) => {
    const now = Date.now();
    const allocated = [...config.engines];
    config.engines = defaults.map((engine, index) => {
      const id = createEngineId(allocated);
      allocated.push({ ...engine, id });
      return { ...engine, id, category: requireCategory(config.engineCategories, engine.category),
        enabled: engine.enabled ?? true, order: index, createAt: now, updateAt: now };
    });
  });
}
