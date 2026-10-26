# 权限用途 / Permission purposes

[English](#english) · [简体中文](#简体中文)

## English

This document describes the current Chrome manifest and code. Permissions provide capabilities; see [Privacy](PRIVACY.md#english) for actual data handling.

| Permission or access scope | Purpose | Declaration or request |
| --- | --- | --- |
| `storage` | Store configuration, preferences, recent keywords, and sync state; sync selected configuration through Chrome sync storage | Declared at installation |
| `favicon` | Display website icons through Chrome's favicon interface | Declared at installation |
| `activeTab` | Read the current page URL, title, and icon after a toolbar click, to save sites, configure engines, and generate a QR code | Declared at installation; temporary access follows user interaction |
| `bookmarks` | Display, search, create, edit, move, and delete browser bookmarks; also match bookmark sites for icon caching | Optional; requested when related features are used |
| `history` | Display/search history, suggest frequently visited sites, and perform user-selected deletions | Optional; requested when related features are used |
| Optional host permission `<all_urls>` | Website screenshots open a target page and capture its visible area; the current implementation requests access to all sites for this operation | Requested when using website screenshots |
| Content script matches `http://*/*`, `https://*/*` | Match search result pages, show the engine-switching panel, and read/cache relevant website icons on ordinary web pages | Static manifest declaration; scripts do not wait for screenshot permission |

The optional `<all_urls>` permission and static content scripts are separate declarations. Chrome determines installation prompts and effective site access. It would be inaccurate to describe all website access as requested only on demand.

Declining bookmark or history permission prevents the corresponding features from working; common sites and ordinary search remain available. Declining screenshot host access prevents that screenshot operation.

Review permissions and site access in Chrome's extension management page and restrict access using the controls the browser provides. Disabling the engine-switching panel does not revoke site access or disable icon scripts. Restricting site access may affect icon caching and in-page panels.

## 简体中文

以下说明对应当前 Chrome 扩展配置及代码。权限提供访问能力，实际的数据处理范围见[隐私说明](PRIVACY.md)。

| 权限或访问范围 | 用途 | 何时声明或申请 |
| --- | --- | --- |
| `storage` | 保存配置、偏好、最近关键词和同步状态；通过 Chrome 同步存储同步部分配置 | 安装时声明 |
| `favicon` | 通过 Chrome 提供的接口展示网站图标 | 安装时声明 |
| `activeTab` | 用户点击工具栏扩展按钮后，获取当前页网址、标题和图标，便于保存网站、配置引擎及生成二维码 | 安装时声明，临时访问随用户操作触发 |
| `bookmarks` | 展示、搜索、新增、编辑、移动和删除浏览器书签，也用于匹配书签网站的图标缓存 | 可选权限，使用相关功能时请求 |
| `history` | 展示和搜索历史、生成常访问网站建议，以及执行用户选择的历史删除操作 | 可选权限，使用相关功能时请求 |
| 可选网站权限 `<all_urls>` | 网站截图功能会新开目标页面，再截取可见区域；当前实现为此请求所有网站访问权限 | 点击网站截图功能时请求 |
| 网页脚本匹配 `http://*/*`、`https://*/*` | 在普通网页上匹配搜索结果页、展示切换搜索引擎面板，以及读取并缓存相关网站的图标 | 扩展清单中的静态脚本范围；不是等待截图授权后才开始运行 |

可选的 `<all_urls>` 和静态网页脚本是两种不同的访问声明。安装时具体提示及实际可访问的网站范围由 Chrome 决定，不应把整个扩展描述为“所有网页访问都按需授权”。

拒绝书签或历史权限时，相应功能无法使用；常用网站与普通搜索仍可使用。拒绝截图所需网站权限会阻止该截图操作。

可以在 Chrome 的扩展管理页查看权限和网站访问设置，并按浏览器提供的选项限制访问。关闭“搜索引擎切换面板”只关闭该面板，不等于撤销网页访问或停用图标脚本。限制网站访问也可能影响图标缓存和网页面板功能。
