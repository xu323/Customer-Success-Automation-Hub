# REST API 一覽

> Backend 啟動後可在 <http://localhost:8000/docs> 直接互動測試。
> 以下列出所有 endpoint 並提供範例 payload。

## 0. Health

| Method | Path | 用途 |
|---|---|---|
| GET | `/health` | 確認服務存活 |

```http
GET /health
200 OK
{ "status": "ok", "version": "0.1.0", "env": "development" }
```

## 1. Dashboard

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/dashboard/summary` | 取得 6 個 KPI + 最近 audit 事件 |

## 2. CRM

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/crm/leads` | 列出所有 lead |
| POST | `/api/crm/leads` | 新增 lead |
| POST | `/api/crm/leads/{id}/qualify` | 把 lead 轉成 opportunity |
| GET | `/api/crm/opportunities` | 列出所有 opportunity |
| POST | `/api/crm/opportunities` | 新增 opportunity |
| POST | `/api/crm/opportunities/{id}/mark-won` | 標記成交，自動觸發 workflow |
| GET | `/api/crm/quotes` | 列出 quote |
| POST | `/api/crm/quotes` | 新增 quote |

```json
// POST /api/crm/leads
{
  "company": "Acme Corp",
  "contact_name": "Alice Doe",
  "email": "alice@acme.com",
  "source": "Webinar",
  "estimated_value": 100000
}
```

## 3. Customer Onboarding

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/onboarding/projects` | 列出 onboarding 專案 |
| POST | `/api/onboarding/projects` | 新增專案（可同時帶任務清單） |
| POST | `/api/onboarding/projects/{id}/complete-task?task_id=N` | 完成單一任務 |
| GET | `/api/onboarding/risks` | 列出風險警示 |

## 4. BPM

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/bpm/requests` | 列出所有請求 |
| POST | `/api/bpm/requests` | 新增 Draft |
| POST | `/api/bpm/requests/{id}/submit` | 送審 |
| POST | `/api/bpm/requests/{id}/approve` | 核可（需 body 帶 approver） |
| POST | `/api/bpm/requests/{id}/reject` | 退回 |
| POST | `/api/bpm/requests/{id}/sync-to-bc` | Approved 後寫入 BC mock |

```json
// POST /api/bpm/requests
{
  "request_type": "VendorPayment",
  "title": "Cloud invoice March",
  "requester": "finance.user@partner.com",
  "amount": 24500,
  "currency": "USD",
  "approvers": ["manager@partner.com", "finance@partner.com"]
}
```

## 5. Automation

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/automation/workflows` | 列出 workflow definition |
| POST | `/api/automation/workflows` | 建立 workflow definition |
| POST | `/api/automation/workflows/{id}/run` | 手動觸發一次 |
| GET | `/api/automation/runs` | 列出最近 run + action timeline |

```json
// POST /api/automation/workflows
{
  "name": "Won opportunity -> Onboarding project",
  "description": "Auto create onboarding project for closed-won deals",
  "trigger": {"type": "event", "event": "opportunity.won"},
  "conditions": [{"path": "amount", "op": ">=", "value": 50000}],
  "actions": [
    {"type": "create_onboarding_project", "params": {"target_days": 60}},
    {"type": "send_notification", "params": {"to": "delivery@partner.com"}}
  ],
  "enabled": true
}
```

## 6. IT Operation Tickets

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/tickets` | 列出 ticket（會 refresh SLA 狀態） |
| POST | `/api/tickets` | 新增 ticket |
| POST | `/api/tickets/{id}/resolve` | 標記已解決 |

## 7. AI Assistant

| Method | Path | 用途 |
|---|---|---|
| POST | `/api/ai/customer-summary` | 客戶 360 摘要 |
| POST | `/api/ai/next-best-action` | 下一步建議 |
| POST | `/api/ai/meeting-notes-to-tasks` | 把會議筆記轉成任務 |
| POST | `/api/ai/risk-explanation` | 風險解釋 |

```json
// POST /api/ai/meeting-notes-to-tasks
{
  "notes": "- Follow up with Bryan\n- Schedule design review next Tuesday",
  "project_id": 1
}
```

## 8. Audit

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/audit-logs?entity_type=&action_type=&status=&limit=200` | 篩選 audit 事件 |

## 通用回應格式

- **2xx**：JSON object 或 array。
- **4xx**：`{ "detail": "..." }`。
  - 404：找不到資源。
  - 409：狀態衝突（例如試圖 submit 一個已 Approved 的請求）。
  - 403：簽核者不對。
- **5xx**：FastAPI 預設處理，不會洩漏 stack trace。
