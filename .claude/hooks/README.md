# Project hooks

此資料夾保留給專案專用的 Claude Code hook 腳本。

目前不啟用任何 hook，因為這個專案不需要在每次 tool call 前後做副作用。
未來若要加上：

- 工作 commit 前自動 `ruff` 與 `pytest`：放 `pre-commit.sh`，並在 settings.local.json 註冊。
- 完成大型任務後自動寫一份 release note：放 `post-task.sh`。

要啟用時，請在 `.claude/settings.local.json`（不入版控）裡 reference 這些檔案。
