# 系統架構（Solution Architecture）

> 本文件給 PM、面試官與後續維運接手者看。所有圖以 ASCII 為主，
> 方便不需任何畫圖工具就能讀懂。

## 1. 高階組件圖

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Presentation (Web UI)                          │
│  React 18 · TypeScript · Vite · Tailwind · TanStack Query            │
│  Pages: Dashboard / CRM / Onboarding / BPM / Automation / Tickets    │
│         AI Assistant / Audit Logs                                    │
└──────────────────────────────────────────────────────────────────────┘
                              │ REST / JSON over HTTP(S)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Application (FastAPI)                          │
│  Routers (CRM, Onboarding, BPM, Automation, Tickets, AI, Audit,      │
│   Dashboard, Health)                                                 │
│  Services (workflow_engine, ai_assistant, mock CRM/BC/PA clients)    │
│  Cross-cutting: audit.record_event, settings, CORS                   │
└──────────────────────────────────────────────────────────────────────┘
       │                    │                    │                  │
       ▼                    ▼                    ▼                  ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐  ┌────────────┐
│  Dataverse /  │    │   Business    │    │     Power     │  │   AI LLM   │
│ Dynamics CRM  │    │    Central    │    │   Automate    │  │ (mock /    │
│   (mock)      │    │    (mock)     │    │    (mock)     │  │  future)   │
└───────────────┘    └───────────────┘    └───────────────┘  └────────────┘
       │                    │                    │
       └─── mock ledgers / in-memory invocation history ──┐
                                                          ▼
                              ┌───────────────────────────────────┐
                              │ SQL DB (SQLite default / Postgres) │
                              │ accounts, leads, opportunities,    │
                              │ quotes, onboarding_*, bpm_*,       │
                              │ workflow_*, tickets, audit_logs    │
                              └───────────────────────────────────┘
```

## 2. 模組職責表

| 層 | 模組 | 職責 |
|---|---|---|
| Web | `apps/web/src/pages/*` | 8 個頁面，全部用 react-query 拉資料 |
| Web | `apps/web/src/components/*` | Card / Badge / Button / Shell / 狀態頁等共用元件 |
| Web | `apps/web/src/api/*` | 集中 API Client、type-safe endpoint |
| API | `app/main.py` | FastAPI app、CORS、lifecycle、seed |
| API | `app/routers/*` | HTTP layer，一個資源一個檔 |
| API | `app/services/workflow_engine.py` | trigger/condition/action 引擎 |
| API | `app/services/ai_assistant.py` | mock AI provider，可換成 LLM |
| API | `app/services/{crm,business_central,power_automate}_client.py` | 對應 Microsoft 服務的 mock 連線器 |
| API | `app/audit.py` | 集中 audit log helper |
| API | `app/seed.py` | 啟動時 idempotent demo data |
| Infra | `docker-compose.yml` | 一鍵啟動 db + api + web |
| Infra | `.github/workflows/ci.yml` | lint / test / build / docker / docs |

## 3. 主要資料流

### 3.1 Lead-to-Cash + Onboarding

```
Web POST /api/crm/leads
   └─► CRM router 建立 Lead, audit log
Web POST /api/crm/leads/{id}/qualify
   └─► CRM router 建立 Account（如果沒有）+ Opportunity, audit log
Web POST /api/crm/quotes
   └─► CRM router 建立 Quote
Web POST /api/crm/opportunities/{id}/mark-won
   └─► CRM router 標記 Won + dispatch_event("opportunity.won", payload)
        └─► workflow_engine 執行所有監聽 opportunity.won 的 workflow
             └─► action: create_onboarding_project
                  └─► 在 onboarding_projects 表新增專案 + 6 個 task
             └─► action: send_notification (mock log)
```

### 3.2 BPM → Business Central

```
Web POST /api/bpm/requests           (Draft)
Web POST /api/bpm/requests/{id}/submit  (Submitted)
Web POST /api/bpm/requests/{id}/approve x N  (Approved)
Web POST /api/bpm/requests/{id}/sync-to-bc
   └─► business_central_client.push_*  (mock ledger)
   └─► 標記 Completed + bc_sync_reference
   └─► dispatch_event("bpm.request.synced_to_bc", payload)
```

### 3.3 Workflow run timeline

```
runs.started_at ──► run conditions
                    ├─ skipped → 寫 WorkflowActionLog (sequence=0, status=skipped)
                    └─ pass → 依 actions[] 順序：
                              ├─ ok    → WorkflowActionLog (status=ok)
                              └─ raise → run.status=failed, audit error
runs.finished_at
```

## 4. 技術選型理由（trade-offs）

| 選擇 | 替代方案 | 為什麼選這個 |
|---|---|---|
| FastAPI | Flask / Django | async-ready、自動 OpenAPI、Pydantic v2 整合好 |
| SQLAlchemy 2.0 ORM | raw SQL | 跟 Dataverse 思維接近，模型可讀性佳 |
| SQLite + Postgres | 只 Postgres | demo 不要 docker；正式可平移 |
| React Query | redux | server state cache、自動 invalidation 不用手動寫 dispatch |
| Tailwind | Material UI | 視覺接近 Microsoft Partner 設計，bundle 體積小 |
| JSON workflow DSL | 程式碼寫 hard-coded rule | 對齊 Power Automate 的「flow as data」精神 |
| Mock connectors | 直接接 Dataverse | 面試官可離線 demo、避免外洩 tenant secret |

## 5. Sequence diagram - 完整 demo 路徑

```
User       Web (React)        API (FastAPI)        Workflow Engine        BC Mock
 │             │                   │                       │                  │
 │ Click "Mark won"                │                       │                  │
 │────────────►│                   │                       │                  │
 │             │ POST /opps/X/won  │                       │                  │
 │             │──────────────────►│ stage=won, audit      │                  │
 │             │                   │ dispatch_event("opportunity.won")        │
 │             │                   │──────────────────────►│ run conditions   │
 │             │                   │                       │ create_onboarding│
 │             │                   │◄──────────────────────│ done             │
 │             │◄──────────────────│ Opportunity (won)     │                  │
 │             │ refetch dashboard, onboarding             │                  │
 │             │──────────────────►│                       │                  │
 │             │ ⏎                 │                       │                  │
 │ Switch to "BPM" page            │                       │                  │
 │ Submit & approve a request      │                       │                  │
 │────────────►│ POST .../sync-to-bc                       │                  │
 │             │──────────────────►│ → push_vendor_payment──────────────────►│
 │             │                   │◄──────── BC-VP-xxx ───┐                  │
 │             │                   │ dispatch_event("bpm.request.synced_to_bc")
 │             │◄──────────────────│ Completed              │                  │
```

## 6. 擴充策略

- **多租戶 / Auth**：建議在 FastAPI 前面架 API Management，後端套 OAuth2 dependency。
- **訊息佇列**：把 `dispatch_event` 改成丟到 Service Bus / Kafka，由 worker 消費。
- **觀測性**：audit log 表已存在，可外接 Application Insights 或 Loki。
- **真實 Microsoft 服務**：見 `services/*_client.py` 內的 docstring 與 `docs/research-notes.md`。
