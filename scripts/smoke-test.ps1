# Customer Success Automation Hub - smoke test
# 假設 backend (8000) 與 frontend (5173) 已經啟動 (uvicorn 與 npm run dev / preview)

$ErrorActionPreference = "Stop"
$apiBase = if ($env:API_BASE_URL) { $env:API_BASE_URL } else { "http://localhost:8000" }
$webBase = if ($env:WEB_BASE_URL) { $env:WEB_BASE_URL } else { "http://localhost:5173" }

function Check-Url {
    param(
        [string]$Label,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    Write-Host "→ $Label ($Url)" -ForegroundColor Cyan
    try {
        $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        if ($resp.StatusCode -eq $ExpectedStatus) {
            Write-Host "  OK $($resp.StatusCode)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  Unexpected status $($resp.StatusCode)" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "  FAILED: $_" -ForegroundColor Red
        return $false
    }
}

$results = @()

$results += Check-Url -Label "API health"          -Url "$apiBase/health"
$results += Check-Url -Label "API dashboard"       -Url "$apiBase/api/dashboard/summary"
$results += Check-Url -Label "API CRM leads"       -Url "$apiBase/api/crm/leads"
$results += Check-Url -Label "API BPM requests"    -Url "$apiBase/api/bpm/requests"
$results += Check-Url -Label "API workflows"       -Url "$apiBase/api/automation/workflows"
$results += Check-Url -Label "API tickets"         -Url "$apiBase/api/tickets"
$results += Check-Url -Label "API audit"           -Url "$apiBase/api/audit-logs?limit=5"

# Frontend - just check it serves HTML
$results += Check-Url -Label "Web root"            -Url $webBase

if ($results -contains $false) {
    Write-Host "`nSmoke test failed." -ForegroundColor Red
    exit 1
}

Write-Host "`nAll smoke checks passed." -ForegroundColor Green
