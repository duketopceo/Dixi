# Dixi Environment Setup Script
# Installs dependencies and configures PATH

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIXI ENVIRONMENT SETUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Host "Step 1: Installing Node.js dependencies..." -ForegroundColor Cyan
Write-Host ""

# Find Node.js
$nodePath = $null
$nodePaths = @(
    "C:\Program Files\nodejs",
    "$env:ProgramFiles\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs"
)

foreach ($path in $nodePaths) {
    if (Test-Path "$path\node.exe") {
        $nodePath = $path
        Write-Host "Found Node.js at: $nodePath" -ForegroundColor Green
        break
    }
}

if (-not $nodePath) {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
} else {
    # Add Node.js to PATH for this session
    $env:PATH = "$nodePath;$env:PATH"
    
    # Install root dependencies
    Write-Host "Installing root dependencies..." -ForegroundColor Gray
    Set-Location $projectRoot
    & "$nodePath\npm.cmd" install
    
    # Install backend dependencies
    Write-Host "Installing backend dependencies..." -ForegroundColor Gray
    Set-Location "$projectRoot\packages\backend"
    & "$nodePath\npm.cmd" install
    
    # Install frontend dependencies
    Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
    Set-Location "$projectRoot\packages\frontend"
    & "$nodePath\npm.cmd" install
    
    Write-Host "✅ Node.js dependencies installed!" -ForegroundColor Green
    Write-Host ""
}

# Find Python
Write-Host "Step 2: Checking Python installation..." -ForegroundColor Cyan
Write-Host ""

$pythonExe = $null
$pythonPaths = @(
    "python",
    "python3",
    "py",
    "C:\Python*\python.exe",
    "C:\Program Files\Python*\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python*\python.exe",
    "$env:ProgramFiles\Python*\python.exe"
)

foreach ($path in $pythonPaths) {
    try {
        if ($path -like "*\*" -or $path -like "*/*") {
            $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $pythonExe = $found.FullName
                Write-Host "Found Python at: $pythonExe" -ForegroundColor Green
                break
            }
        } else {
            $cmd = Get-Command $path -ErrorAction SilentlyContinue
            if ($cmd) {
                $pythonExe = $cmd.Source
                Write-Host "Found Python at: $pythonExe" -ForegroundColor Green
                break
            }
        }
    } catch {
        # Continue searching
    }
}

if ($pythonExe) {
    # Install Python dependencies
    Write-Host "Installing Python dependencies..." -ForegroundColor Gray
    Set-Location "$projectRoot\packages\vision"
    
    try {
        & $pythonExe -m pip install -r requirements.txt
        Write-Host "✅ Python dependencies installed!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Failed to install Python dependencies: $_" -ForegroundColor Yellow
        Write-Host "You may need to run: pip install -r packages/vision/requirements.txt" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Python not found!" -ForegroundColor Yellow
    Write-Host "Python is optional for the vision service." -ForegroundColor Gray
    Write-Host "To install Python: https://www.python.org/downloads/" -ForegroundColor Gray
    Write-Host "After installing, run: pip install -r packages/vision/requirements.txt" -ForegroundColor Gray
}
Write-Host ""

# Configure PATH permanently
Write-Host "Step 3: Configuring PATH environment variable..." -ForegroundColor Cyan
Write-Host ""

if ($isAdmin) {
    Write-Host "Running as Administrator - can modify system PATH" -ForegroundColor Green
    
    if ($nodePath) {
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        if ($currentPath -notlike "*$nodePath*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "Machine")
            Write-Host "✅ Added Node.js to system PATH" -ForegroundColor Green
        } else {
            Write-Host "Node.js already in system PATH" -ForegroundColor Gray
        }
    }
    
    if ($pythonExe) {
        $pythonDir = Split-Path -Parent $pythonExe
        $pythonScripts = Join-Path $pythonDir "Scripts"
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        
        $added = $false
        if ($currentPath -notlike "*$pythonDir*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$pythonDir", "Machine")
            $added = $true
        }
        if (Test-Path $pythonScripts -and $currentPath -notlike "*$pythonScripts*") {
            $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$pythonScripts", "Machine")
            $added = $true
        }
        
        if ($added) {
            Write-Host "✅ Added Python to system PATH" -ForegroundColor Green
        } else {
            Write-Host "Python already in system PATH" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "Not running as Administrator - configuring user PATH only" -ForegroundColor Yellow
    
    if ($nodePath) {
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentPath -notlike "*$nodePath*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "User")
            Write-Host "✅ Added Node.js to user PATH" -ForegroundColor Green
        } else {
            Write-Host "Node.js already in user PATH" -ForegroundColor Gray
        }
    }
    
    if ($pythonExe) {
        $pythonDir = Split-Path -Parent $pythonExe
        $pythonScripts = Join-Path $pythonDir "Scripts"
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        
        $added = $false
        if ($currentPath -notlike "*$pythonDir*") {
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$pythonDir", "User")
            $added = $true
        }
        if (Test-Path $pythonScripts -and $currentPath -notlike "*$pythonScripts*") {
            $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$pythonScripts", "User")
            $added = $true
        }
        
        if ($added) {
            Write-Host "✅ Added Python to user PATH" -ForegroundColor Green
        } else {
            Write-Host "Python already in user PATH" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Note: For system-wide PATH changes, run this script as Administrator" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: You may need to restart your terminal or IDE" -ForegroundColor Yellow
Write-Host "   for PATH changes to take effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "To verify PATH configuration:" -ForegroundColor Cyan
if ($nodePath) {
    Write-Host "  node --version" -ForegroundColor Gray
    Write-Host "  npm --version" -ForegroundColor Gray
}
if ($pythonExe) {
    Write-Host "  python --version" -ForegroundColor Gray
    Write-Host "  pip --version" -ForegroundColor Gray
}
Write-Host ""

