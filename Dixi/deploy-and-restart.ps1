# Complete Deployment and Service Restart Script
# This script: 1) Pushes to Git, 2) Deploys to Firebase, 3) Stops all services, 4) Restarts them

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dixi Complete Deployment & Restart" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptPath) {
    Set-Location $scriptPath
}

# ============================================
# STEP 1: Git Push
# ============================================
Write-Host "STEP 1: Git Push" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "Checking git status..." -ForegroundColor Gray
git status --short

Write-Host ""
Write-Host "Staging all changes..." -ForegroundColor Gray
git add -A
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: git add failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Committing changes..." -ForegroundColor Gray
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "Deployment: $timestamp - Service restart and fixes"
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit or commit failed. Continuing..." -ForegroundColor Yellow
} else {
    Write-Host "✅ Changes committed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Pushing to git..." -ForegroundColor Gray
$currentBranch = git branch --show-current 2>$null
if ($currentBranch) {
    Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan
    git push origin $currentBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Git push failed. Trying without branch specification..." -ForegroundColor Yellow
        git push
    }
} else {
    Write-Host "Could not determine current branch. Trying git push..." -ForegroundColor Yellow
    git push
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Git push successful" -ForegroundColor Green
} else {
    Write-Host "⚠️  Git push failed. Continuing anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host ""

# ============================================
# STEP 2: Firebase Deployment
# ============================================
Write-Host "STEP 2: Firebase Deployment" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Check if Firebase CLI is installed
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseInstalled) {
    Write-Host "⚠️  Firebase CLI not found. Skipping Firebase deployment." -ForegroundColor Yellow
    Write-Host "   Install with: npm install -g firebase-tools" -ForegroundColor Gray
} else {
    Write-Host "Building frontend for production..." -ForegroundColor Gray
    Set-Location packages/frontend
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
        npm install
    }
    
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend build failed!" -ForegroundColor Red
        Set-Location ../..
    } else {
        Write-Host "✅ Frontend build complete" -ForegroundColor Green
        Set-Location ../..
        
        Write-Host ""
        Write-Host "Deploying to Firebase..." -ForegroundColor Gray
        firebase deploy --only hosting --project dixi-vision
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Firebase deployment successful" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Firebase deployment failed. Continuing..." -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host ""

# ============================================
# STEP 3: Stop All Services
# ============================================
Write-Host "STEP 3: Stopping All Services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Stop Docker Compose services
Write-Host "Stopping Docker Compose services..." -ForegroundColor Gray
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose down 2>&1 | Out-Null
    Write-Host "✅ Docker Compose services stopped" -ForegroundColor Green
} else {
    Write-Host "Docker Compose not found, skipping..." -ForegroundColor Yellow
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
                if ($process -and ($process.ProcessName -eq "node" -or $process.ProcessName -eq "npm" -or $process.ProcessName -eq "python" -or $process.ProcessName -eq "python3")) {
                    Write-Host "  Stopping $($process.ProcessName) on port $port (PID: $processId)..." -ForegroundColor Gray
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    $killedCount++
                }
            }
        }
    } catch {
        # Port might not be in use, continue
    }
}

if ($killedCount -gt 0) {
    Write-Host "✅ Stopped $killedCount process(es)" -ForegroundColor Green
} else {
    Write-Host "✅ No processes found on service ports" -ForegroundColor Green
}

# Wait a moment for ports to be released
Start-Sleep -Seconds 2

Write-Host ""
Write-Host ""

# ============================================
# STEP 4: Start Services and Diagnose
# ============================================
Write-Host "STEP 4: Starting Services" -ForegroundColor Yellow
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
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$visionPath'; $pythonCmd main.py" -WindowStyle Normal
        Start-Sleep -Seconds 2
        Write-Host "✅ Vision service window opened" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Vision service directory not found: $visionPath" -ForegroundColor Yellow
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
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 3
    Write-Host "✅ Backend service window opened" -ForegroundColor Green
} else {
    Write-Host "❌ Backend directory not found: $backendPath" -ForegroundColor Red
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
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal
    Start-Sleep -Seconds 2
    Write-Host "✅ Frontend service window opened" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend directory not found: $frontendPath" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# ============================================
# STEP 5: Wait and Check Status
# ============================================
Write-Host "STEP 5: Waiting for services to start..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "Waiting 10 seconds for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Checking service status..." -ForegroundColor Cyan
Write-Host ""

# Check Backend
Write-Host "Backend Health (http://localhost:3001/health):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Backend is running! Status: $($response.StatusCode)" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "  Status: $($content.status)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Backend is not responding" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Check the backend PowerShell window for errors" -ForegroundColor Yellow
}

# Check Vision Service
Write-Host ""
Write-Host "Vision Service Health (http://localhost:5000/health):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Vision service is running! Status: $($response.StatusCode)" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "  Status: $($content.status), Tracking: $($content.tracking)" -ForegroundColor Gray
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
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment and Restart Complete!" -ForegroundColor Green
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
Write-Host "To stop all services, run: .\stop-all.ps1" -ForegroundColor Cyan
Write-Host ""

