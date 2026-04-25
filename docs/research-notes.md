# Microsoft 商業應用研究筆記

> 這份文件整理本專案參考的 Microsoft 官方概念與 API。
> 所有 mock 模組的 docstring 都會回到這裡找對應 endpoint。

## 1. Dynamics 365 Sales / Customer Engagement (Dataverse)

### 1.1 概念
Dynamics 365 Sales 是 Microsoft 的 CRM SaaS，底層是 **Dataverse**（前身為 Common Data Service）。
業務員的日常 entity 就是 lead → opportunity → quote → order → invoice。

▸ Lead 不擔保金額或機率，只負責「值不值得花時間」。
▸ Opportunity 才有 estimated revenue、probability、close date、stage。
▸ Quote 是真正能給客戶看的報價單，可選 line items，狀態是 draft / sent / accepted / lost。

### 1.2 主要 API
- 以 `https://<org>.crm.dynamics.com/api/data/v9.2/` 為 base。
- `POST /leads`、`POST /opportunities`、`POST /quotes`、`PATCH /opportunities({id})`。
- 認證走 Microsoft Entra ID OAuth2 client credentials；scope 是 `https://<org>.crm.dynamics.com/.default`。
- Throttle：每使用者每 5 分鐘約 60,000 requests，超出回 429。
- 參考：<https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview>

### 1.3 與本專案的對應
- mock client：`apps/api/app/services/crm_client.py`。
- 真實切換：把 `_singleton` 的建立改為使用 `httpx.Client(base_url, headers={"Authorization": "Bearer ..."})`，
  並把 `upsert_lead` / `upsert_opportunity` 內容換成 `client.post("/leads", json=...)`。

---

## 2. Microsoft Dynamics 365 Business Central

### 2.1 概念
Business Central 是 Microsoft 中小企業 ERP。常見模組：Sales、Purchase、Finance、Inventory。
顧問日常做的整合是把外部系統的單據（採購、付款、員工費用）寫進 BC 的 journal。

▸ paymentJournals：付款日記簿，存 vendor payment。
▸ purchaseInvoices：採購發票。
▸ companies：BC 是 multi-company，呼叫 API 時必須指定 companyId。

### 2.2 主要 API
```
GET  /v2.0/{tenantId}/{environment}/api/v2.0/companies
POST /v2.0/{tenantId}/{environment}/api/v2.0/companies({companyId})/paymentJournals
POST /v2.0/{tenantId}/{environment}/api/v2.0/companies({companyId})/purchaseInvoices
```

- 認證：Entra ID OAuth2 + Business Central app registration。
- Scope：`https://api.businesscentral.dynamics.com/.default`。
- 參考：<https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/>

### 2.3 與本專案的對應
- mock client：`apps/api/app/services/business_central_client.py`。
- 真實切換時：BPM 請求被 sync-to-bc 後改用 `httpx.post(...)` 打到 `paymentJournals`，
  把回傳的 `id` 存進 `bpm_requests.bc_sync_reference`。

---

## 3. Power Automate / Power Platform

### 3.1 概念
Power Automate 是低程式碼的工作流程引擎。三種 flow：
- **Cloud flow**：跑在 Azure Logic Apps engine，trigger → conditions → actions。
- **Desktop flow (RPA)**：跑在使用者本機，操作 GUI。
- **Business process flow (BPF)**：在 Dataverse UI 上面顯示的階段條。

▸ 一個 flow 由 trigger（手動 / Dataverse 變動 / 排程 / HTTP）+ 多個 connector 組成。
▸ Approval connector 是顧問最常用的：寄 email / Teams 卡片，等簽核者按按鈕。
▸ Trigger 後可在 30 天內 retry / replay。

### 3.2 主要 API
- HTTP trigger flow 提供一段 Logic App URL，POST JSON 即可觸發：
  ```
  POST https://prod-xx.westus.logic.azure.com:443/workflows/<id>/triggers/manual/paths/invoke
       ?api-version=2016-10-01&sp=...&sv=...&sig=...
  ```
- 也可以透過 Microsoft Graph 的 `cloudCommunications` 接 Teams 卡片。
- 參考：<https://learn.microsoft.com/en-us/power-automate/>

### 3.3 與本專案的對應
- mock client：`apps/api/app/services/power_automate_client.py`。
- 自製 workflow engine：`apps/api/app/services/workflow_engine.py`，
  支援 `event` trigger、`>= == > < contains in exists` 條件，與 7 個 actions。
- 未來改打真實 Logic App URL，可在 `_action_call_power_automate_flow` 內 `httpx.post`。

---

## 4. Microsoft Entra ID (Azure AD) 認證

### 4.1 概念
Microsoft 商業雲的單一認證來源。整合流程：
1. 在 Entra ID 註冊 App。
2. 設定 API permissions（Dataverse / Business Central / Graph）。
3. 後端用 client credentials grant 拿 token。
4. Token 放 `Authorization: Bearer ...` 呼叫 API。

### 4.2 主要 endpoint
```
POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
Body: grant_type=client_credentials&client_id=...&client_secret=...&scope=...
```

### 4.3 與本專案的對應
- 目前所有 mock 模組都跳過 OAuth。
- 切到 live 時建議：寫一個 `app/services/_token_provider.py`，cache token 到過期前 5 分鐘自動 refresh。
- 詳細落地步驟見 `docs/security-notes.md`。

---

## 5. Dataverse / Audit / Compliance

### 5.1 概念
Dataverse 提供原生 audit log 功能，可在每張 table 開啟，記錄誰在何時改了什麼欄位。
Microsoft Purview 與 Microsoft Sentinel 可進一步集中監控。

### 5.2 與本專案的對應
- 自建 `audit_logs` 表（`models.AuditLog`），每筆 router 行為呼叫 `audit.record_event`。
- 未來可改寫成轉發到 Application Insights / Sentinel。

---

## 6. 對照表：mock vs real

| 領域 | mock 檔案 | real endpoint | scope |
|------|-----------|---------------|-------|
| CRM | `services/crm_client.py` | `https://<org>.crm.dynamics.com/api/data/v9.2/leads` | `<org>/.default` |
| BC  | `services/business_central_client.py` | `https://api.businesscentral.dynamics.com/v2.0/{tenant}/{env}/api/v2.0/companies({id})/paymentJournals` | `https://api.businesscentral.dynamics.com/.default` |
| Power Automate | `services/power_automate_client.py` | Logic App HTTP trigger URL | (URL 內含 SAS) |
| AI | `services/ai_assistant.py` | OpenAI / Anthropic / Azure OpenAI | provider 各自 |

---

## 7. 後續研究待辦

- [ ] Dataverse change tracking（webhook / odata-deltatoken）。
- [ ] Business Central API for Purchase Order 完整生命週期。
- [ ] Power Automate Desktop flow remote trigger（適合 RPA 場景）。
- [ ] Customer Insights — Journeys（取代過去的 Marketing 模組）。
