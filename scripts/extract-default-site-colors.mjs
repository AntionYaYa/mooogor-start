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

function distance(left, right) {
  const a = left.array();
  const b = right.array();
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
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
      region: { x: 0.19, y: 0.19, width: 0.62, height: 0.62 },
    });
    if (!palette?.length) continue;
    const main = palette[0];
    const nearby = palette.slice(1).sort((a, b) => distance(main, a) - distance(main, b))[0] ?? main;
    site.backgroundColor = main.hex().toLowerCase();
    site.backgroundColorAlt = nearby.hex().toLowerCase();
  }
}

if (process.argv.includes("--write")) {
  writeFileSync(defaultsPath, `${JSON.stringify(defaults, null, 2)}\n`);
} else {
  process.stdout.write(`${JSON.stringify(defaults, null, 2)}\n`);
}
