import * as engines from "./engines";
import * as categories from "./engineCategories";
import { resetSearchEnginesToDefault } from "./resetSearchEngines";
import type { EngineOperations } from "./engineCommands";

const operations: EngineOperations = {
  addEngine: engines.addEngine,
  updateEngine: engines.updateEngine,
  deleteEngine: engines.deleteEngine,
  setEngineEnabled: engines.setEngineEnabled,
  reorderEngineCategory: engines.reorderEngineCategory,
  updateEnginesLayout: engines.updateEnginesLayout,
  updateEnginesOrder: engines.updateEnginesOrder,
  updateEnginesState: engines.updateEnginesState,
  updateEngineCategory: engines.updateEngineCategory,
  ensureDefaultEngines: engines.ensureDefaultEngines,
  resetEnginesToDefault: engines.resetEnginesToDefault,
  ensureDefaultEngineCategories: categories.ensureDefaultEngineCategories,
  ensureEngineCategory: categories.ensureEngineCategory,
  addEngineCategory: categories.addEngineCategory,
  renameEngineCategory: categories.renameEngineCategory,
  deleteEngineCategory: categories.deleteEngineCategory,
  updateEngineCategoriesOrder: categories.updateEngineCategoriesOrder,
  resetSearchEnginesToDefault,
};

export async function executeEngineCommand(operation: unknown, args: unknown) {
  if (typeof operation !== "string" || !Object.hasOwn(operations, operation) || !Array.isArray(args)) {
    throw new Error("Invalid engine configuration command");
  }
  const execute = operations[operation as keyof EngineOperations] as (...values: unknown[]) => Promise<unknown>;
  return await execute(...args);
}

