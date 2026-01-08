# Start All Services as Network Host
# This script starts backend, frontend, and vision services for network access

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Dixi Services as Network Host" -ForegroundColor Cyan
Write-Host "Windows IP: 10.100.0.2" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptPath) {
    Set-Location $scriptPath
}

# Kill existing processes
Write-Host "Stopping existing services..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3000,3001,3002,5000 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

# Start Backend
Write-Host ""
Write-Host "Starting Backend on port 3001 (HTTP) and 3002 (WebSocket)..." -ForegroundColor Cyan
$backendPath = Join-Path $scriptPath "packages\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '=== Backend Service (Network Host: 10.100.0.2) ===' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend on port 3000..." -ForegroundColor Cyan
$frontendPath = Join-Path $scriptPath "packages\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '=== Frontend Service (Network Host: 10.100.0.2) ===' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 2

# Start Vision
Write-Host "Starting Vision Service on port 5000..." -ForegroundColor Cyan
$visionPath = Join-Path $scriptPath "packages\vision"
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} else {
    Write-Host "⚠️  Python not found. Skipping Vision Service." -ForegroundColor Yellow
    $pythonCmd = $null
}

if ($pythonCmd) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$visionPath'; Write-Host '=== Vision Service (Network Host: 10.100.0.2) ===' -ForegroundColor Cyan; $pythonCmd main.py"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Services Starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Three PowerShell windows have opened." -ForegroundColor Cyan
Write-Host ""
Write-Host "Network Access URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://10.100.0.2:3000" -ForegroundColor White
Write-Host "  Backend:  http://10.100.0.2:3001" -ForegroundColor White
Write-Host "  WebSocket: ws://10.100.0.2:3002" -ForegroundColor White
Write-Host "  Vision:    http://10.100.0.2:5000" -ForegroundColor White
Write-Host ""
Write-Host "Local Access URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Wait 15-20 seconds for services to start, then:" -ForegroundColor Cyan
Write-Host "  1. Open http://10.100.0.2:3000 in a browser" -ForegroundColor White
Write-Host "  2. Extend display to HDMI/projector" -ForegroundColor White
Write-Host "  3. Browser window will appear on projector" -ForegroundColor White
Write-Host ""


