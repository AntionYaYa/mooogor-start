import type { Engine, EngineCategoryItem } from "./database";
import { updateStoredConfig } from "./configStorage";
import { createDefaultSearchConfig } from "./defaultSearchConfig";

export async function resetSearchEnginesToDefault(
  defaultCategories: Pick<EngineCategoryItem, "id" | "name">[],
  defaultEngines: Omit<Engine, "id">[],
) {
  await updateStoredConfig((config) => {
    Object.assign(config, createDefaultSearchConfig(defaultCategories, defaultEngines, config.engines));
  });
}
