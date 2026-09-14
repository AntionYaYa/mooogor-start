# 新标签页生命周期与发版基线

本文记录当前配置迁移、新标签页加载、降级显示和错误恢复的职责边界。后续修改初始化、迁移、缓存或浏览器 API 时，应保持这些约束，避免后台异常导致新标签页白屏或浏览器崩溃。

## 目标与原则

- 页面外壳先渲染，持久化数据准备期间显示骨骼，不用空白页等待后台。
- 配置迁移只能在后台 Service Worker 执行；新标签页和 popup 只能请求后台确保配置就绪。
- 搜索引擎、常用网站和设置列表独立加载、独立失败，单个区域异常不能让整个页面停止渲染。
- 加载流程不设置超时。只要 Promise 仍处于 pending，就继续显示骨骼并等待真实结果。
- 只有明确错误才进入错误状态：浏览器 API reject、后台返回 `ok: false`、响应格式非法、存储读取失败或配置校验失败。
- 只有明确错误后才提供重置入口，不能因为等待时间较长而允许用户在迁移过程中重置。
- 历史记录、书签和 favicon 等可选能力失败时，只影响对应功能。

## 存储职责

| 内容 | 存储位置 | 访问者 |
| --- | --- | --- |
| 网站、搜索引擎、分类、设置元数据、迁移标记 | `browser.storage.local` | UI 通过 `configStorage.ts` 读取/更新；后台负责迁移和首次准备 |
| 旧版网站、搜索引擎、分类、设置 | Dexie / IndexedDB | 仅迁移期间由后台读取；迁移验证成功后清空旧记录 |
| favicon Blob 缓存 | Dexie / IndexedDB | 后台读写；UI 通过消息取得 data URL |

`configStorage.ts` 不得导入 Dexie，也不得触发迁移。配置尚未准备好时，它会抛出 `Configuration is not ready`，由调用方进入明确错误流程。

由于 favicon 仍保存在同一个 Dexie 数据库中，迁移完成后清理的是旧配置表中的记录，不删除整个 IndexedDB 数据库。

## 安装与升级

入口：`src/entrypoints/background.ts`

1. 浏览器触发 `runtime.onInstalled`。
2. 后台调用单例 `prepareConfiguration()`；安装事件和新标签页请求若同时发生，会共享同一个 Promise。
3. 首次安装：写入一份空的、迁移状态为 `completed` 的 `browser.storage.local` 配置。
4. 升级或已有用户：
   - 已存在有效的新配置时直接使用；
   - 否则检查旧的单键 storage 配置；
   - 再没有则读取旧 Dexie 网站、搜索引擎、分类和设置数据；
   - 写入拆分后的新配置；
   - 重新读取并稳定序列化比对；
   - 只有验证成功后才清空旧 Dexie 配置记录和旧 storage key。
5. 后台根据语言补齐默认网站；仅当搜索引擎和分类同时为空时，一次性写入默认搜索配置。已有空分类或全部禁用的分类不会触发补齐。
6. 成功后保留已完成的 Promise，后续请求直接复用；失败时记录日志并清空 Promise，下一次新标签页请求可以重新执行。

禁止在新标签页、popup、Svelte 组件或普通配置读取函数中执行迁移或清理旧数据。

## 后台 Service Worker 生命周期

入口：`src/entrypoints/background.ts`

后台是 Manifest V3 Service Worker，不是始终驻留的常驻进程。它由浏览器按事件唤醒，也可能在空闲后被回收。当前配置初始化必须同时适应“同一实例内多次请求”和“Service Worker 重启后重新进入”两种情况。

### 唤醒入口

后台主要由以下事件唤醒：

| 事件 | 行为 |
| --- | --- |
| Service Worker 实例启动 | 注册 `runtime.onInstalled` 和 `runtime.onMessage` 监听器，输出 `service-worker:ready` |
| `runtime.onInstalled: install` | 调用 `prepareConfiguration(true, "install")`，创建新配置并补齐默认数据 |
| `runtime.onInstalled: update` | 调用 `prepareConfiguration(false, "update")`，检查或执行旧数据迁移 |
| 新标签页发送 `ensureConfigReady` | 唤醒后台并调用 `prepareConfiguration(false, "ensureConfigReady")` |
| 历史、favicon 等其他消息 | 只执行对应任务，不主动触发 UI 侧迁移 |

