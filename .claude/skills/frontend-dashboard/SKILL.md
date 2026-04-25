---
name: frontend-dashboard
description: Implement or polish dashboard pages in apps/web. Use whenever a UI change is requested for CRM Pipeline, Onboarding, BPM, Automation, Tickets, AI, or Audit pages.
---

# Frontend Dashboard

## 何時使用
- 新增頁面或 KPI 卡片。
- 重構元件（共用 Card / Badge / Button / 狀態頁）。
- 串接新的 backend endpoint 並更新 `src/api/endpoints.ts`。

## 工作步驟
1. 先看 `src/components/` 既有共用元件：`Shell`, `Card`, `CardHeader`, `CardBody`, `Badge`, `Button`, `LoadingState`, `ErrorState`, `EmptyState`。
2. 串資料時使用 `@tanstack/react-query`：
   - `useQuery({ queryKey: [...], queryFn: ... })`。
   - 寫資料用 `useMutation` + `qc.invalidateQueries`，至少要 invalidate 對應 list 與 `["dashboard"]`。
3. UI 樣式遵守：
   - 暗色 Microsoft Partner 風格（`bg-ms-dark` / `border-ms-line`）。
   - 數字、金額用 `lib/format.ts` 提供的工具。
   - 狀態 badge 一律用 `Badge` 與 `statusTone`/`severityTone`/`riskTone` 函式。
4. 路由註冊在 `src/App.tsx`，sidebar 更新 `src/components/Shell.tsx`。
5. 一定要實作三種狀態：loading、error、empty。

## 品質標準
- 任何 fetch 必須有 ErrorState fallback。
- 所有按鈕在 mutation pending 時要 disable。
- 不直接使用 `fetch`，必須走 `src/api/client.ts` 與 `endpoints.ts`。
- TypeScript strict 模式必須 0 error。

## 禁止事項
- 不寫死 API base URL（用 `import.meta.env.VITE_API_BASE_URL`）。
- 不在元件內直接 try/catch + setState（讓 react-query 處理）。
- 不引入新的大型 UI lib（堅持 Tailwind + 自製元件）。

## 輸出格式
- 新增頁面：放在 `src/pages/`，並在 `App.tsx` 與 `Shell.tsx` 註冊。
- 共用元件：放在 `src/components/`。
- 文件：在 `使用方法.md` 對應段落補上操作步驟。
