---
name: microsoft-business-applications-research
description: Research and summarise official Microsoft documentation for Dynamics 365, Business Central, Dataverse, Power Automate, and Power Platform whenever a feature in this repo touches those products.
---

# Microsoft Business Applications Research

## 何時使用
當需要新增 / 變更下列任一情境時呼叫：
- 新增與 Dynamics 365 Sales、Customer Service、Dataverse 相關的資料表或欄位。
- 變更 Business Central 同步欄位、API endpoint 或資料 mapping。
- 設計新的 Power Automate / cloud flow / approval flow 流程。
- 撰寫客戶或內部技術文件，需要引用官方術語或 best practice。

## 工作步驟
1. 從專案 `docs/research-notes.md` 讀取既有研究筆記，避免重工。
2. 以 `learn.microsoft.com` 為主要來源，搜尋對應主題（如 `Dataverse Web API`、`Business Central API v2.0`、`Power Automate approval connector`）。
3. 抽出三類資訊：
   - 資料模型（entity / table、欄位、關聯）
   - API 介面（endpoint、HTTP method、required scope）
   - 實務 best practice（rate limit、retry、auth flow）
4. 在 `docs/research-notes.md` 對應章節新增一段，並用 ▸ 開頭的 bullet 摘要。
5. 若研究結論影響 mock client（`apps/api/app/services/*_client.py`），同步更新註解中的 endpoint 範例。

## 品質標準
- 每段研究必須附上至少一個 `learn.microsoft.com` 連結。
- 範例 endpoint 一律使用 v2.0 / v9.2 之後的版本。
- mock 與 real 的對應方式必須清楚交代（看 `docs/research-notes.md` 的 「mock vs real」章節）。

## 禁止事項
- 不引用未經驗證的部落格或 forum 為唯一來源。
- 不呼叫真實 tenant；本專案以 mock 為預設。
- 不刪除既有筆記，只新增或修正。

## 輸出格式
更新 `docs/research-notes.md` 的對應章節，使用三段式：
1. 概念
2. 主要 API / entity
3. 與本專案的對應 mock 模組
