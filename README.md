# Mooogor Start

Mooogor Start 是一个优先采用本地离线实现的浏览器新标签页扩展，提供常用网站、多引擎搜索、书签和历史记录入口。

A fast, offline-first browser new tab extension for common sites, multi-engine search, bookmarks, and history. Built with WXT, Svelte and TypeScript.

- [源码仓库 / Source](https://gitee.com/antion666/mooogor_new_tab)
- [问题与建议 / Issues](https://gitee.com/antion666/mooogor_new_tab/issues)
- [贡献指南 / Contributing](CONTRIBUTING.md)
- 联系作者 / Contact: [antion1212@gmail.com](mailto:antion1212@gmail.com)

## 本地开发 / Development

使用 Node.js 与 pnpm。首次安装会自动生成 WXT 所需的类型与配置文件。

```bash
pnpm install
pnpm dev
```

运行后按照终端提示加载开发扩展。Firefox 开发使用 `pnpm dev:firefox`。

## 检查与构建 / Check & build

```bash
pnpm check
pnpm build
pnpm zip
```

Chrome 构建输出位于 `.output/chrome-mv3`，可通过浏览器扩展管理页面的“加载已解压的扩展程序”加载。Firefox 使用 `pnpm build:firefox`、`pnpm zip:firefox`，输出目录以 WXT 的构建日志为准。

## 开源致谢 / Acknowledgements

感谢 WXT、Svelte、Lucide、Dexie.js、svelte-dnd-action、Color Thief、QR Code Styling、validator.js、webext-bridge 及其依赖的维护者。

“关于”页面提供主要项目的链接和许可证标识。[第三方声明](public/third-party-notices.txt)保留依赖包中的许可证全文、版权信息及 NOTICE。构建和打包时会根据本地安装的依赖自动更新，也可以运行 `pnpm licenses:generate` 手动更新。更新依赖时请一并提交声明文件的变化。

## 许可证 / License

本仓库目前尚未声明项目自身的许可证。第三方依赖的许可证仅适用于相应依赖，不代表 Mooogor Start 的授权条款。网站标志、商标及其他第三方资源的权利归其各自权利人所有。

A license for Mooogor Start itself has not yet been declared. Third-party licenses apply to their respective dependencies; trademarks and other third-party assets belong to their respective owners.
