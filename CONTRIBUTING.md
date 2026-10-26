# 参与贡献 / Contributing

欢迎通过 [Gitee Issues](https://gitee.com/antion666/mooogor_new_tab/issues) 反馈问题、提出建议，或提交 Pull Request。

## 反馈问题

请先搜索已有 Issue，避免重复。提交时请提供：

- Mooogor Start 版本、浏览器版本及操作系统。
- 复现步骤、预期结果和实际结果。
- 必要时附上截图或错误信息，并移除个人书签、浏览记录和其他隐私信息。

涉及安全或隐私的问题，请通过 [antion1212@gmail.com](mailto:antion1212@gmail.com) 联系作者。

## 提交改进

1. Fork 仓库并创建改动分支。较大的功能或交互调整，建议先通过 Issue 讨论。
2. 运行 `pnpm install` 和 `pnpm dev`，遵循现有的 Svelte、TypeScript 与组件风格。
3. 界面文案需同步维护 `public/_locales` 下的简体中文、繁体中文和英文文件。
4. 提交前运行 `pnpm check` 和 `pnpm build`，并在浏览器中验证相关功能。涉及可选权限时，检查授权与未授权两种情况。
5. 更新依赖后运行 `pnpm licenses:generate`，一并提交第三方声明的变化。
6. 在 Pull Request 中说明解决的问题、主要改动和验证结果；界面调整请附截图。

项目自身的许可证尚未声明。如需复用或分发项目代码，请先联系作者确认授权。

## English

Report bugs and suggest improvements through Gitee Issues. Include the extension version, browser, operating system, reproduction steps, and expected versus actual behavior. Remove personal data from screenshots and logs. Send security or privacy reports to the author by email.

Keep changes focused, update Simplified Chinese, Traditional Chinese and English interface strings, run `pnpm check` and `pnpm build`, and verify affected features in the browser before opening a Pull Request. Regenerate third-party notices after dependency changes. Describe the problem, changes, and verification in your Pull Request.
