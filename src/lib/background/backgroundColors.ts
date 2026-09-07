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

function createCenterAnalysisCanvas(image: HTMLImageElement) {
  const sourceSize = Math.max(
    1,
    Math.round(Math.min(image.naturalWidth, image.naturalHeight) * 0.62),
  );
  const sourceX = Math.max(0, Math.round((image.naturalWidth - sourceSize) / 2));
  const sourceY = Math.max(0, Math.round((image.naturalHeight - sourceSize) / 2));
  const outputSize = Math.min(280, sourceSize);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    outputSize,
    outputSize,
  );
  return canvas;
}

function colorDistance(a: string, b: string) {
  const channels = (hex: string) => [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  );
  const left = channels(a);
  const right = channels(b);
  return Math.sqrt(left.reduce((sum, value, index) =>
    sum + (value - right[index]) ** 2, 0,
  ));
}

/** Extracts a dominant center color and its closest palette neighbor for site cards. */
export async function extractWebsiteCardColors(url: string) {
  const image = await loadImage(url);
  const palette = await getPalette(createCenterAnalysisCanvas(image), {
    colorCount: 8,
    quality: 4,
  });
  const colors = [...new Set((palette ?? [])
    .sort((a, b) => b.population - a.population)
    .map((color) => color.hex().toLowerCase()))];
  if (!colors.length) throw new Error("No colors found");
  const backgroundColor = colors[0];
  const backgroundColorAlt = colors.slice(1).sort(
    (a, b) => colorDistance(backgroundColor, a) - colorDistance(backgroundColor, b),
  )[0] ?? backgroundColor;
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
