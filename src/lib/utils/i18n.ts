type I18nLike = {
  getMessage?: (key: string, substitutions?: string | string[]) => string;
};

export function t(key: string, substitutions?: string | string[]): string {
  const api =
    (globalThis as unknown as { browser?: { i18n?: I18nLike } }).browser ??
    (globalThis as unknown as { chrome?: { i18n?: I18nLike } }).chrome;
  const msg = api?.i18n?.getMessage?.(key, substitutions);
  return msg || key;
}
