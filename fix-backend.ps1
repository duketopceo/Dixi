# Fix Backend Issues - Check and Restart
# This script helps diagnose and fix backend connection issues

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend Diagnostic & Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ports are in use
Write-Host "Checking ports..." -ForegroundColor Yellow
$ports = @(3001, 3002)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $process = Get-Process -Id $connections[0].OwningProcess -ErrorAction SilentlyContinue
        Write-Host "  Port $port: IN USE by $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
    } else {
        Write-Host "  Port $port: AVAILABLE" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Testing backend endpoints..." -ForegroundColor Yellow

# Test backend health
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Backend Health: OK (Status: $($healthResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Backend Health: NOT RESPONDING" -ForegroundColor Red
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test WebSocket (can't easily test in PowerShell, but check if port is listening)
$wsConnection = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($wsConnection) {
    Write-Host "  ✅ WebSocket Port 3002: LISTENING" -ForegroundColor Green
} else {
    Write-Host "  ❌ WebSocket Port 3002: NOT LISTENING" -ForegroundColor Red
    Write-Host "     The WebSocket server may not have started properly" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Testing Vision Service..." -ForegroundColor Yellow
try {
    $visionResponse = Invoke-WebRequest -Uri "http://localhost:5000/status" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Vision Service: OK (Status: $($visionResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Vision Service: NOT RESPONDING (optional)" -ForegroundColor Yellow
    Write-Host "     This is OK if you're not using gesture tracking" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Recommendations:" -ForegroundColor Yellow
Write-Host ""

# Check if backend process is running
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*Dixi*backend*" -or 
    (Get-NetTCPConnection -OwningProcess $_.Id -LocalPort 3001 -ErrorAction SilentlyContinue)
}

if (-not $nodeProcesses) {
    Write-Host "  ❌ Backend is NOT running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  To start backend:" -ForegroundColor Cyan
    Write-Host "    cd packages\backend" -ForegroundColor White
    Write-Host "    npm run dev" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "  ✅ Backend process is running" -ForegroundColor Green
    Write-Host ""
    Write-Host "  If you're still seeing errors:" -ForegroundColor Yellow
    Write-Host "    1. Check the backend terminal for error messages" -ForegroundColor White
    Write-Host "    2. Make sure WebSocket server started (look for 'WebSocket server listening')" -ForegroundColor White
    Write-Host "    3. Restart backend: .\stop-all.ps1 then .\start-dev.ps1" -ForegroundColor White
}

Write-Host ""

