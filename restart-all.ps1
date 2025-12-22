# Restart All Dixi Services
# This script stops all services (including PowerShell windows) and restarts them

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Restarting All Dixi Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptPath) {
    Set-Location $scriptPath
}

# ============================================
# STEP 1: Stop All Services
# ============================================
Write-Host "STEP 1: Stopping All Services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Stop Docker Compose services
Write-Host "Stopping Docker Compose services..." -ForegroundColor Gray
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose down 2>&1 | Out-Null
    Write-Host "  ✅ Docker Compose services stopped" -ForegroundColor Green
}

# Kill processes on service ports
Write-Host ""
Write-Host "Stopping processes on service ports (3000, 3001, 3002, 5000)..." -ForegroundColor Gray
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
                    Write-Host "  Stopping $($process.ProcessName) on port $port (PID: $processId)..." -ForegroundColor Gray
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    $killedCount++
                }
            }
        }
    } catch {
        # Continue
    }
}

# Kill all node processes (they might be running our services)
Write-Host ""
Write-Host "Stopping all node processes..." -ForegroundColor Gray
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
foreach ($proc in $nodeProcesses) {
    try {
        # Check if it's using our ports or in our directories
        $usingOurPort = Get-NetTCPConnection -OwningProcess $proc.Id -ErrorAction SilentlyContinue | 
            Where-Object { $_.LocalPort -in $ports }
        
        if ($usingOurPort -or $proc.Path -like "*Dixi*") {
            Write-Host "  Stopping node process (PID: $($proc.Id))..." -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            $killedCount++
        }
    } catch {
        # Continue
    }
}

# Kill all python processes (vision service)
Write-Host ""
Write-Host "Stopping all python processes..." -ForegroundColor Gray
$pythonProcesses = Get-Process -Name "python","python3" -ErrorAction SilentlyContinue
foreach ($proc in $pythonProcesses) {
    try {
        $usingOurPort = Get-NetTCPConnection -OwningProcess $proc.Id -ErrorAction SilentlyContinue | 
            Where-Object { $_.LocalPort -eq 5000 }
        
        if ($usingOurPort -or $proc.Path -like "*Dixi*") {
            Write-Host "  Stopping python process (PID: $($proc.Id))..." -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            $killedCount++
        }
    } catch {
        # Continue
    }
}

# Close PowerShell windows that might be running services
Write-Host ""
Write-Host "Closing PowerShell windows running services..." -ForegroundColor Gray
$psWindows = Get-Process -Name "powershell","pwsh" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*npm*" -or 
    $_.MainWindowTitle -like "*python*" -or
    $_.MainWindowTitle -like "*Dixi*" -or
    $_.MainWindowTitle -like "*backend*" -or
    $_.MainWindowTitle -like "*frontend*" -or
    $_.MainWindowTitle -like "*vision*"
}

foreach ($ps in $psWindows) {
    try {
        # Don't kill the current PowerShell session
        if ($ps.Id -ne $PID) {
            Write-Host "  Closing PowerShell window (PID: $($ps.Id))..." -ForegroundColor Gray
            Stop-Process -Id $ps.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # Continue
    }
}

if ($killedCount -gt 0) {
    Write-Host "  ✅ Stopped $killedCount process(es)" -ForegroundColor Green
} else {
    Write-Host "  ✅ No processes found to stop" -ForegroundColor Green
}

# Wait for ports to be fully released
Write-Host ""
Write-Host "Waiting for ports to be released..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host ""
Write-Host ""

# ============================================
# STEP 2: Start All Services
# ============================================
Write-Host "STEP 2: Starting All Services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Check Python availability
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} else {
    Write-Host "⚠️  Python not found. Vision service will not start." -ForegroundColor Yellow
}

# Check Node.js availability
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "❌ Node.js not found! Cannot start backend/frontend." -ForegroundColor Red
    exit 1
}

