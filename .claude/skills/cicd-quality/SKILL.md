---
name: cicd-quality
description: Maintain CI workflows, Docker images, and quality gates. Use whenever you change CI yaml, Dockerfiles, requirements.txt, or package.json.
---

# CI/CD & Quality

## 何時使用
- 變更 `.github/workflows/ci.yml`。
- 變更 backend `requirements.txt` 或 frontend `package.json`。
- 新增 / 移除 Dockerfile。
- 想跑 smoke test 在本機驗證 demo。

## 工作步驟
1. 後端依賴改動：
   - 更新 `apps/api/requirements.txt`，固定版本。
   - 確認 `ruff` 與 `pytest` 在本機通過再 commit。
2. 前端依賴改動：
   - 更新 `apps/web/package.json`，盡量保留版本範圍。
   - 跑 `npm run typecheck && npm run build` 確認無錯。
3. CI yaml：
   - jobs 命名為 `backend-ci`、`frontend-ci`、`docker-build`、`docs-check`。
   - 透過 `actions/setup-python@v5` / `actions/setup-node@v4` 設定 cache。
4. Docker：
   - backend 跑 `uvicorn app.main:app --host 0.0.0.0 --port 8000`。
   - frontend 用 multi-stage build (`node:20-alpine` + `serve`)。
5. Smoke test：執行 `scripts/smoke-test.ps1`，預期通過。

## 品質標準
- Lock file（`package-lock.json`）必須 commit。
- 任一 job 失敗都不能合進 main。
- Docker 鏡像必須有 healthcheck。
- 所有 secret 必須來自 env 或 GitHub Actions secrets。

## 禁止事項
- 不在 CI 內安裝隨意的 GitHub Action（必須是官方或認可作者）。
- 不停用 lint / test 來繞過錯誤。

## 輸出格式
變更 ci.yml + Dockerfile + requirements/package 後，請在 PR 描述列出所有受影響檔案。
