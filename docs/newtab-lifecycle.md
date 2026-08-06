# 新标签页生命周期与发版基线

当前基线版本：`1.6.7`。发版时生成两个商店包，业务数据后端按商店区分。

## 存储边界

| 内容 | 位置 | 访问方式 |
| --- | --- | --- |
| Edge：网站、搜索引擎、分类、设置 | Dexie 数据库 `Mooogor` | 直接读写，不迁移 |
| Chrome：网站、搜索引擎、分类、设置 | `storage.local` | 使用旧 `Mooogor` Dexie 数据迁移 |
| 两个平台：favicon Blob 缓存 | Dexie 数据库 `Mooogor` 的 `favicons` 表 | 后台读写；UI 通过消息取得 data URL |
| 搜索框选择、搜索历史 | 扩展页面 `localStorage` | Search 组件直接读写 |

Edge 包禁止使用 `browser.storage.local` 保存业务配置或迁移数据。Chrome 包保留已验证的迁移实现。

## 商店包差异（必须保持）

两个包的界面、历史记录后台任务和功能意图一致；业务数据后端不同。

| 项目 | Edge 包 | Chrome 包 |
| --- | --- | --- |
| 网站、搜索引擎、分类、设置 | `Mooogor` Dexie | `browser.storage.local` |
| favicon | `Mooogor.favicons` | `Mooogor.favicons` |
| Dexie → 新存储迁移 | 不执行 | 执行一次 |
| 迁移成功后的旧 Dexie 业务表 | 保留并继续使用 | 清理网站、引擎、分类、设置表 |
| 旧 Dexie favicon 表 | 保留并继续使用 | 保留并继续使用 |

Chrome 的迁移范围仅限网站、搜索引擎、分类和设置。favicon 不迁移到 `storage.local`，也不得改为 `MooogorFaviconCache`；两个包都使用旧 `Mooogor` 数据库的 `favicons` 表。

Edge 包是旧版稳定 Dexie 路径，用于规避 Edge 商店包在新存储初始化路径上的崩溃问题。等 Edge 问题确认修复后，才评估是否让 Edge 切换到 Chrome 的迁移后端。

## Edge 包首次新标签页流程

1. 新标签页读取 `Mooogor` Dexie 中的设置并应用主题。
2. 按当前语言补齐默认网站；已有网站不覆盖。
3. 读取当前标签固定状态，设置语言与标签文案，选中默认标签。
4. Search 组件补齐默认搜索引擎分类和搜索引擎；已有引擎不覆盖。
5. “常用”页读取网站数据。若用户已授权历史记录，则在空闲期请求后台生成常用网站列表。

Edge 包没有 `runtime.onInstalled` 的配置初始化，也没有 `ensureConfigReady` 握手。首次数据初始化只使用 Dexie 的幂等默认数据补齐函数。

## Chrome 包安装与首次新标签页流程

1. 安装或升级后，后台通过 `runtime.onInstalled` 准备配置。
2. 若尚未迁移，读取旧 `Mooogor` Dexie 中的网站、搜索引擎、分类和设置，写入 `storage.local` 并校验。
3. 校验成功后清理旧 Dexie 的网站、搜索引擎、分类和设置表；不清理 `favicons` 表。
4. 后台补齐默认网站、搜索引擎分类和搜索引擎。
5. 新标签页发送 `ensureConfigReady`，后台完成准备后，新标签页再读取设置和渲染 Search。

## 后台职责

- 处理历史记录查询、搜索、清理；新标签页不直接调用 `browser.history`。
- 读取/保存 favicon Blob，并返回 data URL。
- 处理关联搜索功能。

Edge 后台不初始化网站、搜索引擎、分类或设置，也不迁移数据。Chrome 后台负责上述迁移和默认数据补齐。

## 首屏约束

Edge 包不要在新标签首屏加入：

- `browser.storage.local` 配置读写；
- 跨数据库迁移、数据复制或无条件清库；
- favicon 网络抓取或 Blob 缓存写入；
- 大批量历史/书签扫描、聚合、排序。

历史记录聚合维持后台执行、空闲期请求；默认网站和搜索引擎只使用 Dexie 的空表检查与批量写入。

## 发版前检查

```bash
pnpm check
pnpm build:stores
git diff --check
```

并确认：

- `package.json` 版本号已更新；
- `dist/mooogor-edge-<version>.zip` 与 `dist/mooogor-chrome-<version>.zip` 都已生成；
- Edge 包不含 `browser.storage.local`、`configStorage`、`ensureConfigReady`；
- 新标签 chunk 不含 `history.search` 或 `history.deleteRange`；
- `wxt.config.ts` 保持 `modulePreload: false`；
- 使用全新 Edge Profile 分别安装微软商店和 Chrome 商店包，首次打开新标签页均正常。
