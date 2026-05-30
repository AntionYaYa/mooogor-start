import { defineConfig } from 'wxt';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string };

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'zh_CN',
    version,
    version_name: `V${version}`,
    optional_permissions: [
      "bookmarks",
      "history"
    ],
    permissions: [
      "activeTab",
      "favicon",
      "storage",
    ],
  },
});
