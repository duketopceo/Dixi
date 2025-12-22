# Restart Backend Service Only
# This kills the existing backend and starts it fresh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Restarting Backend Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill existing backend processes
Write-Host "Step 1: Stopping existing backend processes..." -ForegroundColor Yellow

# Kill processes on ports 3001 and 3002
$ports = @(3001, 3002)
foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $processId = $conn.OwningProcess
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process -and ($process.ProcessName -eq "node" -or $process.ProcessName -eq "npm")) {
                    Write-Host "  Stopping process on port $port (PID: $processId)..." -ForegroundColor Gray
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {
        # Continue
    }
}

# Also kill any node processes in the backend directory
$backendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*Dixi*backend*" -or 
    (Get-NetTCPConnection -OwningProcess $_.Id -LocalPort 3001 -ErrorAction SilentlyContinue)
}

if ($backendProcesses) {
    foreach ($proc in $backendProcesses) {
        Write-Host "  Stopping backend process (PID: $($proc.Id))..." -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 2

# Step 2: Start backend
Write-Host ""
Write-Host "Step 2: Starting backend..." -ForegroundColor Yellow
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\packages\backend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Backend Restarting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "A new PowerShell window has opened for the backend." -ForegroundColor Cyan
Write-Host ""
Write-Host "Look for these messages in the backend window:" -ForegroundColor Yellow
Write-Host "  ✅ WebSocket server listening on port 3002" -ForegroundColor White
Write-Host "  ✅ Dixi Backend ready on port 3001" -ForegroundColor White
Write-Host ""
Write-Host "If you see errors, check:" -ForegroundColor Yellow
Write-Host "  - Port 3001 or 3002 already in use" -ForegroundColor White
Write-Host "  - Missing dependencies (run: npm install)" -ForegroundColor White
Write-Host "  - TypeScript compilation errors" -ForegroundColor White
Write-Host ""
Write-Host "Wait 5-10 seconds, then refresh your browser." -ForegroundColor Cyan
Write-Host ""

