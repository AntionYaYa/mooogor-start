import { db } from "./database";
import type { Engine, EngineCategory } from "./database";
import type { EngineCategoryItem } from "./database";
import { ensureEngineFavicons } from "./favicons";

function normalizeEngineCategory(category?: string): EngineCategory {
  return category?.trim() || "1";
}

export async function resetSearchEnginesToDefault(
  defaultCategories: Pick<EngineCategoryItem, "id" | "name">[],
  defaultEngines: Omit<Engine, "id">[],
) {
  await db.transaction(
    "rw",
    db.engines,
    db.engineCategories,
    async () => {
      await db.engines.clear();
      await db.engineCategories.clear();

      const now = Date.now();
      await db.engineCategories.bulkAdd(
        defaultCategories.map((item, index) => ({
          id: item.id,
          name: item.name.trim(),
          order: index,
          createAt: now,
          updateAt: now,
        })),
      );

      await db.engines.bulkAdd(
        defaultEngines.map((engine, i) => ({
          ...engine,
          category: normalizeEngineCategory(engine.category),
          enabled: engine.enabled ?? true,
          order: engine.order ?? i,
          createAt: now,
          updateAt: now,
        })),
      );
    },
  );
  await ensureEngineFavicons(defaultEngines);
}
