import { browser } from "wxt/browser";
import type * as Engines from "./engines";
import type * as Categories from "./engineCategories";
import type * as Reset from "./resetSearchEngines";

export type EngineOperations = Pick<typeof Engines, "addEngine" | "updateEngine" | "deleteEngine" | "setEngineEnabled" | "reorderEngineCategory" | "updateEnginesLayout" | "updateEnginesOrder" | "updateEnginesState" | "updateEngineCategory" | "ensureDefaultEngines" | "resetEnginesToDefault"> &
  Pick<typeof Categories, "ensureDefaultEngineCategories" | "ensureEngineCategory" | "addEngineCategory" | "renameEngineCategory" | "deleteEngineCategory" | "updateEngineCategoriesOrder"> & typeof Reset;

function command<K extends keyof EngineOperations>(operation: K) {
  return async (...args: Parameters<EngineOperations[K]>): Promise<Awaited<ReturnType<EngineOperations[K]>>> => {
    const response = await browser.runtime.sendMessage({
      type: "mutateEngineConfig",
      operation,
      args: JSON.parse(JSON.stringify(args)),
    });
    if (!response || response.ok !== true) {
      throw new Error(response?.error ?? "Engine configuration update failed");
    }
    return response.value;
  };
}

export const addEngine = command("addEngine");
export const updateEngine = command("updateEngine");
export const deleteEngine = command("deleteEngine");
export const setEngineEnabled = command("setEngineEnabled");
export const reorderEngineCategory = command("reorderEngineCategory");
export const updateEnginesLayout = command("updateEnginesLayout");
export const updateEnginesOrder = command("updateEnginesOrder");
export const updateEnginesState = command("updateEnginesState");
export const updateEngineCategory = command("updateEngineCategory");
export const ensureDefaultEngines = command("ensureDefaultEngines");
export const resetEnginesToDefault = command("resetEnginesToDefault");
export const ensureDefaultEngineCategories = command("ensureDefaultEngineCategories");
export const ensureEngineCategory = command("ensureEngineCategory");
export const addEngineCategory = command("addEngineCategory");
export const renameEngineCategory = command("renameEngineCategory");
export const deleteEngineCategory = command("deleteEngineCategory");
export const updateEngineCategoriesOrder = command("updateEngineCategoriesOrder");
export const resetSearchEnginesToDefault = command("resetSearchEnginesToDefault");

