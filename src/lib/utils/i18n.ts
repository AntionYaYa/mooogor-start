import type { AppLanguage } from "@/lib/utils/settings";

type I18nLike = {
  getMessage?: (key: string, substitutions?: string | string[]) => string;
  getUILanguage?: () => string;
};

type MessageValue = {
  message?: string;
};

type MessageMap = Record<string, MessageValue>;

const LANGUAGE_KEY = "nt_language";
const MESSAGES_CACHE_PREFIX = "nt_messages_";
const LANGUAGE_VALUES = [
  "auto",
  "zh_CN",
  "zh_TW",
  "en",
] as const;

let currentLanguage: AppLanguage = readLanguagePreference();
let currentMessages: MessageMap | null = readInitialMessages();
let languageRequestSeq = 0;

function isLanguage(value: unknown): value is AppLanguage {
  return LANGUAGE_VALUES.includes(value as AppLanguage);
}

function readLanguagePreference(): AppLanguage {
  if (typeof localStorage === "undefined") return "auto";
  const value = localStorage.getItem(LANGUAGE_KEY);
  return isLanguage(value) ? value : "auto";
}

function getCacheKey(language: Exclude<AppLanguage, "auto">): string {
  return `${MESSAGES_CACHE_PREFIX}${language}`;
}

function readCachedMessages(language: AppLanguage): MessageMap | null {
  if (language === "auto") return null;
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(getCacheKey(language));
    if (!raw) return null;
    return JSON.parse(raw) as MessageMap;
  } catch {
    return null;
  }
}

function saveCachedMessages(
  language: Exclude<AppLanguage, "auto">,
  messages: MessageMap,
) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(getCacheKey(language), JSON.stringify(messages));
  } catch {
    // Ignore quota or serialization failures.
  }
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
  if (currentLanguage === "auto") {
    return readCachedMessages(resolveAutoLanguage());
  }
  return readCachedMessages(currentLanguage);
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

export async function setLanguage(language: AppLanguage): Promise<void> {
  const requestSeq = ++languageRequestSeq;
  const nextLanguage = isLanguage(language) ? language : "auto";
  currentLanguage = nextLanguage;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LANGUAGE_KEY, nextLanguage);
  }
  if (nextLanguage === "auto") {
    const autoLanguage = resolveAutoLanguage();
    const cached = readCachedMessages(autoLanguage);
    if (requestSeq !== languageRequestSeq) return;
    currentMessages = cached ?? null;
    try {
      const messages = await fetchMessages(autoLanguage);
      if (requestSeq !== languageRequestSeq) return;
      currentMessages = messages;
      saveCachedMessages(autoLanguage, messages);
    } catch {
      if (requestSeq !== languageRequestSeq) return;
      if (!currentMessages) currentMessages = cached ?? null;
    }
    return;
  }
  const cached = readCachedMessages(nextLanguage);
  if (requestSeq !== languageRequestSeq) return;
  if (cached) {
    currentMessages = cached;
  }
  try {
    const messages = await fetchMessages(nextLanguage);
    if (requestSeq !== languageRequestSeq) return;
    currentMessages = messages;
    saveCachedMessages(nextLanguage, messages);
  } catch {
    if (requestSeq !== languageRequestSeq) return;
    if (!currentMessages) currentMessages = cached;
  }
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