# Start Vision Service (Python/Flask)
if ($pythonCmd) {
    Write-Host "Starting Vision Service on port 5000..." -ForegroundColor Cyan
    $visionPath = Join-Path $scriptPath "packages\vision"
    if (Test-Path $visionPath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$visionPath'; Write-Host 'Vision Service Starting...' -ForegroundColor Cyan; $pythonCmd main.py" -WindowStyle Normal
        Start-Sleep -Seconds 2
        Write-Host "  ✅ Vision service window opened" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Vision service directory not found: $visionPath" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Skipping Vision Service (Python not found)" -ForegroundColor Yellow
}

# Start Backend
Write-Host ""
Write-Host "Starting Backend on port 3001 (HTTP) and 3002 (WebSocket)..." -ForegroundColor Cyan
$backendPath = Join-Path $scriptPath "packages\backend"
if (Test-Path $backendPath) {
    # Check if node_modules exists
    $backendNodeModules = Join-Path $backendPath "node_modules"
    if (-not (Test-Path $backendNodeModules)) {
        Write-Host "  Installing backend dependencies..." -ForegroundColor Gray
        Set-Location $backendPath
        npm install
        Set-Location $scriptPath
    }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend Starting...' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
    Write-Host "  ✅ Backend service window opened" -ForegroundColor Green
} else {
    Write-Host "  ❌ Backend directory not found: $backendPath" -ForegroundColor Red
}

# Start Frontend
Write-Host ""
Write-Host "Starting Frontend on port 3000..." -ForegroundColor Cyan
$frontendPath = Join-Path $scriptPath "packages\frontend"
if (Test-Path $frontendPath) {
    # Check if node_modules exists
    $frontendNodeModules = Join-Path $frontendPath "node_modules"
    if (-not (Test-Path $frontendNodeModules)) {
        Write-Host "  Installing frontend dependencies..." -ForegroundColor Gray
        Set-Location $frontendPath
        npm install
        Set-Location $scriptPath
    }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Frontend Starting...' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 2
    Write-Host "  ✅ Frontend service window opened" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend directory not found: $frontendPath" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# ============================================
# STEP 3: Wait and Check Status
# ============================================
Write-Host "STEP 3: Waiting for services to start..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "Waiting 15 seconds for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "Checking service status..." -ForegroundColor Cyan
Write-Host ""

# Check Backend
Write-Host "Backend Health (http://localhost:3001/health):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Backend is running! Status: $($response.StatusCode)" -ForegroundColor Green
    try {
        $content = $response.Content | ConvertFrom-Json
        Write-Host "  Status: $($content.status)" -ForegroundColor Gray
        if ($content.checks) {
            Write-Host "  Ollama: $($content.checks.ollama.status)" -ForegroundColor Gray
        }
    } catch {
        # JSON parse failed, but service is responding
    }
} catch {
    Write-Host "  ❌ Backend is not responding" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Check the backend PowerShell window for errors" -ForegroundColor Yellow
}

# Check WebSocket
Write-Host ""
Write-Host "WebSocket Server (port 3002):" -ForegroundColor Cyan
try {
    $wsConnection = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
    if ($wsConnection) {
        Write-Host "  ✅ WebSocket server is listening" -ForegroundColor Green
    } else {
        Write-Host "  ❌ WebSocket server is not listening" -ForegroundColor Red
        Write-Host "  Check the backend PowerShell window for WebSocket errors" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Could not check WebSocket status" -ForegroundColor Red
}

# Check Vision Service
Write-Host ""
Write-Host "Vision Service Health (http://localhost:5000/health):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Vision service is running! Status: $($response.StatusCode)" -ForegroundColor Green
    try {
        $content = $response.Content | ConvertFrom-Json
        Write-Host "  Status: $($content.status), Tracking: $($content.tracking)" -ForegroundColor Gray
    } catch {
        # JSON parse failed, but service is responding
    }
} catch {
    Write-Host "  ❌ Vision service is not responding" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Check the vision service PowerShell window for errors" -ForegroundColor Yellow
    if (-not $pythonCmd) {
        Write-Host "  Note: Python was not found - vision service requires Python" -ForegroundColor Yellow
    }
}

# Check Frontend
Write-Host ""
Write-Host "Frontend (http://localhost:3000):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Frontend is running! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Frontend is not responding" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Check the frontend PowerShell window for errors" -ForegroundColor Yellow
    Write-Host "  Also try: http://localhost:5173 (Vite fallback port)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Restart Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  - Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "  - WebSocket: ws://localhost:3002" -ForegroundColor White
Write-Host "  - Vision Service: http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Three PowerShell windows should be open with service logs." -ForegroundColor Yellow
Write-Host "If services are not responding, check those windows for errors." -ForegroundColor Yellow
Write-Host ""
Write-Host "To diagnose issues, run: .\diagnose-services.ps1" -ForegroundColor Cyan
Write-Host ""

