# Fix Issues and Restart All Services
# This script fixes common issues and restarts services properly

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing Issues and Restarting Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptPath) {
    Set-Location $scriptPath
}

# ============================================
# STEP 1: Kill All Stuck Processes
# ============================================
Write-Host "STEP 1: Killing All Stuck Processes" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

$ports = @(3000, 3001, 3002, 5000)
$killedCount = 0

foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $processId = $conn.OwningProcess
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "  Killing $($process.ProcessName) on port $port (PID: $processId)..." -ForegroundColor Gray
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    $killedCount++
                }
            }
        }
    } catch {
        # Continue
    }
}

# Kill all node processes
Write-Host ""
Write-Host "Killing all node processes..." -ForegroundColor Gray
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
foreach ($proc in $nodeProcesses) {
    try {
        if ($proc.Id -ne $PID) {
            Write-Host "  Killing node process (PID: $($proc.Id))..." -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            $killedCount++
        }
    } catch {
        # Continue
    }
}

# Kill all python processes
Write-Host ""
Write-Host "Killing all python processes..." -ForegroundColor Gray
$pythonProcesses = Get-Process -Name "python","python3" -ErrorAction SilentlyContinue
foreach ($proc in $pythonProcesses) {
    try {
        if ($proc.Id -ne $PID) {
            Write-Host "  Killing python process (PID: $($proc.Id))..." -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            $killedCount++
        }
    } catch {
        # Continue
    }
}

Write-Host ""
Write-Host "  ✅ Killed $killedCount process(es)" -ForegroundColor Green
Write-Host "  Waiting 3 seconds for ports to be released..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host ""
Write-Host ""

# ============================================
# STEP 2: Fix Dependencies
# ============================================
Write-Host "STEP 2: Installing Missing Dependencies" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Check and install backend dependencies
Write-Host "Checking backend dependencies..." -ForegroundColor Cyan
$backendPath = Join-Path $scriptPath "packages\backend"
$backendNodeModules = Join-Path $backendPath "node_modules"

if (-not (Test-Path $backendNodeModules)) {
    Write-Host "  ❌ Backend node_modules not found!" -ForegroundColor Red
    Write-Host "  Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location $backendPath
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Backend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Backend dependency installation failed!" -ForegroundColor Red
    }
    Set-Location $scriptPath
} else {
    Write-Host "  ✅ Backend dependencies found" -ForegroundColor Green
}

# Check frontend dependencies
Write-Host ""
Write-Host "Checking frontend dependencies..." -ForegroundColor Cyan
$frontendPath = Join-Path $scriptPath "packages\frontend"
$frontendNodeModules = Join-Path $frontendPath "node_modules"

if (-not (Test-Path $frontendNodeModules)) {
    Write-Host "  ⚠️  Frontend node_modules not found!" -ForegroundColor Yellow
    Write-Host "  Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location $frontendPath
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Frontend dependency installation failed!" -ForegroundColor Red
    }
    Set-Location $scriptPath
} else {
    Write-Host "  ✅ Frontend dependencies found" -ForegroundColor Green
}

Write-Host ""
Write-Host ""

# ============================================
# STEP 3: Start All Services
# ============================================
Write-Host "STEP 3: Starting All Services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Check Python availability
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
}

# Check Node.js availability
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "❌ Node.js not found! Cannot start services." -ForegroundColor Red
    exit 1
}

# Start Vision Service
if ($pythonCmd) {
    Write-Host "Starting Vision Service on port 5000..." -ForegroundColor Cyan
    $visionPath = Join-Path $scriptPath "packages\vision"
    if (Test-Path $visionPath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$visionPath'; Write-Host '=== Vision Service ===' -ForegroundColor Cyan; $pythonCmd main.py" -WindowStyle Normal
        Start-Sleep -Seconds 3
        Write-Host "  ✅ Vision service window opened" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Skipping Vision Service (Python not found)" -ForegroundColor Yellow
}

# Start Backend
Write-Host ""
Write-Host "Starting Backend on port 3001 (HTTP) and 3002 (WebSocket)..." -ForegroundColor Cyan
if (Test-Path $backendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '=== Backend Service ===' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 4
    Write-Host "  ✅ Backend service window opened" -ForegroundColor Green
} else {
    Write-Host "  ❌ Backend directory not found!" -ForegroundColor Red
}

# Start Frontend
Write-Host ""
Write-Host "Starting Frontend on port 3000..." -ForegroundColor Cyan
if (Test-Path $frontendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '=== Frontend Service ===' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
    Write-Host "  ✅ Frontend service window opened" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend directory not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# ============================================
# STEP 4: Wait and Verify
# ============================================
Write-Host "STEP 4: Waiting and Verifying Services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "Waiting 20 seconds for services to fully start..." -ForegroundColor Gray
Start-Sleep -Seconds 20

Write-Host ""
Write-Host "Verifying services..." -ForegroundColor Cyan
Write-Host ""

# Check Backend
Write-Host "Backend (http://localhost:3001/health):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Backend is running! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Backend is not responding" -ForegroundColor Red
    Write-Host "     Check the backend PowerShell window for errors" -ForegroundColor Yellow
}

# Check WebSocket
Write-Host ""
Write-Host "WebSocket (port 3002):" -ForegroundColor Cyan
$wsConnection = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
if ($wsConnection) {
    Write-Host "  ✅ WebSocket server is listening" -ForegroundColor Green
} else {
    Write-Host "  ❌ WebSocket server is not listening" -ForegroundColor Red
    Write-Host "     Check the backend PowerShell window" -ForegroundColor Yellow
}

# Check Vision Service
Write-Host ""
Write-Host "Vision Service (http://localhost:5000/health):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Vision service is running! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Vision service is not responding" -ForegroundColor Red
    Write-Host "     Check the vision PowerShell window for errors" -ForegroundColor Yellow
}

# Check Frontend
Write-Host ""
Write-Host "Frontend (http://localhost:3000):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Frontend is running! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Frontend is not responding" -ForegroundColor Red
    Write-Host "     Check the frontend PowerShell window for errors" -ForegroundColor Yellow
    Write-Host "     Also try: http://localhost:5173" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix and Restart Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  - Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "  - WebSocket: ws://localhost:3002" -ForegroundColor White
Write-Host "  - Vision Service: http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Check the three PowerShell windows for any error messages." -ForegroundColor Yellow
Write-Host ""

