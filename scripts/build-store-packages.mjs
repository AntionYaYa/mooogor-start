import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const chromeBaseline = "87dbd5e";
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;

function run(command, args, options = {}) {
  execFileSync(command, args, { cwd: root, stdio: "inherit", ...options });
}

function zipExtension(source, destination) {
  run("zip", ["-qr", destination, "."], { cwd: source });
}

function buildEdgePackage() {
  run("pnpm", ["build"]);
  zipExtension(
    join(root, ".output", "chrome-mv3"),
    join(dist, `mooogor-edge-${version}.zip`),
  );
}

function buildChromePackage() {
  const tempRoot = mkdtempSync(join(tmpdir(), "mooogor-chrome-"));
  const archive = join(tempRoot, "source.tar");
  try {
    execFileSync("git", ["archive", "--format=tar", chromeBaseline, "-o", archive], {
      cwd: root,
      stdio: "inherit",
    });
    execFileSync("tar", ["-xf", archive], { cwd: tempRoot, stdio: "inherit" });

    const packagePath = join(tempRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    packageJson.version = version;
    writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
    symlinkSync(join(root, "node_modules"), join(tempRoot, "node_modules"), "dir");

    execFileSync("pnpm", ["exec", "wxt", "build"], {
      cwd: tempRoot,
      stdio: "inherit",
    });
    zipExtension(
      join(tempRoot, ".output", "chrome-mv3"),
      join(dist, `mooogor-chrome-${version}.zip`),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
buildEdgePackage();
buildChromePackage();
console.log(`Created ${basename(join(dist, `mooogor-edge-${version}.zip`))}`);
console.log(`Created ${basename(join(dist, `mooogor-chrome-${version}.zip`))}`);
