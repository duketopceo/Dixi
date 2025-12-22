# Start Dixi App in Development Mode (without Docker)
# This starts backend, frontend, and vision service using npm/python directly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Dixi App (Development Mode)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} else {
    Write-Host "Warning: Python not found. Vision service will not start." -ForegroundColor Yellow
    Write-Host "  Install Python or use Docker Compose for full service stack." -ForegroundColor Yellow
    Write-Host ""
}

# Start Vision Service (Python/Flask)
if ($pythonCmd) {
    Write-Host "Starting Vision Service on port 5000..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\packages\vision'; $pythonCmd main.py" -WindowStyle Normal
    Start-Sleep -Seconds 2
} else {
    Write-Host "Skipping Vision Service (Python not found)..." -ForegroundColor Yellow
}

# Start Backend
Write-Host "Starting Backend on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\packages\backend'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3

# Start Frontend  
Write-Host "Starting Frontend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\packages\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Services Starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Three PowerShell windows have opened:" -ForegroundColor Cyan
if ($pythonCmd) {
    Write-Host "  - Vision Service: http://localhost:5000" -ForegroundColor White
}
Write-Host "  - Backend: http://localhost:3001" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Wait 10-15 seconds for services to start, then:" -ForegroundColor Yellow
Write-Host "  Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "To stop all services, run: .\stop-all.ps1" -ForegroundColor Cyan
Write-Host "Or close the PowerShell windows manually" -ForegroundColor Gray
Write-Host ""

