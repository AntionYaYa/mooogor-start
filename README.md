# Mooogor Start

[English](#english) · [简体中文](#简体中文)

## English

A new tab extension designed for Chrome. Mooogor Start brings common sites, multi-engine search, bookmarks, and history into a simple entry point so you can get started faster.

### Why publish the source

Mooogor Start focuses on everyday interaction and usability. Publishing the source lets you see how it works, what data it accesses, and why it needs its permissions. You can inspect it yourself or ask someone you trust to review it.

Public source provides a way to inspect the extension; it does not mean an independent security audit has been completed.

- [Source code](https://gitee.com/antion666/mooogor_new_tab)
- [Privacy & data handling](PRIVACY.md#english)
- [Permission purposes](PERMISSIONS.md#english)
- [Issues & suggestions](https://gitee.com/antion666/mooogor_new_tab/issues)
- Contact: [antion1212@gmail.com](mailto:antion1212@gmail.com)

### Where your data goes

| Feature or data | Handling |
| --- | --- |
| Common sites, engines, categories, backgrounds, and preferences | Stored locally and also written to Chrome sync storage when extension sync is enabled |
| Cross-device sync | Enabled by default in the current version; cross-device transfer depends on Chrome account and sync settings; can be disabled in extension settings |
| Bookmarks and browsing history | Accessed through browser APIs after permission is granted; edits and deletions you perform affect the browser's actual records; not copied wholesale into the extension's sync payload |
| Recent search keywords | Stored locally when recording is enabled; can be cleared; excluded from extension sync |
| Website screenshots and icon cache | Stored locally; screenshot images and cached icons are excluded from extension sync |
| Searches, online backgrounds, and website icons | Contact the selected search service, image host, or icon host; built-in online backgrounds use Unsplash |

The current code has no developer-operated data collection endpoint, advertising SDK, or usage analytics SDK. Disabling sync stops subsequent extension configuration sync processing but does not delete existing sync copies. Chrome manages its own bookmark and history sync separately. See the [privacy information](PRIVACY.md#english) for scope, defaults, and deletion options.

### Install & use

This project targets Chrome. Open a new tab to use common sites and search. Bookmark and history features require their respective permissions.

To install from source:

1. Install Node.js and pnpm, then download or clone this repository.
2. Run `pnpm install`, followed by `pnpm build`, in the project directory.
3. Open `chrome://extensions` in Chrome and enable “Developer mode”.
4. Click “Load unpacked” and select `.output/chrome-mv3`.

Source installations require manual rebuilds and updates. Firefox build commands remain in the repository, but compatibility is not guaranteed here.

### Feedback

You do not need coding knowledge to report awkward interactions, suggest improvements, or report bugs. Include the extension version, Chrome version, and reproduction steps. Remove personal information from screenshots and logs. Contact the author by email for security or privacy concerns.

### Development & build

Built with WXT, Svelte, and TypeScript. Installing dependencies also generates WXT's required files.

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
pnpm zip
```

Chrome builds are written to `.output/chrome-mv3`; see the build logs for archive locations. See [Contributing](CONTRIBUTING.md) if you want to improve the code.

### Third-party projects & licensing

Thanks to the maintainers of WXT, Svelte, Lucide, Dexie.js, svelte-dnd-action, Color Thief, QR Code Styling, validator.js, webext-bridge, and their dependencies.

[Third-party notices](public/third-party-notices.txt) preserve license and copyright texts supplied by installed packages. Packages without a separate license text are identified in the file. Notices are regenerated during builds and packaging, or manually with `pnpm licenses:generate`.

A license for Mooogor Start itself has not yet been declared. Dependency licenses apply only to their respective packages. Website logos, trademarks, and other third-party assets belong to their respective owners.

## 简体中文

一个为 Chrome 设计的新标签页扩展。把常用网站、多引擎搜索、书签和历史记录放在一个简单、直接的入口里，让你更快开始做事。

### 为什么公开源码

Mooogor Start 的重点是日常使用中的交互体验。公开源码，是希望你能够了解它如何工作、访问哪些数据，以及为什么需要这些权限。有疑问时，可以自己检查，也可以请信任的人帮忙查看。

源码公开提供了检查依据，不代表已经通过独立安全审计。

- [查看源码](https://gitee.com/antion666/mooogor_new_tab)
- [隐私与数据说明](PRIVACY.md)
- [权限用途](PERMISSIONS.md)
- [问题与建议](https://gitee.com/antion666/mooogor_new_tab/issues)
- 联系作者：[antion1212@gmail.com](mailto:antion1212@gmail.com)

### 数据会去哪里

| 功能或数据 | 处理方式 |
| --- | --- |
| 常用网站、搜索引擎、分类、背景与偏好设置 | 保存在浏览器本地；启用跨设备同步时，也写入 Chrome 同步存储 |
| 跨设备同步 | 当前版本默认开启；实际跨设备传输取决于 Chrome 的账号和同步设置，可在扩展设置中关闭 |
| 书签与历史记录 | 授权后通过浏览器接口读取；你执行的编辑、删除操作会修改浏览器中的原数据；扩展不将其整库写入自己的同步数据 |
| 最近搜索关键词 | 开启记录时保存在本地，可清除；不包含在扩展的同步数据中 |
| 网站截图与图标缓存 | 保存在本地；截图图片和图标缓存不包含在扩展的同步数据中 |
| 搜索、在线背景和网站图标 | 会访问所选搜索服务、图片或图标地址；内置在线背景来自 Unsplash |

当前代码未接入开发者自建的数据接收服务、广告或使用统计 SDK。关闭同步会停止扩展配置的后续同步处理，但不会删除已有同步副本。浏览器本身的书签、历史同步由 Chrome 管理。完整范围、默认行为和删除方式见[隐私说明](PRIVACY.md)。

### 安装与使用

本项目面向 Chrome。获得扩展后，打开新标签页即可使用常用网站与搜索；书签、历史记录需要相应授权。

如需从源码安装：

1. 安装 Node.js 与 pnpm，下载或克隆本仓库。
2. 在项目目录运行 `pnpm install`，然后运行 `pnpm build`。
3. 在 Chrome 打开 `chrome://extensions`，开启“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择 `.output/chrome-mv3`。

从源码加载的版本需自行重新构建、更新。仓库保留了 Firefox 构建命令，但本文不承诺其兼容性。

### 问题反馈

欢迎反馈不顺手的交互、功能建议或错误，无需懂代码。请附上扩展版本、Chrome 版本、复现步骤；截图和日志中请隐藏个人信息。安全或隐私问题请通过邮件联系作者。

### 开发与构建

使用 WXT、Svelte 和 TypeScript 构建。首次安装依赖会自动生成 WXT 所需文件。

```bash
pnpm install
pnpm dev
pnpm check
pnpm build
pnpm zip
```

Chrome 构建目录为 `.output/chrome-mv3`，压缩包位置见构建日志。[贡献指南](CONTRIBUTING.md)供希望参与代码改进的人参考。

### 第三方项目与授权

感谢 WXT、Svelte、Lucide、Dexie.js、svelte-dnd-action、Color Thief、QR Code Styling、validator.js、webext-bridge 及其依赖的维护者。

[第三方声明](public/third-party-notices.txt)保留已安装依赖提供的许可证与版权文本；部分上游包未附独立许可全文，文件中已注明。构建、打包时自动更新，也可运行 `pnpm licenses:generate`。

项目自身尚未声明许可证。第三方依赖的许可证仅适用于相应依赖；网站标志、商标及其他第三方资源归各自权利人所有。
