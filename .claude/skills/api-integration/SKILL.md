---
name: api-integration
description: Design FastAPI endpoints and mock client integrations (Dataverse / Business Central / Power Automate) for this repo. Use when adding or modifying any /api/* route or service client.
---

# API Integration

## 何時使用
- 新增 REST endpoint（`/api/...`）。
- 修改 mock 連線器，讓未來能 swap 為真實服務。
- 變更 Pydantic schemas / response shape。

## 工作步驟
1. 在 `apps/api/app/routers/` 新增或修改檔案，使用 `APIRouter(prefix=..., tags=...)`。
2. 用 `Depends(get_db)` 注入 session；不要在 endpoint 開新 session。
3. 寫入資料時：
   - 透過 ORM (`models.*`)。
   - 呼叫 `audit.record_event` 記錄行為。
   - `db.commit()` 後 `db.refresh(obj)` 再回傳。
4. Schema：在 `apps/api/app/schemas.py` 用 `ConfigDict(from_attributes=True, use_enum_values=True)`。
5. 若是與外部系統整合，集中放在 `apps/api/app/services/<system>_client.py` 並支援 `mock`/`live` 兩種模式。
6. 寫 pytest（`tests/test_*.py`）至少覆蓋 happy path + 一個錯誤路徑。

## 品質標準
- HTTP status code 正確：201 for create、404 for missing、409 for state conflict、403 for auth issue。
- response model 一律用 `response_model=...` 標註。
- 路徑一律 kebab-case，且名詞為主（resource-based）。
- CORS / allowed origins 透過 settings 設定，不寫死。

## 禁止事項
- 不在 endpoint 直接呼叫 `print` / 直接組 SQL 字串。
- 不暴露內部 stack trace 到 client（FastAPI 預設處理交給 starlette）。
- 不為了測試方便註解掉 audit / commit。

## 輸出格式
- 新增的 route 列在 `docs/api.md`。
- 對應的 client 變更附簡短的 docstring 指出真實 endpoint。
