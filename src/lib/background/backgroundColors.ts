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
