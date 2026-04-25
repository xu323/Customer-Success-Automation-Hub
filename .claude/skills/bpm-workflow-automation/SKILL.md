---
name: bpm-workflow-automation
description: Design BPM approval flows and JSON-driven automation workflows that mock Power Automate. Use whenever you add a new BPM request type, approval rule, or workflow trigger/action.
---

# BPM & Workflow Automation

## 何時使用
- 新增 BPMRequestType（VendorPayment / EmployeePayment / TravelRequest 之外）。
- 新增 workflow 行為（action）或事件（trigger）。
- 串接 Business Central / Power Automate mock。

## 工作步驟
1. 看 `apps/api/app/services/workflow_engine.py` 已支援的 action：
   `create_onboarding_project`, `create_risk_alert`, `create_ticket`,
   `sync_to_business_central`, `send_notification`,
   `call_power_automate_flow`, `http_post`。
2. 若新增 action：
   - 在 `ACTION_REGISTRY` 加入新的 handler 函數，回傳 `dict[str, Any]`。
   - 寫一個 pytest 案例覆蓋成功 / 失敗路徑。
   - 在 `docs/workflow-engine.md` 補上 action 說明與範例 JSON。
3. 若新增 trigger 事件名稱：
   - 在 router 對應行為（例如 BPM 簽核完成）裡呼叫 `dispatch_event(db, "<event_name>", payload)`。
   - 在 seed.py 加上一筆示範 workflow definition。

## 品質標準
- 任一 action 必須是純函式（無外部副作用、僅透過參數）。
- 條件運算子必須在文件列舉清楚（`==`、`!=`、`>=`、`<=`、`in`、`contains`、`exists`）。
- 失敗的 action 必須讓整個 run 標記為 `failed` 並寫入 audit log。

## 禁止事項
- 不在 action 內直接呼叫真實外部 API（用 mock client）。
- 不要把 secret 放進 workflow definition。
- 不要建立會無限觸發自己的 workflow（避免事件迴圈）。

## 輸出格式
- 程式：`workflow_engine.py` 加 handler、`schemas.py` 視需要擴增。
- 測試：`tests/test_workflow_engine.py`。
- 文件：`docs/workflow-engine.md` 條列新 action 名稱、參數、範例。
