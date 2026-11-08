import type { AppLanguage } from "./settings";

export const localeState = $state({
  language: "auto" as AppLanguage,
  messages: null as Record<string, { message?: string }> | null,
});