### 单次实例内的状态

`configurationReadyPromise` 是当前 Service Worker 实例内的初始化锁：

```text
null
  │ 首个 install / update / ensureConfigReady
  ▼
pending ── 后续请求复用同一个 Promise
  │
  ├─ success → fulfilled（当前实例后续请求直接复用）
  │
  └─ failure → 记录 initialization:failed → 重置为 null
```

- 安装事件与新标签页请求同时发生时，不会并行执行两次迁移。
- 初始化失败后必须清空该 Promise，确保下一次事件可以重试。
- `configMigration.ts` 内部还有一个 `migrationPromise`，用于避免同一实例内重复进入迁移函数；失败时同样会清空。

### 一次初始化的执行顺序

```text
prepareConfiguration
  ├─ 首次安装：initializeFreshStoredConfig
  └─ 升级/普通检查：initializeStoredConfig
         ├─ 检查 browser.storage.local 新配置
         ├─ 必要时读取旧 storage / Dexie
         ├─ 写入新配置
         ├─ 重新读取并验证
         └─ 验证成功后清理旧配置记录
  ├─ ensureDefaultWebSites
  ├─ ensureDefaultEngineCategories
  ├─ ensureDefaultEngines
  └─ initialization:success
```

任一步明确抛错都会沿 Promise 传播：后台向 `ensureConfigReady` 请求返回 `{ ok: false, error }`，新标签页才进入全局错误状态。

### 与新标签页通信

收到 `ensureConfigReady` 后，后台不会立即返回“已收到”，而是等待共享的初始化 Promise 得到最终结果：

```text
NewTab                         Service Worker
   │ ensureConfigReady(requestId)  │
   ├──────────────────────────────►│
   │                               ├─ prepareConfiguration
   │        保持消息通道开放        ├─ 迁移 / 验证 / 默认数据
   │                               │
   │◄──────────────────────────────┤ { ok: true, requestId }
   │              或               │
   │◄──────────────────────────────┤ { ok: false, requestId, error }
```

监听器返回 `true`，使 Chromium 在异步初始化期间保持 `sendResponse` 通道。新标签页不设置人工超时：后台 Promise 仍在 pending 时，前端继续显示骨骼；只有消息通道明确 reject 或后台返回失败才显示错误与重置入口。

### Service Worker 被回收或重启

- Service Worker 被回收后，`configurationReadyPromise` 和 `migrationPromise` 等内存状态会丢失，这是正常行为。
- `browser.storage.local` 中的配置、迁移完成标记和业务数据不会随 Worker 回收而丢失。
- 新实例收到请求后会重新从 `null` 进入 `prepareConfiguration()`；若持久化配置有效，迁移检查会快速走 `check:already-completed`，不会重复搬运数据。
- 如果上一个实例在新配置写入完成前被中断，新实例读不到有效新配置，会再次从旧数据迁移。
- 如果中断发生在“新配置已完整写入”之后、“旧数据清理”之前，新实例会优先使用有效新配置，不重复搬运；旧 Dexie 配置记录可能暂时保留，但不会覆盖新配置。
- 旧数据清理只发生在当前实例完成写后验证之后，因此 Worker 中断最多造成旧记录残留，不会先删旧数据再丢失新配置。
- 如果浏览器明确关闭消息通道，新标签页的 `sendMessage` 会 reject，并进入明确错误状态；不会用等待时长推断 Worker 已失败。

因此，内存 Promise 负责“当前 Worker 实例不并发重复执行”，持久化配置和迁移标记负责“Worker 重启后仍然幂等”。两者不能互相替代。

## 新标签页启动顺序

入口：`src/entrypoints/newtab/App.svelte` 的 `initializePage()`。

