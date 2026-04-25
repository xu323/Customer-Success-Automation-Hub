# Customer Success Automation Hub

> 一個面向 **Microsoft Partner / MSP / Microsoft Solution** 場景的整合作品集專案。
> 模擬 Dynamics 365 CRM、Business Central、Power Automate、BPM、IT Operation
> 與 AI Assistant 的端到端 Customer Success 平台。

[![CI](https://github.com/xu323/Customer-Success-Automation-Hub/actions/workflows/ci.yml/badge.svg)](https://github.com/xu323/Customer-Success-Automation-Hub/actions/workflows/ci.yml)

---

## 為什麼建這個專案

我正在應徵 **系統開發工程師 - Dynamics 365 Business Central**。為了證明我能：

- 理解 **Microsoft Business Application** 的核心場景
  （Dynamics 365 Sales / Customer Service、Business Central、Power Automate、Dataverse）
- 設計企業級 **API + 流程引擎 + 前端 Dashboard** 的端到端架構
- 處理 **CRM Lead-to-Cash、Customer Onboarding、BPM 簽核、Business Central 同步**
- 寫得出讓**面試官、PM、客戶都看得懂的文件**

我用 mock connector 完整實作這個 Hub，
讓沒有真實 Dynamics 365 / Business Central tenant 的人也能在本機完整跑起來。
每個 mock 模組都註明了未來如何切換成真實服務。

---

## 一張圖看懂整個系統

```
                    ┌──────────────────────────────────────┐
                    │          React + TypeScript          │
                    │           Tailwind UI                │
                    │   (Executive Dashboard / 8 Pages)    │
                    └──────────────────┬───────────────────┘
                                       │ REST/JSON
                                       ▼
                    ┌──────────────────────────────────────┐
                    │           FastAPI + SQLAlchemy       │
                    │  CRM · Onboarding · BPM · Tickets    │
                    │  Workflow Engine · AI Assistant      │
                    │  Audit Log · Mock Connectors         │
                    └──────────────────┬───────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
   ┌─────────────────┐        ┌──────────────────┐        ┌──────────────────┐
   │  Dynamics CRM   │        │ Business Central │        │  Power Automate  │
   │   (mock)        │        │   (mock)         │        │   (mock)         │
   │ Dataverse Web   │        │ /api/v2.0/...    │        │ Logic App URL    │
   │   API v9.2      │        │  paymentJournals │        │  workflow trigger│
   └─────────────────┘        └──────────────────┘        └──────────────────┘
```

詳細圖請看 [docs/architecture.md](docs/architecture.md)。

---

## 主要功能

| 模組 | 對應 Microsoft 產品 | 本專案行為 |
|------|---------------------|-----------|
| CRM Lead-to-Cash | Dynamics 365 Sales / Dataverse | Lead → Opportunity → Quote → Won，Pipeline Kanban |
| Customer Onboarding | 自建 + Customer Insights 概念 | 專案進度 / 任務時間軸 / 健康分數 / 風險警示 |
| BPM 簽核 | Power Automate Approvals + BC | VendorPayment / EmployeePayment / TravelRequest，多階簽核 → 同步 BC |
| Workflow Engine | Power Automate cloud flows / RPA | JSON 驅動 trigger / condition / action 引擎 |
| Business Central Sync | Dynamics 365 Business Central | mock paymentJournals / purchaseInvoices |
| IT Operation Tickets | Service desk / SLA dashboards | severity / SLA badge / 自動建單 |
| AI Assistant | Copilot / OpenAI / Anthropic | mock provider 提供四種能力，可未來切換真實 LLM |
| Audit Logs | Dataverse audit / App Insights | 所有狀態變更都有事件紀錄 |

---

## 技術棧

- **Backend**：Python 3.11、FastAPI 0.115、SQLAlchemy 2.0、Pydantic v2、SQLite/PostgreSQL
- **Frontend**：React 18、TypeScript 5、Vite 5、TanStack Query、Tailwind CSS、React Router 6
- **DevOps**：Docker、Docker Compose、GitHub Actions、ruff、pytest、ESLint、tsc
- **AI**：可插拔的 mock provider，未來支援 OpenAI / Anthropic / Azure OpenAI

---

## 30 秒快速啟動 (PowerShell)

```powershell
# Backend
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (另開一個 PowerShell)
cd apps/web
npm install
npm run dev
```

開啟瀏覽器：

- API Docs：<http://localhost:8000/docs>
- Web UI：<http://localhost:5173>

完整步驟（給完全沒接觸過這套技術的人）請看 [使用方法.md](使用方法.md)。

---

## 一鍵 Docker

```powershell
docker compose up --build
```

會自動跑：

- PostgreSQL 16
- FastAPI Backend (8000)
- React Frontend (5173)

---

## Demo Script（面試展示順序）

1. **Executive Dashboard**：6 個 KPI 卡 + 最近 audit 事件。
2. **CRM Pipeline**：建一筆 Lead → Qualify → 看 Opportunity 出現 → Mark Won。
3. **Customer Onboarding**：剛剛 Won 自動建立的專案。
4. **BPM Requests**：建一筆 VendorPayment → 兩階簽核 → Sync to Business Central。
5. **Automation Flows**：手動觸發 `Won opportunity → Onboarding project` 看 timeline。
6. **IT Operation**：SLA 告警 → resolve。
7. **AI Assistant**：customer summary + meeting notes to tasks。
8. **Audit Logs**：證明每一步都有事件紀錄（compliance / SOC2 視角）。

---

## 文件導讀

| 檔案 | 用途 |
|------|------|
| [使用方法.md](使用方法.md) | **新手必讀**。從零安裝、操作、面試介紹一條龍 |
| [docs/architecture.md](docs/architecture.md) | 系統架構、資料流、整合點 |
| [docs/research-notes.md](docs/research-notes.md) | Microsoft 產品研究筆記 |
| [docs/api.md](docs/api.md) | REST API 一覽 + 範例 payload |
| [docs/workflow-engine.md](docs/workflow-engine.md) | JSON workflow DSL 與所有 action |
| [docs/security-notes.md](docs/security-notes.md) | Security IT / IT Operation 視角的設計 |
| [docs/interview-guide.md](docs/interview-guide.md) | 30 秒 / 3 分鐘 / 深度問答三段式講稿 |

---

## License

MIT — 純作品集用途。Microsoft 商標 / 產品名稱屬 Microsoft 所有。
