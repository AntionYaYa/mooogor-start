export const PRESET_BACKGROUND_URLS = [
  "https://images.unsplash.com/photo-1752606402432-9eeb131c6101?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1783972669797-35dade964f0c?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1446034295857-c39f8844fad4?q=80&w=5340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1540205082-e56e180508e6?q=80&w=3732&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1783638204102-c20f956b5663?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1777276516260-3a87c1e42db4?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
] as const;

export type BackgroundConfig = {
  enabled: boolean;
  current: BackgroundItem;
  items: BackgroundItem[];
};

export type BackgroundItem = {
  id: string;
  url: string;
  deletable: boolean;
  fadePosition: number;
  scale: number;
  positionX: number;
  positionY: number;
  blur: number;
  options: BackgroundColorOption[];
  lightColor: string | null;
  darkColor: string | null;
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

const PRESET_BACKGROUND_COLOR_SCHEMES: Record<
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
      { base: "#404c4b", light: "#d8dbdb", dark: "#272c2c" },
    ],
    lightColor: "#c7d4e1",
    darkColor: "#152230",
  },
  [PRESET_BACKGROUND_URLS[1]]: {
    options: [
      { base: "#328385", light: "#d3e4e5", dark: "#1e3b3c" },
      { base: "#041b19", light: "#c1e5e2", dark: "#0f3330" },
      { base: "#76b4b7", light: "#dee7e8", dark: "#2a4243" },
      { base: "#8fcdd2", light: "#e0ebec", dark: "#294a4d" },
      { base: "#82c2cc", light: "#dfeaeb", dark: "#28464b" },
      { base: "#05443b", light: "#c2e9e4", dark: "#103833" },
      { base: "#a8d3d4", light: "#e4ecec", dark: "#2e4b4c" },
    ],
    lightColor: "#d3e4e5",
    darkColor: "#1e3b3c",
  },
  [PRESET_BACKGROUND_URLS[2]]: {
    options: [
      { base: "#29332d", light: "#d4d9d6", dark: "#232925" },
      { base: "#bcafa6", light: "#e8e6e4", dark: "#413a35" },
      { base: "#777670", light: "#dfdfde", dark: "#323230" },
      { base: "#606663", light: "#dcdedd", dark: "#2d2f2e" },
      { base: "#8d8985", light: "#e2e2e1", dark: "#363533" },
      { base: "#93948c", light: "#e3e3e2", dark: "#373734" },
      { base: "#9c642c", light: "#e8ddd3", dark: "#412f1c" },
    ],
    lightColor: "#d4d9d6",
    darkColor: "#232925",
  },
  [PRESET_BACKGROUND_URLS[3]]: {
    options: [
      { base: "#1aadaa", light: "#cfebea", dark: "#164746" },
      { base: "#046474", light: "#c6e6eb", dark: "#12383e" },
      { base: "#044158", light: "#c3dfea", dark: "#112f3b" },
      { base: "#95e1da", light: "#e0efed", dark: "#245550" },
      { base: "#60e2d9", light: "#daefed", dark: "#1c5451" },
      { base: "#047e72", light: "#c7ebe8", dark: "#12403b" },
      { base: "#06554b", light: "#c3eae5", dark: "#113b35" },
    ],
    lightColor: "#cfebea",
    darkColor: "#164746",
  },
  [PRESET_BACKGROUND_URLS[4]]: {
    options: [
      { base: "#3a4449", light: "#d7dadb", dark: "#262a2c" },
      { base: "#0e1213", light: "#cfd5d7", dark: "#1e2325" },
      { base: "#aba096", light: "#e6e4e3", dark: "#3d3834" },
      { base: "#7a7f87", light: "#e0e0e1", dark: "#313335" },
      { base: "#747575", light: "#dfdfdf", dark: "#313131" },
      { base: "#616e76", light: "#dcdee0", dark: "#2c3133" },
      { base: "#888e92", light: "#e1e2e3", dark: "#333537" },
    ],
    lightColor: "#d7dadb",
    darkColor: "#262a2c",
  },
  [PRESET_BACKGROUND_URLS[5]]: {
    options: [
      { base: "#050b13", light: "#c4d1e1", dark: "#131f2e" },
      { base: "#47494e", light: "#d9dadb", dark: "#292a2c" },
      { base: "#5e5e61", light: "#dcdcdd", dark: "#2d2d2e" },
      { base: "#6d6e71", light: "#dededf", dark: "#303031" },
      { base: "#34333a", light: "#d7d6d9", dark: "#262629" },
      { base: "#383c3c", light: "#d7d9d9", dark: "#272929" },
      { base: "#546464", light: "#dadede", dark: "#2a3030" },
    ],
    lightColor: "#c4d1e1",
    darkColor: "#131f2e",
  },
};

export const DEFAULT_BACKGROUND_PARAMETERS = {
  fadePosition: 0,
  scale: 100,
  positionX: 50,
  positionY: 50,
  blur: 0,
};

export function cloneBackgroundItem(item: BackgroundItem): BackgroundItem {
  return {
    ...item,
    options: item.options.map((option) => ({ ...option })),
  };
}

export const PRESET_BACKGROUNDS: BackgroundItem[] = PRESET_BACKGROUND_URLS.map(
  (url, index) => ({
    id: `preset-${index + 1}`,
    url,
    deletable: false,
    ...DEFAULT_BACKGROUND_PARAMETERS,
    ...PRESET_BACKGROUND_COLOR_SCHEMES[url],
  }),
);

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  enabled: false,
  current: cloneBackgroundItem(PRESET_BACKGROUNDS[0]),
  items: PRESET_BACKGROUNDS.map(cloneBackgroundItem),
};

