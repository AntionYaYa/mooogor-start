import type { Engine, EngineCategory } from "./database";
import { getStoredConfig, updateStoredConfig } from "./configStorage";
import { ensureEngineFavicons } from "./favicons";

function normalizeEngineCategory(category?: string): EngineCategory {
  return category?.trim() || "1";
}

function nextId(items: Engine[]) {
  return Math.max(0, ...items.map((item) => item.id ?? 0)) + 1;
}

const byOrder = (a: Engine, b: Engine) => (a.order ?? 999999) - (b.order ?? 999999);

export async function addEngine(engine: Omit<Engine, "id">) {
  return await updateStoredConfig((config) => {
    const now = Date.now();
    const id = nextId(config.engines);
    config.engines.push({
      ...engine,
      id,
      category: normalizeEngineCategory(engine.category),
      enabled: engine.enabled ?? true,
      order: engine.order ?? config.engines.length,
      createAt: now,
      updateAt: now,
    });
    return id;
  });
}

export async function updateEngine(engine: Engine & { id: number }) {
  return await updateStoredConfig((config) => {
    const index = config.engines.findIndex((item) => item.id === engine.id);
    const existing = config.engines[index];
    const next: Engine = {
      ...engine,
      category: normalizeEngineCategory(engine.category ?? existing?.category),
      enabled: typeof engine.enabled === "boolean" ? engine.enabled : existing?.enabled ?? true,
      createAt: existing?.createAt ?? engine.createAt ?? Date.now(),
      updateAt: Date.now(),
    };
    if (index >= 0) config.engines[index] = next;
    else config.engines.push(next);
    return engine.id;
  });
}

export async function deleteEngine(id: number) {
  await updateStoredConfig((config) => {
    config.engines = config.engines.filter((item) => item.id !== id);
  });
  return id;
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

export async function updateEnginesLayout(items: (Engine & { id: number })[]) {
  await updateStoredConfig((config) => {
    const byId = new Map(items.map((item, index) => [item.id, { item, index }]));
    const now = Date.now();
    config.engines = config.engines.map((engine) => {
      const next = engine.id ? byId.get(engine.id) : undefined;
      return next
        ? {
            ...engine,
            order: next.index,
            category: normalizeEngineCategory(next.item.category),
            enabled: next.item.enabled !== false,
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
      engine.category = normalizeEngineCategory(category);
      engine.updateAt = Date.now();
    }
  });
}

export async function ensureDefaultEngines(defaults: Omit<Engine, "id">[]) {
  await updateStoredConfig((config) => {
    if (config.engines.length) return;
    const now = Date.now();
    config.engines = defaults.map((engine, index) => ({
      ...engine, id: index + 1, category: normalizeEngineCategory(engine.category),
      enabled: engine.enabled ?? true, order: index, createAt: now, updateAt: now,
    }));
  });
  await ensureEngineFavicons(defaults);
}

export async function clearAllEngines() {
  await updateStoredConfig((config) => { config.engines = []; });
}

export async function resetEnginesToDefault(defaults: Omit<Engine, "id">[]) {
  await updateStoredConfig((config) => {
    const now = Date.now();
    config.engines = defaults.map((engine, index) => ({
      ...engine, id: index + 1, category: normalizeEngineCategory(engine.category),
      enabled: engine.enabled ?? true, order: index, createAt: now, updateAt: now,
    }));
  });
  await ensureEngineFavicons(defaults);
}
