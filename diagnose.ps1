# Comprehensive Dixi Service Diagnostic
# Run this to check all services and identify issues

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dixi Service Diagnostic" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check all services
Write-Host "Service Status:" -ForegroundColor Yellow
Write-Host ""

# Frontend (3000)
$frontend = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($frontend) {
    Write-Host "  ✅ Frontend (3000): RUNNING" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend (3000): NOT RUNNING" -ForegroundColor Red
}

# Backend HTTP (3001)
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Backend HTTP (3001): RUNNING" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Backend HTTP (3001): NOT RUNNING" -ForegroundColor Red
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# WebSocket (3002)
$ws = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
if ($ws) {
    Write-Host "  ✅ WebSocket (3002): LISTENING" -ForegroundColor Green
} else {
    Write-Host "  ❌ WebSocket (3002): NOT LISTENING" -ForegroundColor Red
    Write-Host "     This is likely why you're seeing WebSocket errors!" -ForegroundColor Yellow
}

# Vision Service (5000)
try {
    $vision = Invoke-WebRequest -Uri "http://localhost:5000/status" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Vision Service (5000): RUNNING" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Vision Service (5000): NOT RUNNING (optional)" -ForegroundColor Yellow
    Write-Host "     Gesture analysis will fail without this" -ForegroundColor Gray
}

# Ollama (11434) - Optional
try {
    $ollama = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Ollama (11434): RUNNING" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Ollama (11434): NOT RUNNING (optional)" -ForegroundColor Yellow
    Write-Host "     AI features won't work without this" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Issues Found:" -ForegroundColor Yellow
Write-Host ""

$issues = @()

if (-not $frontend) {
    $issues += "Frontend not running"
}

if (-not $backend) {
    $issues += "Backend HTTP server not running"
}

if (-not $ws) {
    $issues += "WebSocket server not listening (this causes WebSocket connection errors)"
}

if ($issues.Count -eq 0) {
    Write-Host "  ✅ All critical services are running!" -ForegroundColor Green
} else {
    foreach ($issue in $issues) {
        Write-Host "  ❌ $issue" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Solutions:" -ForegroundColor Yellow
Write-Host ""

if (-not $backend -or -not $ws) {
    Write-Host "1. Stop all services:" -ForegroundColor Cyan
    Write-Host "   .\stop-all.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Start all services:" -ForegroundColor Cyan
    Write-Host "   .\start-dev.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Check the backend terminal window for:" -ForegroundColor Cyan
    Write-Host "   - '✅ WebSocket server listening on port 3002'" -ForegroundColor White
    Write-Host "   - '✅ Dixi Backend ready on port 3001'" -ForegroundColor White
    Write-Host ""
}

if (-not $vision) {
    Write-Host "4. To start Vision Service:" -ForegroundColor Cyan
    Write-Host "   cd packages\vision" -ForegroundColor White
    Write-Host "   python main.py" -ForegroundColor White
    Write-Host ""
}

Write-Host "5. After starting, refresh your browser" -ForegroundColor Cyan
Write-Host ""

