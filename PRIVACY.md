# 隐私与数据说明 / Privacy & data handling

[English](#english) · [简体中文](#简体中文)

## English

Updated: October 26, 2026. Scope: the current Mooogor Start Chrome extension code in this repository. Older store versions may behave differently; published disclosures should match the corresponding release.

### Purpose & storage

Mooogor Start helps you reach websites through common sites, multi-engine search, bookmarks, and history. The current code has no developer-operated data collection endpoint, advertising SDK, or usage analytics SDK, and no implementation that sells browsing data or sends it to advertising services.

- **Configuration**: site names and URLs, folders, search engines, categories, background URLs and display parameters, and preferences are stored in extension local storage.
- **Bookmarks & history**: accessed through browser APIs after permission is granted, for display, search, bookmark management, and frequently visited site suggestions. Creating, editing, moving, or deleting records affects the browser's actual records. A history suggestion you add to common sites becomes configuration, including its name and URL.
- **Search keywords**: recent keyword recording is enabled by default. Keywords are kept in extension local storage and excluded from extension sync. Submitting a search sends its keywords to the selected search service as part of the search URL.
- **Web pages**: scripts run on matching ordinary HTTP/HTTPS pages. They read the current URL to match search engines and decide whether to cache an icon, and read page icon links. On matching search result pages, keywords are extracted from the URL for an engine-switching panel. The panel is enabled by default and can be disabled in settings; disabling it does not disable icon processing scripts.
- **Current tab**: clicking the extension toolbar button uses the current page's URL, title, and icon to help save sites, configure engines, and generate a QR code locally.
- **Screenshots & icons**: stored locally in IndexedDB. Screenshots are user-triggered; the extension opens the target site and captures its visible area. The image may contain personal information displayed by that site.

### Chrome cross-device sync

Extension sync is enabled by default. Actual cross-device transfer depends on Chrome account and sync settings. The extension writes common sites, folders, engines, categories, background configuration, and selected preferences to Chrome's `storage.sync`, handled by the browser and its sync service rather than a developer-operated server.

The extension's sync payload excludes the full bookmark library, full browsing history, recent search keywords, screenshot images, and cached icons. Engine icon URLs, background image URLs, and common site URLs still sync as configuration. Chrome's own bookmark and history sync is controlled separately by the browser.

You can disable cross-device sync in the extension's Data Sync settings. This stops subsequent configuration uploads and application of sync changes; it does not delete local configuration or existing sync copies. The switch itself is stored in sync storage and may affect other synced devices. The extension currently has no dedicated button to delete sync copies.

### Network requests & third parties

- Searches and site navigation contact the selected service or site, including information in the destination URL, such as search keywords.
- Icon loading contacts hosts specified by configuration or visited pages. Capturing a screenshot visits the target website.
- Enabling or previewing online backgrounds contacts the image host. Built-in backgrounds use `images.unsplash.com`; custom backgrounds contact the image service you provide.
- Browser sync processes configuration through Chrome's sync service.
- Clicking source, feedback, or support links opens external services such as Gitee or PayPal. If you email the author, the author receives the content you provide.

These services may receive your IP address, request URL, and ordinary browser request information. Their own privacy policies govern their handling. The extension does not promise complete offline operation or exclusively local storage.

### Controls, retention & deletion

- Disable recent keyword recording in settings and use the search area's clear button to remove saved keywords. Keywords are stored per category and must be cleared separately.
- Manage or delete common sites, engines, and custom backgrounds in settings; remove screenshots through the site's menu. Disabling backgrounds, keyword recording, or sync does not itself delete saved data.
- Review extension permissions and site access in Chrome's extension management page, restrict access using Chrome's available controls, or disable/uninstall the extension.
- Local configuration and caches are retained for future use until you delete items, clear extension data, or uninstall. Uninstalling does not delete browser bookmarks or history; deletions you explicitly perform inside the extension do affect those records.
- Uninstalling is not a guarantee that cloud sync copies are removed. Use Chrome/Google account sync-data management to clear existing sync data, considering its possible effect on other browser sync data.

### Contact & updates

Contact [antion1212@gmail.com](mailto:antion1212@gmail.com) for privacy or security concerns. Do not put personal bookmarks, history, full screenshots, or sensitive URLs in public issues. Changes to data handling should be reflected in this document, in-product disclosures, and store disclosures.

## 简体中文

更新日期：2026 年 10 月 26 日。适用范围：本仓库当前 Mooogor Start Chrome 扩展代码。历史商店版本的行为可能不同，发布时应以对应版本的代码和说明为准。

### 数据处理目的与存储

Mooogor Start 通过常用网站、多引擎搜索、书签和历史记录，帮助你快速访问网站。当前代码未接入开发者自建的数据接收服务、广告或使用统计 SDK，也没有将浏览数据出售或发送给广告服务的实现。

- **配置**：常用网站的名称和网址、文件夹、搜索引擎、分类、背景地址与显示参数、偏好设置保存在扩展的本地存储中。
- **书签与历史记录**：获得相应权限后，在浏览器中读取，用于展示、搜索、整理书签以及根据历史记录显示常访问的网站。你主动执行的新增、编辑、移动、删除操作会直接影响浏览器的书签或历史记录。若将历史推荐的网站添加为常用网站，该网站的名称和网址会成为扩展配置的一部分。
- **搜索关键词**：记录最近搜索关键词的选项默认开启；关键词保存在扩展本地存储中，不进入扩展的同步数据。你提交搜索时，关键词会随搜索网址发送给所选搜索服务。
- **网页信息**：扩展在匹配的普通 HTTP/HTTPS 网页中运行脚本，读取当前网址以匹配搜索引擎和判断是否缓存图标，并读取页面图标链接；在匹配的搜索结果页中从网址提取关键词，以展示切换搜索引擎的面板。该面板默认启用，可在设置中关闭；关闭面板不会停用图标处理脚本。
- **当前标签页**：点击工具栏扩展按钮时，使用当前页的网址、标题和图标，方便保存网站、配置搜索引擎及在本地生成二维码。
- **截图和图标**：截图与图标缓存保存在本地 IndexedDB 中。截图由你主动触发，扩展会打开目标网站、截取其可见区域并保存；截图可能包含该网站当时显示的个人信息。

### Chrome 跨设备同步

当前版本的扩展同步默认开启；实际跨设备传输取决于 Chrome 的账号与同步设置。扩展通过 Chrome 提供的 `storage.sync` 保存常用网站、文件夹、搜索引擎、分类、背景配置和部分偏好设置，由浏览器及其同步服务处理，不经过开发者自建服务器。

扩展自己的同步数据不包含书签整库、浏览历史整库、最近搜索关键词、截图图片和图标缓存。搜索引擎图标地址、背景图片地址及常用网站网址作为配置仍会同步。浏览器自身是否同步书签、历史等信息由 Chrome 单独控制。

你可以在扩展设置的“数据同步”中关闭“跨设备同步”。关闭会停止扩展配置的后续上传与应用，但不会删除本地配置或已写入的同步副本。开关本身保存在同步存储中，可能影响其他同步设备。当前扩展没有专门删除同步副本的按钮。

### 网络请求与第三方

- 提交搜索或打开网站时，会连接到你选择的服务或网站，并向其发送目标网址中包含的信息（例如搜索关键词）。
- 加载网站图标会连接配置或网页指定的图标地址；获取网站截图会访问目标网站。
- 启用或预览在线背景时，会访问图片地址；内置背景使用 `images.unsplash.com`，自定义背景连接你提供的图片服务。
- 启用浏览器同步时，配置由 Chrome 同步服务处理。
- 点击源码、反馈、支持链接时，会打开 Gitee、PayPal 等相应外部服务。主动发送邮件时，作者会收到你提供的邮件内容。

上述服务可能获得 IP 地址、请求网址及浏览器发送的常规请求信息，其处理方式由各服务自身的隐私政策决定。扩展不因此承诺“完全离线”或“所有数据都只在本地”。

### 控制、保留与删除

- 在设置中关闭最近搜索关键词记录，并通过搜索区的清除按钮清除已保存的关键词；关键词按分类保存，需要分别清除。
- 在设置中管理或删除常用网站、引擎和自定义背景；通过网站菜单移除截图。关闭背景、关闭关键词记录或关闭同步本身不等于删除已有数据。
- 在 Chrome 扩展管理页查看权限和网站访问设置，按 Chrome 提供的选项限制访问；也可以停用或卸载扩展。
- 本地配置和缓存会保留供后续使用，直到你删除相关项目、清理扩展数据或卸载。浏览器书签和历史记录不会因为卸载扩展而被删除；你在扩展中主动执行的删除操作除外。
- 卸载不能作为删除云端同步副本的保证。如需清理已有同步数据，请通过 Chrome/Google 账户提供的同步数据管理方式处理，并留意其可能影响其他浏览器同步数据。

### 联系与更新

隐私或安全问题请联系 [antion1212@gmail.com](mailto:antion1212@gmail.com)。请勿在公开 Issue 中提交个人书签、历史记录、完整截图或敏感网址。数据处理方式改变时，应同步更新本文、扩展内说明及商店披露。
