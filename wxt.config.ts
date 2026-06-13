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
    ],
  },
  vite: () => ({
    esbuild: {
      // 1. 强制将打包产物中所有的特殊符号、CSS 内联字符、Svelte混淆标志全部转义为 \uXXXX 格式。
      // 产物全由 ASCII 安全字符组成，100% 绕过 Chrome 针对 content_scripts 的严苛格式审计。
      charset: 'ascii',
      // 2. 移除所有第三方依赖包自带的 License 注释，防止注释中包含坏字节。
      legalComments: 'none',
    },
    build: {
      // 3. 约束混淆器行为，确保生产压缩（Minify）时不会反向还原特殊多字节符号。
      minify: 'esbuild',
      cssMinify: 'esbuild',
    }
  }),
});
