# 專案導覽（Project Guide）

> 給新加入者、客戶 stakeholder、或想 5 分鐘內了解這個系統的人。
> 包含三層深度：一段話 → 操作導覽 → 設計決策 FAQ。

---

## A. 一段話介紹

> Customer Success Automation Hub 是一個 Microsoft Partner / MSP 顧問場景的整合系統，
> 串接 Dynamics 365 CRM、Business Central、Power Automate 與 BPM。
> 後端是 FastAPI + SQLAlchemy，包含 CRM Lead-to-Cash、Customer Onboarding、BPM 簽核、
> JSON workflow engine、Business Central mock sync、IT Operation tickets、AI Assistant
> 與 audit log。前端是 React + TypeScript + Tailwind 的企業 Dashboard，並支援
> 繁體中文 / English / 日本語三語系切換。整體支援 SQLite 與 PostgreSQL，
> docker compose 一鍵啟動，GitHub Actions CI/CD 跑 lint / 測試 / build / 推 image 到 GHCR。
> 所有 Microsoft 連線器都有 mock 模式，無需 tenant 即可 demo，並保留切換真實服務的設定。

---

## B. 三分鐘端到端操作導覽

跟著這個順序操作一輪，可以體驗完整的系統能力。

1. **動機（30 秒）**
   - 本系統涵蓋 Microsoft Solution、Dynamics 365 BC、CRM、Power Automate、BPM、Hybrid Cloud、
     IT Operation、Security IT 與 AI 工具的服務範疇，目的是用一個專案展示這幾條服務線
     如何在同一個平台中協作。

2. **整體架構（30 秒）**
   - 後端 FastAPI + SQLAlchemy 提供 REST API，前端 React + TypeScript + Tailwind 的 dashboard。
   - 每個 Microsoft 服務（Dataverse / Business Central / Power Automate）都有 mock client，
     程式上保留真實連線的 docstring，未來只要把 mode 從 mock 改成 live、填 OAuth 設定就能切換。

3. **CRM Lead-to-Cash（30 秒）**
   - 在 CRM Pipeline 頁建一筆 Lead → Qualify 變成 Opportunity → Mark won。
   - 標記 Won 的瞬間後端發 `opportunity.won` event，
     workflow engine 自動建立 Customer Onboarding 專案。

4. **BPM → Business Central（30 秒）**
   - 切到 BPM Requests，新增 VendorPayment → 兩階簽核 → Sync to Business Central。
   - 同步完成顯示一個 BC 文件編號（mock），audit log 與 dashboard KPI 立刻反映。

5. **Workflow / Automation Flow（30 秒）**
   - Automation Flows 頁可看到三個 seed workflow，按 Run 會跑出時間軸：
     conditions、各 action 的 input/output、status badge。
   - 設計是 JSON DSL 對齊 Power Automate 的「flow as data」精神。

6. **AI、Audit、Compliance（30 秒）**
   - AI Assistant 預設 mock provider，可即時生成客戶摘要 / 下一步建議 / 會議筆記轉任務 / 風險解釋。
   - Audit Logs 頁面把所有 CRM / BPM / Automation / Tickets 的事件聚合，有 entity / action / status filter。
   - 從 Security 視角：所有 secret 都從 env 載入，CORS 白名單、SQL injection 透過 ORM 防範，
     未來 Entra ID / Key Vault / API Management 的升級路徑寫在 docs/security-notes.md。

---

## C. 設計決策 FAQ

### Q1. 怎麼處理 Dynamics 365 / BC 的真實 API 認證？
- Microsoft Entra ID 的 client credentials grant，scope 對應每個服務。
- Token 由一個 `_token_provider` cache，過期前 5 分鐘自動 refresh。
- 透過 Managed Identity 拿 secret，不在容器內存放 client_secret。

### Q2. 為什麼要自己寫 workflow engine 而不是直接接 Power Automate？
- 第一，系統要能離線跑；外部 Logic App URL 不一定隨時可得。
- 第二，自己實作一遍能完整控制 trigger / condition / action 三件套的行為。
- 第三，未來其中某些 action（例如 sync_to_business_central）可以同時有 mock 與 live 實作，
  在客戶 onboarding 時可以平滑切換。

### Q3. 怎麼確保資料一致？
- 每個 router 在同一個 SQLAlchemy session 內 `flush` 多次但只 `commit` 一次，
  對應到 Microsoft Dataverse 的 transaction 概念。
- workflow engine 也是同一 session 內執行 actions，最後在 router 統一 commit。
- 出錯時 `run.status = failed` 並寫 audit log，state 不會留半成品。

### Q4. 怎麼擴展給多客戶 / 多租戶？
- DB 加 `tenant_id` 欄位，FastAPI 加一層 `Depends(current_tenant)`。
- 連線器（CRM / BC）改為 per-tenant 的 client cache。
- 把 dispatch_event 換成 Service Bus / Kafka，每個 tenant 一個 partition。
- API Management 處理限流。

### Q5. 怎麼跟 PM / 客戶說明這個系統？
- 用三張圖：高階組件圖、Lead-to-Cash 流程圖、BPM 流程圖（都在 docs/architecture.md）。
- 每個 KPI 卡片在 Dashboard 都有對應 audit 事件，可以追溯每個數字的來源。
- BPM 簽核完成後產生的 BC 文件編號可作為與 finance 對帳的依據。

### Q6. 為什麼測試覆蓋只到關鍵路徑？
- 目前涵蓋 health / CRM Lead-to-Quote / BPM 全流程 /
  workflow engine 的 happy 與 fail / dashboard / AI 假回應這 6 個關鍵場景。
- 真實上線會在每個 endpoint 增加 boundary cases、權限檢查、rate limit 測試。

### Q7. 為什麼選 FastAPI + Python 而不是 .NET / Node？
- FastAPI + Pydantic v2 寫得最少程式碼、自帶 OpenAPI / Swagger。
- 同樣概念可無縫遷移到 .NET（C# / ASP.NET Core）：
  EF Core 取代 SQLAlchemy、MediatR 取代 dispatch_event、Hangfire 取代 workflow engine。
- 重點是技術棧之外的整合設計與架構決策。

### Q8. Customer / Communication / Change / Innovation 在系統裡如何體現？
- **Customer**：所有 KPI、health score、SLA 指標都站在客戶角度。
- **Communication**：audit log 是給 PM、客戶、稽核者看的「對外語言」。
- **Change**：mock → live 切換寫在文件，給接手者明確 migration plan。
- **Innovation**：自製 workflow engine + 可插拔 AI provider 是延伸服務的差異化點。

---

## D. Demo 操作建議

- 啟動順序：先 backend，再 frontend，再從 CRM 頁開始操作。
- Docker compose 啟動最穩，但首次 build 約 60 秒。
- 短時間（5 分鐘）演示建議路徑：
  Executive Dashboard → CRM Pipeline → BPM Requests → Audit Logs。
- 完整路徑請參考本文件 B 段。
