# Security & IT Operation 設計備註

> 這份文件記錄系統在 Security IT / IT Operation 面向的設計考量，
> 以及目前實作與未來上線需要補的安全控制。

## 1. 已落實的最佳實務

| 控制 | 實作位置 |
|------|----------|
| Secret 不寫死 | `apps/api/app/config.py` 透過 pydantic-settings 載入 env；`.env.example` 只放範例值 |
| `.env` 不入 git | `.gitignore` 排除 `.env`、`.env.*.local` |
| CORS 白名單 | `cors_allow_origins` 由 env 控制，前端 dev server 預設只放 5173 |
| SQL Injection | 全程 SQLAlchemy ORM，無 raw string SQL；filter 使用 `Model.column` 參數綁定 |
| 錯誤訊息不洩漏 stack trace | 透過 FastAPI / starlette 預設處理，不在 endpoint 自行 dump exception |
| Audit log | 每個資源變動呼叫 `audit.record_event`，可追到 actor / action / status |
| Mock connectors | 預設不會打到真實 Microsoft tenant，避免誤用 token |
| Docker images | 沒有 root 安裝來源不明套件；只用 `python:3.11-slim` 與 `node:20-alpine` |
| Health endpoint | `/health` 給 docker / k8s probe，避免額外暴露管理端點 |

## 2. 已知限制（demo 模式刻意保留）

- 沒有使用者認證 / RBAC：demo 配置，本機環境可單機跑。
- BPM approver 只比對字串：`approve_request` 用 `step.approver != body.approver` 防誤按，
  正式版需綁 Entra ID UPN。
- SQLite 預設無加密；Postgres docker compose 用明碼密碼（demo 用）。

## 3. 上線正式環境的升級路徑

### 3.1 認證與授權（Entra ID / OAuth）

1. 在 Entra ID 建立 App Registration。
2. FastAPI 加上 `fastapi-azure-auth` 或 `msal` 驗證 Bearer token，依 group claim 決定 RBAC。
3. 前端用 MSAL.js 取 token，在 `api/client.ts` 加 `Authorization: Bearer ...`。

### 3.2 Secrets / Key Vault

1. 把 `DATABASE_URL`、`AI_*_KEY`、`DYNAMICS_CLIENT_SECRET`、`BC_CLIENT_SECRET`
   全部移到 Azure Key Vault。
2. App Service / Container Apps 透過 Managed Identity 拉 secret。
3. Local 開發改用 `az keyvault secret show` + `dotenv` 注入。

### 3.3 API Management / WAF

1. 把 FastAPI 放在 Azure API Management 之後，集中限流（ rate limit / IP allow ）。
2. 啟用 Azure Front Door + WAF rules。
3. 替 Web 注入 CSP / X-Frame-Options / HSTS（用 reverse proxy）。

### 3.4 觀測性

1. App Insights SDK + OpenTelemetry。
2. 把 `audit_logs` 表的內容透過 Logic App / Function 同步到 Sentinel。
3. Power BI dashboard 顯示 SLA 與 audit volume。

### 3.5 資料保護

1. PostgreSQL 啟用 TDE / Azure Database for PostgreSQL flexible server 自帶加密。
2. 客戶資料欄位（email、phone）使用 Azure SQL Always Encrypted 或 application-layer encryption。
3. PII 欄位在 audit log 寫入前 redact（已預留 payload field 可加 hash）。

## 4. IT Operation 視角

- **Runbook**：所有自動建立的 ticket 來自 workflow，工程師可在 dashboard 直接 resolve。
- **SLA 計算**：`/api/tickets` 每次 GET 會更新 `sla_status`；breach 後 dashboard `breached_tickets` 立刻反映。
- **災難復原**：SQLite 模式可直接複製 `.db` 檔；Postgres 模式建議定期 `pg_dump`。
- **Healthcheck**：Docker `HEALTHCHECK` 打 `/health`；compose `db` 用 `pg_isready`。

## 5. Dependency / Supply chain

- requirements.txt 與 package.json 都 pin 到具體版本。
- CI 跑 ruff、tsc、build、docker build；任何套件升級都會被 CI 檢核。
- 建議定期啟動 Dependabot / Renovate（GitHub 內建）。
