# Mooogor Start

[简体中文](#简体中文) · [English](#english)

## 简体中文

Mooogor Start 是一个优先采用本地离线实现的浏览器新标签页扩展，提供常用网站、多引擎搜索、书签和历史记录入口。

使用 WXT、Svelte 和 TypeScript 构建。

- [源码仓库](https://gitee.com/antion666/mooogor_new_tab)
- [问题与建议](https://gitee.com/antion666/mooogor_new_tab/issues)
- [贡献指南](CONTRIBUTING.md)
- 联系作者：[antion1212@gmail.com](mailto:antion1212@gmail.com)

### 本地开发

使用 Node.js 与 pnpm。首次安装会自动生成 WXT 所需的类型与配置文件。

```bash
pnpm install
pnpm dev
```

运行后按照终端提示加载开发扩展。Firefox 开发使用 `pnpm dev:firefox`。

### 检查与构建

```bash
pnpm check
pnpm build
pnpm zip
```

Chrome 构建输出位于 `.output/chrome-mv3`，可通过浏览器扩展管理页面的“加载已解压的扩展程序”加载。Firefox 使用 `pnpm build:firefox`、`pnpm zip:firefox`，输出目录以 WXT 的构建日志为准。

### 开源致谢

感谢 WXT、Svelte、Lucide、Dexie.js、svelte-dnd-action、Color Thief、QR Code Styling、validator.js、webext-bridge 及其依赖的维护者。

“关于”页面提供主要项目的链接和许可证标识。[第三方声明](public/third-party-notices.txt)保留依赖包中的许可证全文、版权信息及 NOTICE。构建和打包时会根据本地安装的依赖自动更新，也可以运行 `pnpm licenses:generate` 手动更新。更新依赖时请一并提交声明文件的变化。

### 许可证

本仓库目前尚未声明项目自身的许可证。第三方依赖的许可证仅适用于相应依赖，不代表 Mooogor Start 的授权条款。网站标志、商标及其他第三方资源的权利归其各自权利人所有。

## English

Mooogor Start is a fast, offline-first browser new tab extension for common sites, multi-engine search, bookmarks, and history.

Built with WXT, Svelte, and TypeScript.

- [Source code](https://gitee.com/antion666/mooogor_new_tab)
- [Issues & suggestions](https://gitee.com/antion666/mooogor_new_tab/issues)
- [Contributing](CONTRIBUTING.md)
- Contact: [antion1212@gmail.com](mailto:antion1212@gmail.com)

### Development

Install Node.js and pnpm. The initial dependency installation automatically generates the types and configuration required by WXT.

```bash
pnpm install
pnpm dev
```

Follow the terminal instructions to load the development extension. For Firefox development, use `pnpm dev:firefox`.

### Check & build

```bash
pnpm check
pnpm build
pnpm zip
```

The Chrome build is written to `.output/chrome-mv3`. Open your browser's extension management page and choose “Load unpacked” to load that directory. For Firefox, use `pnpm build:firefox` and `pnpm zip:firefox`; refer to the WXT build logs for the output location.

### Acknowledgements

Thanks to the maintainers of WXT, Svelte, Lucide, Dexie.js, svelte-dnd-action, Color Thief, QR Code Styling, validator.js, webext-bridge, and their dependencies.

The About page provides links and license identifiers for the main projects. [Third-party notices](public/third-party-notices.txt) preserve the license texts, copyright information, and NOTICE files included in dependency packages. Notices are automatically regenerated from installed dependencies when building or packaging the extension. You can also run `pnpm licenses:generate` manually. Commit any notice changes when updating dependencies.

### License

A license for Mooogor Start itself has not yet been declared. Third-party licenses apply only to their respective dependencies and do not grant rights to Mooogor Start itself. Website logos, trademarks, and other third-party assets belong to their respective owners.
