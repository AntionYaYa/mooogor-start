import type { AppLanguage } from "@/lib/utils/settings";

type I18nLike = {
  getMessage?: (key: string, substitutions?: string | string[]) => string;
  getUILanguage?: () => string;
};

type MessageValue = {
  message?: string;
};

type MessageMap = Record<string, MessageValue>;

const LANGUAGE_VALUES = [
  "auto",
  "zh_CN",
  "zh_TW",
  "en",
] as const;

let currentLanguage: AppLanguage = "auto";
let currentMessages: MessageMap | null = readInitialMessages();
let languageRequestSeq = 0;

function isLanguage(value: unknown): value is AppLanguage {
  return LANGUAGE_VALUES.includes(value as AppLanguage);
}

function getI18nApi() {
  return (
    (globalThis as unknown as { browser?: { i18n?: I18nLike } }).browser ??
    (globalThis as unknown as { chrome?: { i18n?: I18nLike } }).chrome
  );
}

function resolveAutoLanguage(): Exclude<AppLanguage, "auto"> {
  const api = getI18nApi();
  const uiLanguage =
    api?.i18n?.getUILanguage?.() ??
    (typeof navigator !== "undefined" ? navigator.language : "en");
  const normalized = uiLanguage.toLowerCase().replace("-", "_");
  if (
    normalized.startsWith("zh_tw") ||
    normalized.startsWith("zh_hk") ||
    normalized.startsWith("zh_mo") ||
    normalized.startsWith("zh_hant")
  ) {
    return "zh_TW";
  }
  if (normalized.startsWith("zh")) return "zh_CN";
  return "en";
}

export function getEffectiveLanguage(
  language: AppLanguage = currentLanguage,
): Exclude<AppLanguage, "auto"> {
  return language === "auto" ? resolveAutoLanguage() : language;
}

function readInitialMessages(): MessageMap | null {
  return null;
}

function getRuntimeApi() {
  return (
    (globalThis as unknown as { browser?: { runtime?: { getURL?: (path: string) => string } } }).browser ??
    (globalThis as unknown as { chrome?: { runtime?: { getURL?: (path: string) => string } } }).chrome
  );
}

function applySubstitutions(
  message: string,
  substitutions?: string | string[],
): string {
  if (!substitutions) return message;
  const values = Array.isArray(substitutions) ? substitutions : [substitutions];
  return values.reduce(
    (text, value, index) =>
      text
        .replaceAll(`$${index + 1}`, value)
        .replaceAll(`$${index + 1}$`, value),
    message,
  );
}

async function fetchMessages(
  language: Exclude<AppLanguage, "auto">,
): Promise<MessageMap> {
  const path = `/_locales/${language}/messages.json`;
  const runtime = getRuntimeApi();
  const url = runtime?.runtime?.getURL?.(path) ?? path;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load locale messages: ${language}`);
  }
  return (await response.json()) as MessageMap;
}

async function setLanguageState(
  language: AppLanguage,
): Promise<void> {
  const requestSeq = ++languageRequestSeq;
  const nextLanguage = isLanguage(language) ? language : "auto";
  currentLanguage = nextLanguage;
  if (nextLanguage === "auto") {
    const autoLanguage = resolveAutoLanguage();
    if (requestSeq !== languageRequestSeq) return;
    currentMessages = null;
    try {
      const messages = await fetchMessages(autoLanguage);
      if (requestSeq !== languageRequestSeq) return;
      currentMessages = messages;
    } catch {
      if (requestSeq !== languageRequestSeq) return;
    }
    return;
  }
  if (requestSeq !== languageRequestSeq) return;
  try {
    const messages = await fetchMessages(nextLanguage);
    if (requestSeq !== languageRequestSeq) return;
    currentMessages = messages;
  } catch {
    if (requestSeq !== languageRequestSeq) return;
  }
}

export async function setLanguage(language: AppLanguage): Promise<void> {
  await setLanguageState(language);
}

export async function setRuntimeLanguage(language: AppLanguage): Promise<void> {
  await setLanguageState(language);
}

export function getLanguage(): AppLanguage {
  return currentLanguage;
}

export function t(key: string, substitutions?: string | string[]): string {
  const localMessage = currentMessages?.[key]?.message;
  if (localMessage) return applySubstitutions(localMessage, substitutions);

  const api = getI18nApi();
  const msg = api?.i18n?.getMessage?.(key, substitutions);
  if (msg && msg !== key) return msg;
  return key;
}
