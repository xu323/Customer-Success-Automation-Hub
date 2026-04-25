# Customer Success Automation Hub - one-shot dev environment setup (Windows + PowerShell)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Project root: $root" -ForegroundColor Cyan

# 1. Copy .env if missing
$envFile = Join-Path $root ".env"
$envExample = Join-Path $root ".env.example"
if (-Not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host ".env created from .env.example" -ForegroundColor Green
} else {
    Write-Host ".env already exists, leaving untouched" -ForegroundColor Yellow
}

# 2. Backend
$apiDir = Join-Path $root "apps/api"
Write-Host "`n--- Backend setup ---" -ForegroundColor Cyan
Set-Location $apiDir

if (-Not (Test-Path ".venv")) {
    python -m venv .venv
}
& .\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip | Out-Null
pip install -r requirements.txt
Write-Host "Backend deps installed." -ForegroundColor Green

# 3. Frontend
$webDir = Join-Path $root "apps/web"
Write-Host "`n--- Frontend setup ---" -ForegroundColor Cyan
Set-Location $webDir

npm install
Write-Host "Frontend deps installed." -ForegroundColor Green

Write-Host "`nDone. Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open a PowerShell at apps/api and run: uvicorn app.main:app --reload --port 8000" -ForegroundColor Gray
Write-Host "  2. Open another PowerShell at apps/web and run: npm run dev" -ForegroundColor Gray
Write-Host "  3. Visit http://localhost:5173" -ForegroundColor Gray
