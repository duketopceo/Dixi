# Diagnostic Script for Backend and Vision Services
# This script helps identify why services aren't starting

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Service Diagnostics" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check ports
Write-Host "Checking port availability..." -ForegroundColor Yellow
$ports = @(
    @{Port=3000; Service="Frontend"},
    @{Port=3001; Service="Backend HTTP"},
    @{Port=3002; Service="Backend WebSocket"},
    @{Port=5000; Service="Vision Service"}
)

foreach ($portInfo in $ports) {
    $port = $portInfo.Port
    $service = $portInfo.Service
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $processes = $connections | ForEach-Object {
            $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) {
                "$($proc.ProcessName) (PID: $($proc.Id))"
            }
        } | Select-Object -Unique
        Write-Host "  ⚠️  Port $port ($service) is in use by: $($processes -join ', ')" -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ Port $port ($service) is available" -ForegroundColor Green
    }
}

Write-Host ""

# Check Node.js
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVersion = node --version
    Write-Host "  ✅ Node.js found: $nodeVersion" -ForegroundColor Green
    Write-Host "     Path: $($nodeCmd.Source)" -ForegroundColor Gray
} else {
    Write-Host "  ❌ Node.js not found!" -ForegroundColor Red
    Write-Host "     Install Node.js from https://nodejs.org/" -ForegroundColor Yellow
}

Write-Host ""

# Check Python
Write-Host "Checking Python installation..." -ForegroundColor Yellow
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
    $pythonVersion = python --version 2>&1
    Write-Host "  ✅ Python found: $pythonVersion" -ForegroundColor Green
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
    $pythonVersion = python3 --version 2>&1
    Write-Host "  ✅ Python3 found: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "  ❌ Python not found!" -ForegroundColor Red
    Write-Host "     Vision service requires Python. Install from https://www.python.org/" -ForegroundColor Yellow
}

Write-Host ""

# Check backend dependencies
Write-Host "Checking Backend dependencies..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "packages\backend"
if (Test-Path $backendPath) {
    $nodeModules = Join-Path $backendPath "node_modules"
    if (Test-Path $nodeModules) {
        Write-Host "  ✅ Backend node_modules found" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Backend node_modules not found!" -ForegroundColor Red
        Write-Host "     Run: cd packages\backend && npm install" -ForegroundColor Yellow
    }
    
    # Check package.json
    $packageJson = Join-Path $backendPath "package.json"
    if (Test-Path $packageJson) {
        Write-Host "  ✅ Backend package.json found" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Backend package.json not found!" -ForegroundColor Red
    }
} else {
    Write-Host "  ❌ Backend directory not found: $backendPath" -ForegroundColor Red
}

Write-Host ""

# Check vision dependencies
Write-Host "Checking Vision Service dependencies..." -ForegroundColor Yellow
$visionPath = Join-Path $PSScriptRoot "packages\vision"
if (Test-Path $visionPath) {
    Write-Host "  ✅ Vision directory found" -ForegroundColor Green
    
    # Check for Python requirements
    $requirements = Join-Path $visionPath "requirements.txt"
    if (Test-Path $requirements) {
        Write-Host "  ✅ Vision requirements.txt found" -ForegroundColor Green
        
        if ($pythonCmd) {
            Write-Host "  Checking if Python packages are installed..." -ForegroundColor Gray
            try {
                $result = & $pythonCmd -c "import flask, cv2, mediapipe, numpy" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  ✅ Required Python packages are installed" -ForegroundColor Green
                } else {
                    Write-Host "  ❌ Some Python packages are missing!" -ForegroundColor Red
                    Write-Host "     Run: cd packages\vision && $pythonCmd -m pip install -r requirements.txt" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  ❌ Error checking Python packages: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  ⚠️  Vision requirements.txt not found" -ForegroundColor Yellow
    }
    
    # Check for model file
    $modelFile = Join-Path $visionPath "hand_landmarker.task"
    if (Test-Path $modelFile) {
        Write-Host "  ✅ Vision model file found" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Vision model file not found: $modelFile" -ForegroundColor Yellow
        Write-Host "     Vision service will run but gesture detection may not work" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ Vision directory not found: $visionPath" -ForegroundColor Red
}

Write-Host ""

# Check frontend dependencies
Write-Host "Checking Frontend dependencies..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "packages\frontend"
if (Test-Path $frontendPath) {
    $nodeModules = Join-Path $frontendPath "node_modules"
    if (Test-Path $nodeModules) {
        Write-Host "  ✅ Frontend node_modules found" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Frontend node_modules not found" -ForegroundColor Yellow
        Write-Host "     Run: cd packages\frontend && npm install" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Frontend directory not found: $frontendPath" -ForegroundColor Red
}

Write-Host ""

# Try to test service endpoints
Write-Host "Testing service endpoints..." -ForegroundColor Yellow
Write-Host ""

# Backend
Write-Host "Backend (http://localhost:3001/health):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Backend is responding" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Backend is not responding" -ForegroundColor Red
    Write-Host "     Make sure backend is running: cd packages\backend && npm run dev" -ForegroundColor Yellow
}

# Vision
Write-Host ""
Write-Host "Vision Service (http://localhost:5000/health):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Vision service is responding" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Vision service is not responding" -ForegroundColor Red
    if ($pythonCmd) {
        Write-Host "     Make sure vision service is running: cd packages\vision && $pythonCmd main.py" -ForegroundColor Yellow
    } else {
        Write-Host "     Python is required for vision service" -ForegroundColor Yellow
    }
}

# Frontend
Write-Host ""
Write-Host "Frontend (http://localhost:3000):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Frontend is responding" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Frontend is not responding" -ForegroundColor Red
    Write-Host "     Make sure frontend is running: cd packages\frontend && npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Diagnostics Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

