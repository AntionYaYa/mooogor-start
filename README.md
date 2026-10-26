# Mooogor Start

[English](#english) · [简体中文](#简体中文)

## English

A new tab extension designed for Chrome. Mooogor Start brings common sites, multi-engine search, bookmarks, and history into a simple entry point so you can get started faster.

### Why publish the source

Mooogor Start focuses on everyday interaction and usability. Publishing the source lets you see how it works, what data it accesses, and why it needs its permissions. You can inspect it yourself or ask someone you trust to review it.

Public source provides a way to inspect the extension; it does not mean an independent security audit has been completed.

- [Source code](https://gitee.com/antion666/mooogor_new_tab)
- [Privacy & permissions](#privacy--permissions)
- [Issues & suggestions](https://gitee.com/antion666/mooogor_new_tab/issues)
- Author: Antion
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

The current code has no developer-operated data collection endpoint, advertising SDK, or usage analytics SDK. Disabling sync stops subsequent extension configuration sync processing but does not delete existing sync copies. Chrome manages its own bookmark and history sync separately. See [Privacy & permissions](#privacy--permissions) below for controls and access scope.

### Privacy & permissions

| Permission or access | Purpose |
| --- | --- |
| `storage`, `favicon` | Save configuration and recent keywords, sync selected settings, and display site icons |
| `activeTab` | Read the current page URL, title, and icon after a toolbar click, to save sites, configure engines, or generate QR codes locally |
| Optional `bookmarks` | Read, search, create, edit, move, and delete browser bookmarks |
| Optional `history` | Read/search history, suggest frequent sites, and perform user-selected deletions |
| Optional `<all_urls>` | Requested by the current website screenshot implementation, which opens and captures the target page |
| Static scripts on HTTP/HTTPS pages | Read the current URL to match search engines and relevant icons, read icon links, and show the engine-switching panel on matching search results |

Static page scripts do not wait for screenshot permission. Disabling the search panel does not disable icon processing. Declining bookmark, history, or screenshot permissions prevents the corresponding features; ordinary search and common sites remain available. Review or restrict site access in your browser's extension management page.

Online background previews and display contact their image host (built-in images use Unsplash); icon loading contacts configured or page-specified hosts. Searches send keywords to the selected service. These services may receive your IP address, request URL, and ordinary request information. Chrome or Edge handles browser sync through its own service and account settings. Developer-operated data collection and browser/third-party services are distinct.

Keyword recording and the in-page search panel are enabled by default. Clear saved keywords per category in the search area; remove screenshots through the site's menu, and delete sites, engines, or backgrounds in settings. Disabling recording, backgrounds, or sync does not delete existing data. The sync switch is itself stored in sync storage and may affect other devices; use “Delete sync copy” in Data Sync settings to remove saved configuration from browser sync storage and turn sync off while keeping local data. A small sync-off marker remains to prevent automatic re-upload. Other devices receive the change through browser sync, which may be delayed when offline. Re-enabling sync uploads the current local configuration. Local configuration and caches persist until removed, extension data is cleared, or the extension is uninstalled. Uninstalling does not delete browser bookmarks/history or guarantee removal of cloud sync copies; use the browser/account sync-data controls for those copies.

Screenshots may contain personal information displayed by the target site. A history suggestion you save as a common site becomes configuration and may sync. Browser bookmark/history sync is managed separately. Source, feedback, and support links open external services; emailing the author shares the content you choose to send. Contact Antion at [antion1212@gmail.com](mailto:antion1212@gmail.com) for privacy or security concerns.

These statements describe the current repository code, not an audit of installed store packages. The existing [published privacy policy](https://florentine-creature-558.notion.site/Mooogor-Start-3185761c268d80d48e65e5e7b4b4dafd) still needs updating to reflect this scope.

### Install & use

[Install for Chrome](https://chromewebstore.google.com/detail/bnmcpafaakmkemekghlbfedgmkbegogf) · [Install for Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/fkccffpepgicdhnnneghopmmmdedoiel)

Official listings are available for Chrome and Microsoft Edge.

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

Chrome builds are written to `.output/chrome-mv3`; see the build logs for archive locations. For code changes, explain the problem and verification in your pull request; update all three interface languages when changing text.

### Third-party projects & licensing

Thanks to the maintainers of WXT, Svelte, Lucide, Dexie.js, svelte-dnd-action, Color Thief, QR Code Styling, validator.js, webext-bridge, and their dependencies.

[Third-party notices](public/third-party-notices.txt) preserve license and copyright texts supplied by installed packages. Packages without a separate license text are identified in the file. Notices are regenerated during builds and packaging, or manually with `pnpm licenses:generate`.

Mooogor Start is licensed under the [MIT License](LICENSE). Copyright (c) 2026 Antion. Dependency licenses apply only to their respective packages. Website logos, trademarks, and other third-party assets belong to their respective owners.

## 简体中文

一个为 Chrome 设计的新标签页扩展。把常用网站、多引擎搜索、书签和历史记录放在一个简单、直接的入口里，让你更快开始做事。

### 为什么公开源码

Mooogor Start 的重点是日常使用中的交互体验。公开源码，是希望你能够了解它如何工作、访问哪些数据，以及为什么需要这些权限。有疑问时，可以自己检查，也可以请信任的人帮忙查看。

源码公开提供了检查依据，不代表已经通过独立安全审计。

- [查看源码](https://gitee.com/antion666/mooogor_new_tab)
- [隐私与权限](#隐私与权限)
- [问题与建议](https://gitee.com/antion666/mooogor_new_tab/issues)
- 作者：Antion
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

当前代码未接入开发者自建的数据接收服务、广告或使用统计 SDK。关闭同步会停止扩展配置的后续同步处理，但不会删除已有同步副本。浏览器本身的书签、历史同步由 Chrome 管理。访问范围和控制方式见下方[隐私与权限](#隐私与权限)。

### 隐私与权限

| 权限或访问范围 | 用途 |
| --- | --- |
| `storage`、`favicon` | 保存配置与最近关键词、同步部分设置、展示网站图标 |
| `activeTab` | 点击工具栏按钮后读取当前页网址、标题和图标，用于保存网站、配置引擎或本地生成二维码 |
| 可选 `bookmarks` | 读取、搜索、新增、编辑、移动和删除浏览器书签 |
| 可选 `history` | 读取、搜索历史、推荐常访问网站，以及执行用户选择的删除操作 |
| 可选 `<all_urls>` | 当前网站截图功能会申请，用于打开并截取目标页面 |
| HTTP/HTTPS 网页静态脚本 | 读取当前网址以匹配搜索引擎和相关图标，读取图标链接，在匹配的搜索结果页显示切换引擎面板 |

静态网页脚本不等待截图授权。关闭搜索面板不会停用图标处理。拒绝书签、历史或截图权限会阻止对应功能，普通搜索和常用网站仍可使用。可在浏览器扩展管理页查看并限制网站访问。

在线背景的预览和展示会访问图片服务（内置图片来自 Unsplash），图标请求会访问配置或网页指定的地址，搜索会将关键词发送至所选服务。这些服务可能获得 IP 地址、请求网址及常规请求信息。浏览器同步由 Chrome 或 Edge 自身的服务及账号设置控制，需要与开发者自建的数据接收服务区分。

关键词记录和网页搜索面板默认开启。最近关键词可在搜索区按分类清除，截图可通过网站菜单移除，网站、引擎和背景可在设置中删除。关闭记录、背景或同步不等于删除已有数据。同步开关本身也会同步，可能影响其他设备；可在数据同步设置中使用“删除同步副本”，删除浏览器同步存储中的配置并关闭同步，同时保留本地数据。同步存储中会保留少量关闭状态信息，防止自动重新上传。其他设备通过浏览器同步接收变更，离线时可能延后收到；重新开启同步会上传本机当前配置。本地配置和缓存会保留到你移除相关数据、清理扩展数据或卸载。卸载不删除浏览器书签和历史，也不保证清除云端同步副本；同步副本需通过浏览器或账号的同步数据管理方式处理。

截图可能包含目标网站上显示的个人信息；从历史推荐中保存为常用网站的条目会成为配置，可能参与同步。浏览器自身的书签、历史同步单独管理。源码、反馈、支持链接会打开相应外部服务；主动发邮件会向作者提供你发送的内容。隐私或安全问题请联系 Antion：[antion1212@gmail.com](mailto:antion1212@gmail.com)。

以上说明对应当前仓库代码，不代表已审计商店安装包。现有[线上隐私政策](https://florentine-creature-558.notion.site/Mooogor-Start-3185761c268d80d48e65e5e7b4b4dafd)仍需更新以覆盖上述范围。

### 安装与使用

[Chrome 应用商店安装](https://chromewebstore.google.com/detail/bnmcpafaakmkemekghlbfedgmkbegogf) · [Microsoft Edge 加载项安装](https://microsoftedge.microsoft.com/addons/detail/fkccffpepgicdhnnneghopmmmdedoiel)

已在 Chrome 和 Microsoft Edge 的官方商店上架。

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

Chrome 构建目录为 `.output/chrome-mv3`，压缩包位置见构建日志。提交代码改进时，请说明问题和验证结果；界面文案同步维护三种语言。

### 第三方项目与授权

感谢 WXT、Svelte、Lucide、Dexie.js、svelte-dnd-action、Color Thief、QR Code Styling、validator.js、webext-bridge 及其依赖的维护者。

[第三方声明](public/third-party-notices.txt)保留已安装依赖提供的许可证与版权文本；部分上游包未附独立许可全文，文件中已注明。构建、打包时自动更新，也可运行 `pnpm licenses:generate`。

Mooogor Start 采用 [MIT 许可证](LICENSE)，版权署名为 Copyright (c) 2026 Antion。第三方依赖的许可证仅适用于相应依赖；网站标志、商标及其他第三方资源归各自权利人所有。
