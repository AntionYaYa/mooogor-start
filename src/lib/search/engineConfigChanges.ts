import { browser } from "wxt/browser";
import { CONFIG_STORAGE_KEYS } from "@/lib/DB/configStorage";

export function subscribeEngineConfigChanges(onChange: () => void) {
  const handleChange = (changes: Record<string, unknown>, areaName: string) => {
    if (areaName !== "local") return;
    if (
      CONFIG_STORAGE_KEYS.engines in changes ||
      CONFIG_STORAGE_KEYS.engineCategories in changes
    ) onChange();
  };
  browser.storage.onChanged.addListener(handleChange);
  return () => browser.storage.onChanged.removeListener(handleChange);
}
