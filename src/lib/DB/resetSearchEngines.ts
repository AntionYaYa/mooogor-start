import type { Engine, EngineCategory, EngineCategoryItem } from "./database";
import { updateStoredConfig } from "./configStorage";

const normalizeCategory = (category?: string): EngineCategory => category?.trim() || "1";

export async function resetSearchEnginesToDefault(
  defaultCategories: Pick<EngineCategoryItem, "id" | "name">[],
  defaultEngines: Omit<Engine, "id">[],
) {
  await updateStoredConfig((config) => {
    const now = Date.now();
    config.engineCategories = defaultCategories.map((item, index) => ({ ...item, name: item.name.trim(), order: index, createAt: now, updateAt: now }));
    config.engines = defaultEngines.map((engine, index) => ({
      ...engine, id: index + 1, category: normalizeCategory(engine.category), enabled: engine.enabled ?? true,
      order: index, createAt: now, updateAt: now,
    }));
  });
}
