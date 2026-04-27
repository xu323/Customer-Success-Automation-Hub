---
name: technical-writing
description: Author or update Traditional Chinese documentation for this Microsoft Partner / MSP demo. Use whenever README.md, 使用方法.md, or any docs/*.md needs changes.
---

# Technical Writing

## 何時使用
- 新功能完成、需要更新 README / 使用方法。
- 客戶或新加入者需要架構說明。
- 新增資料模型或 API，需要在 docs 反映。

## 工作步驟
1. 文件一律使用繁體中文，但程式碼 / 命令保留英文。
2. 大綱固定：
   - **README.md**：定位 → 技術 → 啟動 → 截圖區 → 文件導讀。
   - **使用方法.md**：18 個小節，符合零基礎讀者。
   - **docs/architecture.md**：系統架構圖、資料流、序列圖（用 ASCII / Mermaid）。
   - **docs/research-notes.md**：依產品分章（Dataverse、BC、PA）。
   - **docs/security-notes.md**：列出風險 + 建議。
   - **docs/api.md**：每個 endpoint 一行 + 範例 payload。
   - **docs/workflow-engine.md**：trigger / condition / action 表格。
   - **docs/project-guide.md**：一段話 → 操作導覽 → 設計決策 FAQ 三層。
3. 所有命令以 PowerShell 為主，不用 `&&` 連接（用 `;` 或多行）。
4. 路徑使用相對路徑且採用 forward slash（除非是 PowerShell 指令）。

## 品質標準
- 任何指令在 Windows 11 + PowerShell 上能直接複製貼上跑通。
- 章節之間不要重複內容；改用 cross-link。
- 名稱統一：「Customer Success Automation Hub」、「Business Central」、「Dynamics 365 Sales」、「Power Automate」。

## 禁止事項
- 不要說「不重要」或「未來再做」這種搪塞文字。
- 不要寫「TODO」進交付文件。
- 不要在文件貼大段 source code（用引用 + 連結）。

## 輸出格式
Markdown 檔案，UTF-8 無 BOM。所有 PowerShell block 用 ```powershell，所有 Python 用 ```python。
