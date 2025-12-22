# Fix Backend Issues - Kill and Restart
# This forcefully kills the stuck backend and restarts it

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing Backend Issues" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Force kill backend processes
Write-Host "Step 1: Force killing backend processes..." -ForegroundColor Yellow

# Kill by port
$ports = @(3001, 3002)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pid = $conn.OwningProcess
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Killing process on port $port (PID: $pid)..." -ForegroundColor Gray
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Kill by process name (node processes)
$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
foreach ($proc in $nodeProcs) {
    # Check if it's using our ports
    $usingPort = Get-NetTCPConnection -OwningProcess $proc.Id -ErrorAction SilentlyContinue | 
        Where-Object { $_.LocalPort -in @(3001, 3002) }
    if ($usingPort) {
        Write-Host "  Killing node process (PID: $($proc.Id))..." -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 3

# Step 2: Verify ports are free
Write-Host ""
Write-Host "Step 2: Verifying ports are free..." -ForegroundColor Yellow
$allFree = $true
foreach ($port in $ports) {
    $stillInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($stillInUse) {
        Write-Host "  ⚠️  Port $port still in use!" -ForegroundColor Yellow
        $allFree = $false
    } else {
        Write-Host "  ✅ Port $port is free" -ForegroundColor Green
    }
}

if (-not $allFree) {
    Write-Host ""
    Write-Host "Some ports are still in use. Trying one more time..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    foreach ($port in $ports) {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Start-Sleep -Seconds 2
}

# Step 3: Start backend fresh
Write-Host ""
Write-Host "Step 3: Starting backend fresh..." -ForegroundColor Yellow
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\packages\backend'; Write-Host 'Starting Backend...' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Backend Restarted!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Check the backend PowerShell window for:" -ForegroundColor Cyan
Write-Host "  ✅ WebSocket server listening on port 3002" -ForegroundColor White
Write-Host "  ✅ Dixi Backend ready on port 3001" -ForegroundColor White
Write-Host ""
Write-Host "If you see errors about ports in use:" -ForegroundColor Yellow
Write-Host "  Run: .\stop-all.ps1" -ForegroundColor White
Write-Host "  Then: .\start-dev.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Wait 10 seconds, then refresh your browser." -ForegroundColor Cyan
Write-Host ""

