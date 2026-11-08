import { localeState } from "./i18nState.svelte";
import type { AppLanguage } from "@/lib/utils/settings";
import { browser } from "wxt/browser";

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

const INTL_LOCALE_BY_LANGUAGE: Record<
  Exclude<AppLanguage, "auto">,
  string
> = {
  zh_CN: "zh-CN",
  zh_TW: "zh-TW",
  en: "en",
};

let languageRequestSeq = 0;

function isLanguage(value: unknown): value is AppLanguage {
  return LANGUAGE_VALUES.includes(value as AppLanguage);
}

function getI18nApi() {
  return browser as { i18n?: I18nLike };
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
  language: AppLanguage = localeState.language,
): Exclude<AppLanguage, "auto"> {
  return language === "auto" ? resolveAutoLanguage() : language;
}

export function getIntlLocale(language: AppLanguage = localeState.language): string {
  return INTL_LOCALE_BY_LANGUAGE[getEffectiveLanguage(language)];
}

export function formatDateTime(
  value: number | Date,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "short",
    timeStyle: "short",
  },
): string {
  return new Intl.DateTimeFormat(getIntlLocale(), options).format(value);
}

function getRuntimeApi() {
  return browser as typeof browser & {
    runtime: { getURL: (path: string) => string };
  };
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

const messageRequests = new Map<string, Promise<MessageMap>>();

function fetchMessages(language: Exclude<AppLanguage, "auto">): Promise<MessageMap> {
  const existing = messageRequests.get(language);
  if (existing) return existing;
  const path = `/_locales/${language}/messages.json`;
  const url = getRuntimeApi()?.runtime?.getURL?.(path) ?? path;
  const request = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`Failed to load locale messages: ${language}`);
    return (await response.json()) as MessageMap;
  }).catch((error) => {
    messageRequests.delete(language);
    throw error;
  });
  messageRequests.set(language, request);
  return request;
}

async function setLanguageState(language: AppLanguage): Promise<void> {
  const requestSeq = ++languageRequestSeq;
  const nextLanguage = isLanguage(language) ? language : "auto";
  try {
    const messages = await fetchMessages(getEffectiveLanguage(nextLanguage));
    if (requestSeq !== languageRequestSeq) return;
    localeState.language = nextLanguage;
    localeState.messages = messages;
  } catch {
    // Keep the current translations visible if loading another language fails.
  }
}

export async function setLanguage(language: AppLanguage): Promise<void> {
  await setLanguageState(language);
}

export async function setRuntimeLanguage(language: AppLanguage): Promise<void> {
  await setLanguageState(language);
}

export function getLanguage(): AppLanguage {
  return localeState.language;
}

export function t(key: string, substitutions?: string | string[]): string {
  const localMessage = localeState.messages?.[key]?.message;
  if (localMessage) return applySubstitutions(localMessage, substitutions);

  const api = getI18nApi();
  const msg = api?.i18n?.getMessage?.(key, substitutions);
  if (msg && msg !== key) return msg;
  return key;
}
