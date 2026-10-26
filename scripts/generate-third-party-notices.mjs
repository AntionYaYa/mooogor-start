import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const report = JSON.parse(execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], {
  cwd: root,
  encoding: 'utf8',
}));
const packages = new Map(Object.values(report).flat().map(pkg => [pkg.name, pkg.paths[0]]));
// These development dependencies also provide code used by the extension.
for (const name of ['wxt', 'svelte', 'svelte-dnd-action']) {
  packages.set(name, resolve(root, 'node_modules', name));
}

const notices = [
  'Mooogor Start — Third-party notices',
  'Generated with pnpm licenses:generate from installed dependencies.',
  'Includes production dependencies and the WXT, Svelte and drag-and-drop frameworks.',
  'These licenses apply to the named third-party packages, not to Mooogor Start itself.',
];
for (const [name, directory] of [...packages].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
  const pkg = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
  const files = readdirSync(directory).filter(file => /^(licen[sc]e|copying|notice)(\.|$)/i.test(file)).sort();
  notices.push('\n' + '='.repeat(72), `${name} ${pkg.version}`, `License: ${pkg.license}`, pkg.homepage ?? '');
  if (!files.length) {
    // Some upstream npm distributions only include a license identifier.
    // Preserve that declaration without inventing copyright or license text.
    const author = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name;
    notices.push(`Author: ${author ?? 'See upstream project'}`, 'The installed package does not include a separate license text. See the upstream project above.');
  }
  for (const file of files) {
    notices.push(`\n--- ${file} ---\n`, readFileSync(resolve(directory, file), 'utf8').trim());
  }
}
writeFileSync(resolve(root, 'public/third-party-notices.txt'), notices.join('\n') + '\n');
console.log(`Generated notices for ${packages.size} packages.`);
