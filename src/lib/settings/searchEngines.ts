import {
  FALLBACK_ENGINE_CATEGORY_ID,
  updateEnginesLayout,
} from "@/lib/DB/DB";
import type { Engine, EngineCategoryItem } from "@/lib/DB/DB";
import { getEngineConfigSnapshot } from "@/lib/DB/configStorage";

export type CategoryId = string;
export type SearchEngineGroups = Record<CategoryId, Engine[]>;

export type SearchEngineSettingsData = {
  categories: EngineCategoryItem[];
  enabledEngines: Engine[];
  disabledEngines: Engine[];
  groups: SearchEngineGroups;
};

export function resolveMissingCategoryId(
  categories: EngineCategoryItem[],
): CategoryId {
  return categories[0]?.id ?? "1";
}

export function normalizeEngineCategory(
  category: string | undefined,
  categories: EngineCategoryItem[],
): CategoryId {
  const fallbackCategoryId = resolveMissingCategoryId(categories);
  return category?.trim() || fallbackCategoryId;
}

export function sortSearchEngines(items: Engine[]): Engine[] {
  return [...items].sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) -
      (b.order ?? Number.MAX_SAFE_INTEGER),
  );
}

export function getAllSearchSettingEngines(
  enabledEngines: Engine[],
  disabledEngines: Engine[],
): Engine[] {
  return sortSearchEngines([...enabledEngines, ...disabledEngines]);
}

export function buildSearchEngineGroups(
  categories: EngineCategoryItem[],
  allEngines: Engine[],
): SearchEngineGroups {
  const grouped = Object.fromEntries(
    categories.map((category) => [category.id, [] as Engine[]]),
  ) as SearchEngineGroups;

  for (const engine of allEngines) {
    const normalizedCategory = normalizeEngineCategory(engine.category, categories);
    const categoryId = grouped[normalizedCategory]
      ? normalizedCategory
      : resolveMissingCategoryId(categories);

    grouped[categoryId] = [
      ...(grouped[categoryId] ?? []),
      { ...engine, category: categoryId },
    ];
  }

  return grouped;
}

export function flattenSearchEngineGroups(
  categories: EngineCategoryItem[],
  groups: SearchEngineGroups,
): Engine[] {
  return categories.flatMap((category) =>
    (groups[category.id] ?? []).map((engine) => ({
      ...engine,
      category: category.id,
    })),
  );
}

export function splitSearchEnginesByEnabled(
  categories: EngineCategoryItem[],
  groups: SearchEngineGroups,
): Pick<SearchEngineSettingsData, "enabledEngines" | "disabledEngines"> {
  const orderedEngines = flattenSearchEngineGroups(categories, groups);

  return {
    enabledEngines: orderedEngines.filter((engine) => engine.enabled !== false),
    disabledEngines: orderedEngines.filter((engine) => engine.enabled === false),
  };
}

export function getGroupedSearchEngines(
  categories: EngineCategoryItem[],
  groups: SearchEngineGroups,
) {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    items: groups[category.id] ?? [],
  }));
}

export { getBuiltInEngineIcon as buildEngineFaviconUrl } from "@/lib/DB/engineFavicons";

export async function loadSearchEngineSettings(): Promise<SearchEngineSettingsData> {
  const { categories: rawCategories, engines } = await getEngineConfigSnapshot();
  const enabled = engines.filter((engine) => engine.enabled !== false);
  const disabled = engines.filter((engine) => engine.enabled === false);

  const visibleCategories = rawCategories.filter(
    (item) => item.id !== FALLBACK_ENGINE_CATEGORY_ID,
  );
  const categories = visibleCategories.length ? visibleCategories : rawCategories;
  const fallbackCategoryId = resolveMissingCategoryId(categories);

  const enabledEngines = enabled.map((engine) => ({
    ...engine,
    enabled: true,
    category: engine.category?.trim() || fallbackCategoryId,
  }));
  const disabledEngines = disabled.map((engine) => ({
    ...engine,
    enabled: false,
    category: engine.category?.trim() || fallbackCategoryId,
  }));

  const groups = buildSearchEngineGroups(
    categories,
    getAllSearchSettingEngines(enabledEngines, disabledEngines),
  );

  return {
    categories,
    enabledEngines,
    disabledEngines,
    groups,
  };
}

export async function persistSearchEngineLayout(
  categories: EngineCategoryItem[],
  groups: SearchEngineGroups,
): Promise<void> {
  const orderedEngines = categories.flatMap((category) =>
    (groups[category.id] ?? []).map((engine, index) => ({
      ...engine,
      category: category.id,
      order: index,
    })),
  );

  const orderedWithIds: (Engine & { id: number })[] = orderedEngines.flatMap(
    (engine) => (engine.id ? [{ ...engine, id: engine.id }] : []),
  );

  if (!orderedWithIds.length) return;

  await updateEnginesLayout(orderedWithIds.map(({ id, category }) => ({ id, category })));
}