1. 立即将配置和常用网站状态设为 `loading`。
2. 使用 `DEFAULT_SETTINGS`、默认主题和默认标签先渲染页面外壳。
3. 搜索区和常用网站区显示与成功态尺寸对应的骨骼；此时不展示临时网站数据。
4. 新标签页发送带 `requestId` 的 `ensureConfigReady` 消息。
5. 后台等待迁移和默认数据准备完成，然后返回：
   - `{ ok: true, requestId }`：继续读取用户设置；
   - `{ ok: false, requestId, error }`：进入明确错误状态。
6. 新标签页读取设置，应用主题，读取当前标签固定状态，设置语言和标签文案。
7. `configurationState` 变为 `ready`，搜索引擎和初始标签的数据才开始独立加载。
8. 根据 `defaultOpen` / `lastOpenTab` 选中初始标签。

页面与后台通信没有人工超时和定时重试。后台仍在处理时页面持续显示骨骼；不会仅因等待较久而判定迁移失败。

## 状态与界面

### 整个配置

`configurationState` 有三个状态：

| 状态 | 界面行为 |
| --- | --- |
| `loading` | 页面外壳正常显示；搜索和依赖配置的区域显示骨骼；设置按钮不可用 |
| `ready` | 加载真实配置，开放搜索、网站编辑和设置 |
| `fallback` | 页面继续显示；搜索使用内置兜底；右上角设置按钮替换为红色警告按钮 |

进入 `fallback` 必须来自明确异常，不能由计时器触发。点击警告按钮会打开说明弹窗，用户可以取消，或确认“重置全部配置”。重置会恢复默认网站、搜索引擎、分类和偏好设置，但不会删除收藏夹、历史记录和 Dexie favicon 缓存。

### 搜索引擎

- 配置尚未就绪时显示搜索骨骼。
- 配置读取成功后显示真实分类和引擎。
- 分类始终显示，不因引擎禁用而隐藏。综合、图片、视频、音乐每类默认启用 2～3 个引擎；图标、字体、创作素材每类默认启用一个引擎。每类不限制启用引擎数量，允许全部禁用、删除或移走，也可以删除整个分类。已有全部禁用的分类和新建空分类保持原样，不自动启用任何引擎。
- 预制库调整应用于首次初始化和用户主动重置搜索引擎，不自动重排或覆盖已有分类和自定义引擎；已有启用状态保持原样。
- 新增及重置引擎使用独立随机数字 ID，不再按列表顺序重新编号；重置排除当前引擎 ID，旧窗口保存不存在的引擎会失败。新增、编辑和移动均检查目标分类仍然存在。搜索栏及关联搜索面板按引擎 ID 选中和定位，相同搜索地址可独立使用。
- 引擎编辑使用后台串行写入队列，不执行最低启用数量校验或自动修复；批量删除在同一次写入中完成。
- 明确读取失败时使用内置兜底数据：综合、图片、视频、音乐四个分类，每个分类最多三个符合当前语言的默认引擎。
- 兜底状态为只读；新开标签页会重新执行正常初始化流程。

### 常用网站

- 与搜索引擎分开加载，加载期间显示网站网格骨骼。
- 成功后显示本地保存的网站。
- 明确失败后不显示占位网站，而是显示错误说明和“重置常用网站”入口。
- 重置只处理常用网站，不影响搜索引擎、收藏夹、历史记录或 favicon。

### 设置列表

- 搜索引擎列表和常用网站列表分别维护 loading、ready/error 状态。
- 加载期间显示与真实列表行高相近的骨骼。
- 明确失败后显示说明和对应的重置入口。
- 列表读取不设置超时，不会因为设备较慢而误判为失败。

## 明确错误的边界

以下情况可以从 loading 进入错误状态：

- `browser.runtime.sendMessage` 明确 reject；
- `ensureConfigReady` 响应不存在、格式非法或 `ok !== true`；
- 后台迁移、写入、重新读取验证或默认数据补齐抛错；
- `browser.storage.local` 的读取明确 reject；
- 搜索引擎、常用网站或设置列表的数据处理明确抛错。

以下情况不能进入错误状态：

- 等待时间较长；
- Service Worker 仍在处理迁移；
- 数据量比预期大但 Promise 尚未结束；
- 骨骼动画显示时间较长。

