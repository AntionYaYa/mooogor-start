export const PRESET_BACKGROUND_URLS = [
  "https://images.unsplash.com/photo-1752606402432-9eeb131c6101?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1783972669797-35dade964f0c?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
] as const;

export type BackgroundConfig = {
  enabled: boolean;
  url: string;
  customUrls: string[];
  fadePosition: number;
  scale: number;
  positionX: number;
  positionY: number;
  colorSchemes: Record<string, BackgroundColorScheme>;
};

export type BackgroundColorOption = {
  base: string;
  light: string;
  dark: string;
};

export type BackgroundColorScheme = {
  options: BackgroundColorOption[];
  lightColor: string;
  darkColor: string;
};

export const PRESET_BACKGROUND_COLOR_SCHEMES: Record<
  string,
  BackgroundColorScheme
> = {
  [PRESET_BACKGROUND_URLS[0]]: {
    options: [
      { base: "#0a1622", light: "#c7d4e1", dark: "#152230" },
      { base: "#2c4960", light: "#d2dae1", dark: "#1f2b35" },
      { base: "#486d88", light: "#d8dee3", dark: "#25313a" },
      { base: "#668ba0", light: "#dde2e5", dark: "#2b363c" },
      { base: "#5b5f6b", light: "#dbdcde", dark: "#2c2d31" },
      { base: "#a5a19e", light: "#e5e4e4", dark: "#3a3837" },
    ],
    lightColor: "#c7d4e1",
    darkColor: "#152230",
  },
  [PRESET_BACKGROUND_URLS[1]]: {
    options: [
      { base: "#3a898b", light: "#d5e4e5", dark: "#213b3c" },
      { base: "#041b19", light: "#c1e5e2", dark: "#0f3330" },
      { base: "#8fcdd2", light: "#e0ebec", dark: "#294a4d" },
      { base: "#82c2cc", light: "#dfeaeb", dark: "#28464b" },
      { base: "#05443b", light: "#c2e9e4", dark: "#103833" },
      { base: "#a8d3d4", light: "#e4ecec", dark: "#2e4b4c" },
    ],
    lightColor: "#d5e4e5",
    darkColor: "#213b3c",
  },
};

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  enabled: false,
  url: PRESET_BACKGROUND_URLS[0],
  customUrls: [],
  fadePosition: 100,
  scale: 100,
  positionX: 50,
  positionY: 50,
  colorSchemes: PRESET_BACKGROUND_COLOR_SCHEMES,
};

export function isBackgroundUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

export function isBackgroundColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function hexToHsl(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = h / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const [r1, g1, b1] =
    section < 1 ? [chroma, x, 0]
    : section < 2 ? [x, chroma, 0]
    : section < 3 ? [0, chroma, x]
    : section < 4 ? [0, x, chroma]
    : section < 5 ? [x, 0, chroma]
    : [chroma, 0, x];
  const m = l - chroma / 2;
  return `#${[r1, g1, b1]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function createBackgroundColorScheme(
  baseColors: string[],
): BackgroundColorScheme {
  const options = baseColors.map((base) => {
    const { h, s, l } = hexToHsl(base);
    return {
      base,
      light: hslToHex(h, Math.min(0.48, s * 0.55), 0.82 + l * 0.12),
      dark: hslToHex(h, Math.min(0.55, s * 0.72), 0.12 + l * 0.16),
    };
  });
  return {
    options,
    lightColor: options[0].light,
    darkColor: options[0].dark,
  };
}

function normalizeColorScheme(value: unknown): BackgroundColorScheme | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Partial<BackgroundColorScheme>;
  const options = Array.isArray(stored.options)
    ? stored.options.flatMap((option) => {
        if (!option || typeof option !== "object") return [];
        const item = option as Partial<BackgroundColorOption>;
        return isBackgroundColor(item.base) &&
          isBackgroundColor(item.light) &&
          isBackgroundColor(item.dark)
          ? [{
              base: item.base.toLowerCase(),
              light: item.light.toLowerCase(),
              dark: item.dark.toLowerCase(),
            }]
          : [];
      })
    : [];
  if (!options.length) return null;
  return {
    options,
    lightColor: isBackgroundColor(stored.lightColor)
      ? stored.lightColor.toLowerCase()
      : options[0].light,
    darkColor: isBackgroundColor(stored.darkColor)
      ? stored.darkColor.toLowerCase()
      : options[0].dark,
  };
}

function normalizeColorSchemes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([url, scheme]) => {
      const normalized = isBackgroundUrl(url)
        ? normalizeColorScheme(scheme)
        : null;
      return normalized ? [[url, normalized]] : [];
    }),
  );
}

export function normalizeBackgroundConfig(
  value: unknown,
): BackgroundConfig {
  const stored =
    value && typeof value === "object"
      ? (value as Partial<BackgroundConfig>)
      : {};
  const url = isBackgroundUrl(stored.url)
    ? stored.url.trim()
    : DEFAULT_BACKGROUND_CONFIG.url;
  const customUrls = Array.isArray(stored.customUrls)
    ? [...new Set(stored.customUrls.filter(isBackgroundUrl).map((item) => item.trim()))]
    : [];
  const colorSchemes = {
    ...PRESET_BACKGROUND_COLOR_SCHEMES,
    ...normalizeColorSchemes(stored.colorSchemes),
  };
  return {
    enabled: stored.enabled === true && isBackgroundUrl(url),
    url,
    customUrls,
    fadePosition: clampNumber(
      stored.fadePosition,
      DEFAULT_BACKGROUND_CONFIG.fadePosition,
      0,
      100,
    ),
    scale: clampNumber(
      stored.scale,
      DEFAULT_BACKGROUND_CONFIG.scale,
      100,
      200,
    ),
    positionX: clampNumber(
      stored.positionX,
      DEFAULT_BACKGROUND_CONFIG.positionX,
      0,
      100,
    ),
    positionY: clampNumber(
      stored.positionY,
      DEFAULT_BACKGROUND_CONFIG.positionY,
      0,
      100,
    ),
    colorSchemes,
  };
}
