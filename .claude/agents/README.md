# Project subagents

此資料夾保留給專案專用的 subagent 定義（YAML / Markdown）。

目前所有角色職責透過 `.claude/skills/` 的 SKILL.md 文件描述：

- microsoft-business-applications-research
- crm-process-design
- bpm-workflow-automation
- api-integration
- frontend-dashboard
- cicd-quality
- technical-writing

如果未來想把任一角色獨立成 subagent，可以在這個資料夾建立 `<agent-name>.md`，依照
Claude Code subagent frontmatter 規格（name / description / tools）撰寫即可。