## “常用”标签的延后任务

打开“常用”标签时：

1. UI 读取已保存的网站数据并检查 `history` 权限。
2. 未授权时立即显示已保存的网站，不查询历史记录。
3. 已授权时，UI 用 `requestIdleCallback` 在浏览器空闲期请求后台；不支持该 API 时使用 `setTimeout(0)` 兜底。
4. 后台执行最近 30 天、最多 1000 条的历史记录查询，按域名聚合并返回最多 24 个常用网站。
5. UI 只接受最新一次请求的结果；切换标签、权限变化或组件销毁时会取消待调度任务并使旧响应失效。

这里的 `setTimeout(0)` 只用于把非关键任务让出首屏，不是加载超时或错误判定。

## 历史记录 API 的边界

以下 API 只能由后台调用：

- `browser.history.search`：常用网站聚合、历史标签页分页、搜索框历史建议；
- `browser.history.deleteRange`：清除历史记录。

新标签页相关组件通过 `browser.runtime.sendMessage` 调用后台：

| 消息 | 用途 |
| --- | --- |
| `ensureConfigReady` | 等待迁移与默认数据准备完成 |
| `getFrequentSites` | 查询并聚合经常访问的网站 |
| `getHistoryItems` | 获取指定时间范围内的历史记录 |
| `searchHistory` | 搜索历史记录 |
| `deleteHistoryRange` | 清理指定范围的历史记录 |
| `getFaviconData` | 读取 favicon Blob 并转换为 data URL |

## 首屏禁止新增的工作

除非有明确评审结论，否则不要在 `initializePage()` 或组件顶层新增：

- Dexie 迁移、旧表清理、批量写入；
- 大批量历史或书签扫描、聚合、排序；
- favicon 网络抓取或 Blob 缓存写入；
- 会触发多个组件重复初始化的副作用；
- 通过人工延迟、模拟异常或超时来改变生产加载状态。

可选数据应在页面外壳可用后、空闲期或用户进入对应功能时加载。

## 关键日志

后台初始化：

```text
[Mooogor Config] service-worker:ready
[Mooogor Config] initialization:start
[Mooogor Config Migration] check:start
[Mooogor Config Migration] validation:success
[Mooogor Config] initialization:success
```

新标签页：

```text
[Mooogor NewTab] page:mounted
[Mooogor NewTab] shell:ready
[Mooogor Config Client] request
[Mooogor Config Client] success
[Mooogor NewTab] initialization:success
```

明确失败时使用 `initialization:failed`、`search-config:load-failed`、`websites:load-failed`、`search-engines:load-failed` 或 `common-sites:load-failed` 定位具体阶段。

## 发版前检查

每次改动新标签页生命周期、迁移或浏览器 API 后，至少执行：

```bash
pnpm check
pnpm build
git diff --check
```

并检查：

- `.output/chrome-mv3/chunks/newtab-*.js` 和共享首屏 chunk 不包含 `initializeStoredConfig` 或 `configMigration`；
- 新标签页 chunk 不包含 `history.search` 或 `history.deleteRange`；
- 源码中不存在仅用于测试的强制延迟、`FORCE_*` 或主动模拟异常；
- `wxt.config.ts` 保持 `modulePreload: false`，直到 Chromium 扩展页相关问题确认修复；
- 使用全新浏览器 Profile 安装商店包，测试首次安装、升级安装、未授权历史权限、已授权历史权限和多次快速打开新标签页。

## 变更检查清单

- [ ] 页面外壳是否在等待后台前完成渲染？
- [ ] 迁移是否仍遵守“写入 → 重新读取验证 → 清理旧数据”的顺序？
- [ ] pending 是否持续显示骨骼，而不是被等待时长误判为失败？
- [ ] 重置入口是否只在明确错误后出现？
- [ ] 搜索、常用网站和设置列表是否仍然独立加载、独立失败？
- [ ] UI 是否只通过消息访问后台专属浏览器 API？
- [ ] `pnpm check`、`pnpm build`、`git diff --check` 和商店包首次安装实测是否通过？
