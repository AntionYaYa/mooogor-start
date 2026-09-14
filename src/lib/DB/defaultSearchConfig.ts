import { createEngineId } from "./engineIdentity";
import type { Engine, EngineCategoryItem } from "./database";
import { updateStoredConfig } from "./configStorage";

type DefaultCategory = Pick<EngineCategoryItem, "id" | "name">;

export function createDefaultSearchConfig(defaultCategories: DefaultCategory[], defaultEngines: Omit<Engine, "id">[], previousEngines: Pick<Engine, "id">[] = []) {
  const now = Date.now();
  const allocated = [...previousEngines];
  return {
    engineCategories: defaultCategories.map((item, index) => ({
      ...item, name: item.name.trim(), order: index, createAt: now, updateAt: now,
    })),
    engines: defaultEngines.map((engine, index) => {
      const id = createEngineId(allocated);
      allocated.push({ id });
      return { ...engine, id, category: engine.category?.trim() || "1", enabled: engine.enabled ?? true,
        order: index, createAt: now, updateAt: now };
    }),
  };
}

export async function initializeDefaultSearchConfig(defaultCategories: DefaultCategory[], defaultEngines: Omit<Engine, "id">[]) {
  await updateStoredConfig((config) => {
    // An existing empty category is user configuration, not an uninitialized app.
    if (config.engineCategories.length || config.engines.length) return;
    Object.assign(config, createDefaultSearchConfig(defaultCategories, defaultEngines));
  });
}
