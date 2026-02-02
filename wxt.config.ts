import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'zh_CN',
    version: '0.0.0',
    version_name: 'V0.0.0',
    chrome_url_overrides: {
      page_to_override: 'entrypoints/newtab/index.html',
    },
    optional_permissions: [
      "bookmarks",
      "history"
    ],
    permissions: [
      "favicon",
    ],
  },
});
