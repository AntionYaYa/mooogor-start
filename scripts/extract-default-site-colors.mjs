import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { configure, getPalette } from "colorthief";
import { createNodeLoader } from "colorthief/internals";

const root = new URL("../", import.meta.url);
const defaultsPath = new URL("src/lib/DB/defaultWebSites.json", root);
const logoMapPath = new URL("src/lib/DB/websiteLogos.ts", root);

function decodeBmp(buffer) {
  const pixelOffset = buffer.readUInt32LE(10);
  const width = buffer.readInt32LE(18);
  const signedHeight = buffer.readInt32LE(22);
  const height = Math.abs(signedHeight);
  if (buffer.readUInt16LE(28) !== 24 || buffer.readUInt32LE(30) !== 0) {
    throw new Error("Expected an uncompressed 24-bit BMP");
  }
  const rowSize = Math.ceil(width * 3 / 4) * 4;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = signedHeight < 0 ? y : height - y - 1;
    for (let x = 0; x < width; x += 1) {
      const source = pixelOffset + sourceY * rowSize + x * 3;
      const target = (y * width + x) * 4;
      data[target] = buffer[source + 2];
      data[target + 1] = buffer[source + 1];
      data[target + 2] = buffer[source];
      data[target + 3] = 255;
    }
  }
  return { data, width, height };
}

configure({
  loader: createNodeLoader({
    decoder: async (source) => {
      if (typeof source !== "string") throw new Error("Expected an image path");
      const bmpPath = join(tmpdir(), `mooogor-palette-${randomUUID()}.bmp`);
      try {
        execFileSync("sips", ["-s", "format", "bmp", source, "--out", bmpPath], {
          stdio: "ignore",
        });
        return decodeBmp(readFileSync(bmpPath));
      } finally {
        try { unlinkSync(bmpPath); } catch {}
      }
    },
  }),
});

function deriveAlternateColor(hex) {
  const [red, green, blue] = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16) / 255,
  );
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return hex;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = max === red
    ? 60 * (((green - blue) / delta) % 6)
    : max === green
      ? 60 * ((blue - red) / delta + 2)
      : 60 * ((red - green) / delta + 4);
  if (hue < 0) hue += 360;
  const blueHue = 240;
  const hueDistance = ((blueHue - hue + 540) % 360) - 180;
  hue = (hue + hueDistance * 0.08 + 360) % 360;
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

const logoSource = readFileSync(logoMapPath, "utf8");
const logos = new Map(
  [...logoSource.matchAll(/"([^"]+)": logo\("([^"]+)"\)/g)]
    .map((match) => [match[1], match[2]]),
);
const defaults = JSON.parse(readFileSync(defaultsPath, "utf8"));

for (const sites of Object.values(defaults)) {
  for (const site of sites) {
    const fileName = logos.get(new URL(site.url).hostname.toLowerCase());
    if (!fileName) continue;
    const palette = await getPalette(new URL(`public/logos/${fileName}`, root).pathname, {
      colorCount: 8,
      quality: 4,
      alphaThreshold: 1,
    });
    if (!palette?.length) continue;
    const colors = [...new Set(palette
      .sort((a, b) => b.population - a.population)
      .map((color) => color.hex().toLowerCase()))];
    const backgroundColor = colors[1] ?? colors[0];
    site.backgroundColor = backgroundColor;
    site.backgroundColorAlt = deriveAlternateColor(backgroundColor);
  }
}

if (process.argv.includes("--write")) {
  writeFileSync(defaultsPath, `${JSON.stringify(defaults, null, 2)}\n`);
} else {
  process.stdout.write(`${JSON.stringify(defaults, null, 2)}\n`);
}