export function isBackgroundUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return !/\.(?:3g2|3gp|avi|m4v|mkv|mov|mp4|mpeg|mpg|ogv|webm)$/i.test(
      url.pathname,
    );
  } catch {
    return false;
  }
}

export async function canLoadBackgroundImage(
  value: string,
  timeoutMs = 12_000,
): Promise<boolean> {
  if (!isBackgroundUrl(value) || typeof Image === "undefined") return false;
  return await new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (valid: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      if (!valid) image.src = "";
      resolve(valid);
    };
    const timeoutId = setTimeout(() => finish(false), timeoutMs);
    image.referrerPolicy = "no-referrer";
    image.decoding = "async";
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    image.src = value;
  });
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

function normalizeColorOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((option) => {
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
  });
}

function normalizeBackgroundItem(
  value: unknown,
  preset?: BackgroundItem,
): BackgroundItem | null {
  const stored =
    value && typeof value === "object"
      ? (value as Partial<BackgroundItem>)
      : {};
  const url = preset?.url ?? (isBackgroundUrl(stored.url) ? stored.url.trim() : null);
  if (!url) return null;
  const id = preset?.id ?? (
    typeof stored.id === "string" && stored.id.trim()
      ? stored.id.trim()
      : createCustomBackgroundId(url)
  );
  const options = preset
    ? preset.options.map((option) => ({ ...option }))
    : normalizeColorOptions(stored.options);
  const storedLightColor = isBackgroundColor(stored.lightColor)
    ? stored.lightColor.toLowerCase()
    : null;
  const storedDarkColor = isBackgroundColor(stored.darkColor)
    ? stored.darkColor.toLowerCase()
    : null;
  const lightColor = storedLightColor &&
      options.some((option) => option.light === storedLightColor)
    ? storedLightColor
    : (preset?.lightColor ?? options[0]?.light ?? null);
  const darkColor = storedDarkColor &&
      options.some((option) => option.dark === storedDarkColor)
    ? storedDarkColor
    : (preset?.darkColor ?? options[0]?.dark ?? null);
  return {
    id,
    url,
    deletable: !preset,
    fadePosition: clampNumber(
      stored.fadePosition,
      preset?.fadePosition ?? DEFAULT_BACKGROUND_PARAMETERS.fadePosition,
      0,
      100,
    ),
    scale: clampNumber(
      stored.scale,
      preset?.scale ?? DEFAULT_BACKGROUND_PARAMETERS.scale,
      100,
      200,
    ),
    positionX: clampNumber(
      stored.positionX,
      preset?.positionX ?? DEFAULT_BACKGROUND_PARAMETERS.positionX,
      0,
      100,
    ),
    positionY: clampNumber(
      stored.positionY,
      preset?.positionY ?? DEFAULT_BACKGROUND_PARAMETERS.positionY,
      0,
      100,
    ),
    blur: clampNumber(
      stored.blur,
      preset?.blur ?? DEFAULT_BACKGROUND_PARAMETERS.blur,
      0,
      100,
    ),
    options,
    lightColor,
    darkColor,
  };
}

export function normalizeBackgroundConfig(
  value: unknown,
): BackgroundConfig {
  const stored =
    value && typeof value === "object"
      ? (value as Partial<BackgroundConfig>)
      : {};
  const storedItems = Array.isArray(stored.items) ? stored.items : [];
  const items = PRESET_BACKGROUNDS.map((preset) =>
    normalizeBackgroundItem(
      storedItems.find((item) => item?.url === preset.url),
      preset,
    )!,
  );
  const presetUrls = new Set<string>(PRESET_BACKGROUND_URLS);
  const customUrls = new Set<string>();
  for (const value of storedItems) {
    const item = normalizeBackgroundItem(value);
    if (!item || presetUrls.has(item.url) || customUrls.has(item.url)) continue;
    customUrls.add(item.url);
    items.push(item);
  }
  const currentId = typeof stored.current?.id === "string"
    ? stored.current.id
    : null;
  const currentUrl = isBackgroundUrl(stored.current?.url)
    ? stored.current.url.trim()
    : PRESET_BACKGROUND_URLS[0];
  const current = items.find((item) => item.id === currentId) ??
    items.find((item) => item.url === currentUrl) ?? items[0];
  return {
    enabled: stored.enabled === true,
    current: cloneBackgroundItem(current),
    items,
  };
}

function createCustomBackgroundId(url: string) {
  let hash = 2166136261;
  for (let index = 0; index < url.length; index += 1) {
    hash ^= url.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `custom-${(hash >>> 0).toString(36)}`;
}

export function createBackgroundItem(
  url: string,
  palette?: BackgroundColorScheme,
): BackgroundItem {
  return {
    id: createCustomBackgroundId(url),
    url,
    deletable: true,
    ...DEFAULT_BACKGROUND_PARAMETERS,
    options: palette?.options.map((option) => ({ ...option })) ?? [],
    lightColor: palette?.lightColor ?? null,
    darkColor: palette?.darkColor ?? null,
  };
}

export function normalizeBackgroundItems(value: unknown) {
  const stored = Array.isArray(value) ? value : [];
  return normalizeBackgroundConfig({
    enabled: false,
    current: PRESET_BACKGROUNDS[0],
    items: stored,
  }).items;
}

export function resolveBackgroundItem(
  items: BackgroundItem[],
  id: string | null,
) {
  return id ? items.find((item) => item.id === id) ?? null : null;
}
