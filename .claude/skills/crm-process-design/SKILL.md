---
name: crm-process-design
description: Design or extend Lead-to-Cash flows in this repo. Use whenever a change touches Lead, Opportunity, Quote, Account, or Contact entities.
---

# CRM Process Design

## 何時使用
- 新增或調整 CRM 階段（lead → opportunity → quote → won）。
- 在 Dashboard / Pipeline 加入新的 KPI。
- 設計 hand-off 至 Customer Onboarding 的觸發點。

## 工作步驟
1. 先看 `apps/api/app/models.py` 中既有的 CRM 模型，避免重複欄位。
2. 設計變更時遵守 Lead-to-Cash 標準：
   - Lead 只負責「線索捕捉 + 是否值得花時間」。
   - Opportunity 才談金額、機率、預計成交日。
   - Quote 才產出可寄出的報價單與 line items。
3. 任一階段轉換需要：
   - 在 router 寫一個明確的 endpoint（如 `/leads/{id}/qualify`）。
   - 呼叫 `audit.record_event` 留下行為紀錄。
   - 若是「成交」這類關鍵事件，呼叫 `dispatch_event` 觸發後續 workflow。
4. 在前端 `src/pages/CRMPage.tsx` 對應地補上 UI。

## 品質標準
- 每個流程轉換都要有 audit log。
- 不要在前端塞商業邏輯；Pipeline 計算必須走後端 dashboard summary。
- KPI 名稱與企業常見 CRM 詞彙一致（pipeline value、win rate、average deal size）。

## 禁止事項
- 不在 Lead 上直接記金額；那是 Opportunity 的責任。
- 不直接從 router 寫 SQL；走 SQLAlchemy ORM。
- 不在 mock 模式下實際呼叫 Dynamics CRM tenant。

## 輸出格式
- Backend：新增 endpoint、schema、audit event。
- Frontend：新增頁面元素、Badge、KPI。
- Docs：更新 `docs/architecture.md` 的 CRM 段落。
