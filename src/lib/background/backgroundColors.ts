import { getPalette } from "colorthief";
import {
  createBackgroundColorScheme,
  type BackgroundColorScheme,
} from "./background";

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.src = "";
      reject(new Error("Image loading timed out"));
    }, 15_000);
    const finish = () => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
    };
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.onload = () => {
      finish();
      resolve(image);
    };
    image.onerror = () => {
      finish();
      reject(new Error("Image could not be loaded"));
    };
    image.src = url;
  });
}

function createAnalysisCanvas(image: HTMLImageElement) {
  const maxSize = 320;
  const scale = Math.min(
    1,
    maxSize / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function parseHexColor(hex: string) {
  const [red, green, blue] = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16) / 255,
  );
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { hue: 0, saturation: 0, lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = max === red
    ? 60 * (((green - blue) / delta) % 6)
    : max === green
      ? 60 * ((blue - red) / delta + 2)
      : 60 * ((red - green) / delta + 4);
  if (hue < 0) hue += 360;
  return { hue, saturation, lightness };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  if (saturation === 0) {
    const channel = Math.round(lightness * 255).toString(16).padStart(2, "0");
    return `#${channel}${channel}${channel}`;
  }
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [redPrime, greenPrime, bluePrime] = segment < 1 ? [chroma, secondary, 0]
    : segment < 2 ? [secondary, chroma, 0]
      : segment < 3 ? [0, chroma, secondary]
        : segment < 4 ? [0, secondary, chroma]
          : segment < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  const match = lightness - chroma / 2;
  return `#${[redPrime, greenPrime, bluePrime].map((value) =>
    Math.round((value + match) * 255).toString(16).padStart(2, "0"),
  ).join("")}`;
}

function hueTowardBlue(hue: number) {
  const blueHue = 240;
  const hueDistance = ((blueHue - hue + 540) % 360) - 180;
  return (hue + hueDistance * 0.08 + 360) % 360;
}

export function deriveAlternateColor(hex: string) {
  const { hue, saturation, lightness } = parseHexColor(hex);
  return hslToHex(hueTowardBlue(hue), saturation, lightness);
}

export function createWebsiteCardThemeColors(hex: string) {
  const { hue, saturation, lightness } = parseHexColor(hex);
  const lightSaturation = Math.min(0.42, saturation * 0.55);
  const darkSaturation = Math.min(0.32, saturation * 0.42);
  const lightLightness = 0.82 + lightness * 0.08;
  const darkLightness = 0.18 + lightness * 0.1;
  return {
    light: hslToHex(hue, lightSaturation, lightLightness),
    lightAlt: hslToHex(hueTowardBlue(hue), lightSaturation, lightLightness),
    dark: hslToHex(hue, darkSaturation, darkLightness),
    darkAlt: hslToHex(hueTowardBlue(hue), darkSaturation, darkLightness),
  };
}

/** Extracts the second most populous opaque color and derives a gradient color. */
export async function extractWebsiteCardColors(url: string) {
  const image = await loadImage(url);
  const palette = await getPalette(createAnalysisCanvas(image), {
    colorCount: 8,
    quality: 4,
    alphaThreshold: 1,
  });
  const colors = [...new Set((palette ?? [])
    .sort((a, b) => b.population - a.population)
    .map((color) => color.hex().toLowerCase()))];
  if (!colors.length) throw new Error("No colors found");
  const backgroundColor = colors[1] ?? colors[0];
  const backgroundColorAlt = deriveAlternateColor(backgroundColor);
  return { backgroundColor, backgroundColorAlt };
}

export async function extractBackgroundColorScheme(
  url: string,
): Promise<BackgroundColorScheme> {
  const image = await loadImage(url);
  const palette = await getPalette(createAnalysisCanvas(image), {
    colorCount: 7,
    quality: 5,
  });
  const colors = (palette ?? []).sort(
    (a, b) => b.population - a.population,
  );
  const bases = [...new Set(colors.map((color) => color.hex().toLowerCase()))]
    .slice(0, 7);
  if (!bases.length) throw new Error("No colors found");
  return createBackgroundColorScheme(bases);
}
