# Workflow Engine（mock Power Automate）

> 本專案的 workflow engine 透過 JSON 描述「當 X 發生 → 在 Y 條件下 → 做 Z」。
> 對應 Microsoft Power Automate 的 trigger / condition / action 概念，
> 但完全在本機運行、可 deterministic 重現。

實作位置：`apps/api/app/services/workflow_engine.py`。

## 1. JSON 結構

```json
{
  "name": "Approved BPM request -> Business Central",
  "description": "When a BPM request is approved, sync to BC",
  "trigger": { "type": "event", "event": "bpm.request.synced_to_bc" },
  "conditions": [
    { "path": "amount", "op": ">=", "value": 1000 }
  ],
  "actions": [
    { "type": "send_notification",
      "params": { "to": "finance@partner.com", "subject": "BC sync done" } }
  ],
  "enabled": true
}
```

## 2. Trigger types

| type | 說明 |
|------|------|
| `manual` | 只能透過 `POST /api/automation/workflows/{id}/run` 觸發 |
| `event` | 由 backend 內部呼叫 `dispatch_event(db, event_name, payload)` 觸發 |

目前內建 emit 的事件：

- `opportunity.won`：CRM `mark-won` 後觸發
- `bpm.request.synced_to_bc`：BPM sync to BC 後觸發
- `onboarding.task.overdue`：onboarding `complete-task` 偵測到逾期任務時觸發

新增 trigger 事件只需要在對應 router 呼叫 `dispatch_event(...)`。

## 3. Conditions

每個 condition 由三個欄位組成：`path`、`op`、`value`。
`path` 支援 dotted 路徑，例如 `account.name`。

| op | 行為 |
|----|------|
| `==` `!=` | 等值比對 |
| `>` `>=` `<` `<=` | 數值比較（None 視為失敗） |
| `in` | actual 是否在 list 內 |
| `contains` | string contains（actual 為 None 視為空字串） |
| `exists` | path 是否解析得到 non-None |

所有 conditions 為 AND 邏輯；任一失敗 → run 跳過剩餘 actions，留下 `condition_skip` 紀錄。

## 4. Actions

| type | 必填 params | 行為 |
|------|-------------|------|
| `create_onboarding_project` | (optional) `project_name`, `target_days`, `owner`, `tasks` | 建立 onboarding 專案 + 預設 6 個 task |
| `create_risk_alert` | (optional) `level`, `title`, `description`, `project_id` | 在 `risk_alerts` 表新增警示 |
| `create_ticket` | (optional) `title`, `severity`, `sla_hours` | 新增 IT operation ticket |
| `sync_to_business_central` | (optional) `request_type`, `extra` | 呼叫 mock BC client 寫入帳本 |
| `send_notification` | `to`, `subject` (optional `body`) | mock 寄送通知 |
| `call_power_automate_flow` | `flow_name` | 呼叫 mock PA client |
| `http_post` | `url` (optional `headers`, `body`) | 只記錄不會真的打網路 |

新增 action 步驟見 `.claude/skills/bpm-workflow-automation/SKILL.md`。

## 5. Run 結構

每次 run 會在 `workflow_runs` 表寫入一筆紀錄，並把 actions 拆成 `workflow_action_logs`。
Audit log 會額外寫 `workflow.run.started` / `workflow.run.finished` / `workflow.run.failed`。

```
Run #5  succeeded  triggered=event:opportunity.won
  ├─ #1 create_onboarding_project   ok    {project_id: 8, tasks_created: 6}
  └─ #2 send_notification            ok    {to: delivery@partner.com}
```

## 6. 範例：成交後自動新增 onboarding

seed.py 內已包含的範例：

```json
{
  "name": "Won opportunity -> Onboarding project",
  "trigger": { "type": "event", "event": "opportunity.won" },
  "conditions": [{ "path": "amount", "op": ">=", "value": 50000 }],
  "actions": [
    { "type": "create_onboarding_project", "params": { "target_days": 60 } },
    { "type": "send_notification", "params": {
      "channel": "email",
      "to": "delivery@partner.com",
      "subject": "New onboarding project created"
    }}
  ]
}
```

操作步驟：

1. 進 CRM 頁，選任一 opportunity 按「Mark won」。
2. 進 Onboarding 頁，看到自動建立的專案。
3. 進 Audit Logs 頁，看 `workflow.run.started/finished` 與 `lead.qualified`。

## 7. 設計取捨

- 不引入 Celery / Airflow：本專案重點在 demo workflow 概念，不要拖累單機展示。
- 不做 retry / backoff：Power Automate 真實環境會做；mock engine 只示意。
- 不允許在 action 內無限制呼叫外部 HTTP：`http_post` 只 log，避免 demo 時誤打到網路。
