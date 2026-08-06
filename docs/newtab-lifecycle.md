# 新标签页生命周期与发版基线

本文记录当前稳定方案的职责边界和运行顺序。后续版本新增初始化、缓存或浏览器 API 调用时，必须遵守本流程，避免再次把重任务压到新标签页首屏。

## 目标与原则

- 新标签页只负责渲染、交互和展示已经准备好的数据；不负责清库或默认数据初始化。
- 网站、搜索引擎、分类和设置只读写 `browser.storage.local`，不再执行 IndexedDB 迁移。
- favicon 使用独立的 `MooogorFaviconCache` Dexie 数据库，与配置初始化完全隔离。
- 默认数据补齐、历史记录聚合等任务只在后台 Service Worker 执行。
- 新标签页必须可重复打开：后台在安装事件中初始化失败或被浏览器中断时，新标签页会请求后台重试。
- 任何可选能力（历史记录、书签）失败或未授权都只影响对应区域，不能阻塞整个新标签页。

## 存储职责

| 内容 | 存储位置 | 访问者 |
| --- | --- | --- |
| 网站、搜索引擎、分类、设置元数据 | `browser.storage.local` | UI 通过 `configStorage.ts` 读取/更新；后台负责准备 |
| 旧版网站、搜索引擎、分类、设置 | Dexie / IndexedDB | 不再读取、迁移或清理 |
| favicon Blob 缓存 | 独立 Dexie / IndexedDB：`MooogorFaviconCache` | 仅由后台按需读写；UI 通过消息取得 data URL |

`configStorage.ts` 不得导入 Dexie。配置不存在时，后台直接在扩展存储中创建空配置；已存在的有效扩展配置直接复用。

## 安装与升级

入口：`src/entrypoints/background.ts`

1. 浏览器触发 `runtime.onInstalled`。
2. 后台调用单例 `prepareConfiguration()`；同一时间的多次请求共享同一个 Promise。
3. 若扩展存储中已有有效配置，直接使用。
4. 若配置不存在或不完整，直接写入一份空的 `browser.storage.local` 配置，不读取旧 IndexedDB。
5. 后台根据语言补齐默认网站、默认搜索引擎分类和默认搜索引擎。
6. 初始化失败只记录日志，并清空后台的初始化 Promise；随后新标签页可以再次发 `ensureConfigReady` 重试。

禁止事项：不要在新标签页、popup 或 Svelte 组件里读取旧配置表、调用 `clear()` 或执行默认数据初始化。

## 第一次打开新标签页

入口：`src/entrypoints/newtab/App.svelte` 的 `initializePage()`。

1. 页面创建后，先向后台发送 `ensureConfigReady`。
2. 后台完成（或确认已完成）扩展存储初始化与默认数据准备后才返回。
3. 新标签页读取设置，应用主题，读取当前标签固定状态，设置语言与标签文案。
4. 根据 `defaultOpen`/`lastOpenTab` 选中初始标签；此时才加载该标签必要数据。
5. 首帧提交后将 `firstMount` 设为 `false`，恢复正常的切换与动画行为。

若以上任一步失败：记录错误、停止挂载 Search、使用“常用”标签作为基础兜底。配置初始化不会读取 IndexedDB、清库或在 UI 页再次执行，因此不会把异常扩大为浏览器崩溃。

## “常用”标签的延后任务

打开“常用”标签时：

1. UI 读取已保存的网站数据并检查 `history` 权限。
2. 未授权时立即显示已保存的网站，不查询历史记录。
3. 已授权时，UI 用 `requestIdleCallback` 在浏览器空闲期请求后台；不支持该 API 时使用 `setTimeout(0)` 兜底。
4. 后台执行最近 30 天、最多 1000 条的历史记录查询、按域名聚合及排序，并返回最多 24 个常用网站。
5. UI 只接受最新一次请求的结果；切换标签、权限变化或组件销毁时会取消待调度任务并使旧响应失效。

因此，1000 条历史查询不再位于新标签页的关键渲染路径，也不在 UI 进程中执行。

## 历史记录 API 的边界

以下 API 全部只能由后台调用：

- `browser.history.search`：常用网站聚合、历史标签页分页、搜索框历史建议。
- `browser.history.deleteRange`：清除历史记录。

新标签页相关组件只能通过 `browser.runtime.sendMessage` 调用后台消息：

| 消息 | 用途 |
| --- | --- |
| `ensureConfigReady` | 确保扩展存储与默认数据已经就绪 |
| `getFrequentSites` | 查询并聚合常用网站 |
| `getHistoryItems` | 获取某个时间范围内的历史记录 |
| `searchHistory` | 搜索历史记录 |
| `deleteHistoryRange` | 清理指定范围的历史记录 |
| `getFaviconData` | 从后台读取 favicon Blob 并转换为 data URL |

## 首屏禁止新增的工作

除非有明确评审结论，否则不要在 `initializePage()` 或组件顶层新增以下工作：

- IndexedDB 读取、表清空、批量写入、默认数据 seed；
- 大批量历史/书签扫描、聚合、排序；
- favicon 网络抓取或 Blob 缓存写入；
- 任何必须等待完成才能显示页面的非核心任务；
- 会触发多个组件重复初始化的副作用。

可选数据应在页面可用后、空闲期或用户明确进入对应功能时再由后台执行。

## 发版前检查

每次改动新标签页生命周期、配置初始化或浏览器 API 后，至少执行：

```bash
pnpm check
pnpm build
git diff --check
```

并检查构建产物：

- 新标签页和共享首屏 chunk 不应包含 `Dexie`、`configMigration` 或旧配置表名；Dexie 只能由后台 favicon 模块引用；
- 新标签页 chunk 不应包含 `history.search` 或 `history.deleteRange`；
- `wxt.config.ts` 保持 `modulePreload: false`，直到 Chromium 对扩展页的相关问题确认修复；
- 使用**全新浏览器 Profile**安装商店包，第一次直接打开新标签页；再测试升级安装、未授权历史权限、已授权历史权限和多次快速打开新标签页。

## 变更检查清单

- [ ] 新代码是否把重任务放在后台或用户交互后，而不是首屏？
- [ ] 配置初始化是否只使用 `browser.storage.local`，且没有读取旧 IndexedDB？
- [ ] UI 是否只使用消息访问后台专属浏览器 API？
- [ ] 某项可选功能失败时，新标签页是否仍能显示基础界面？
- [ ] `pnpm check`、`pnpm build` 和首次安装实测是否通过？
