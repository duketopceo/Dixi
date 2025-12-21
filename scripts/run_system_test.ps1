# PowerShell wrapper to run system_test.py
# Handles Python path detection and execution

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIXI PYTHON SYSTEM TEST RUNNER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Try to find Python
$pythonExe = $null

# First check for virtual environment in project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (Test-Path $venvPython) {
    $pythonExe = $venvPython
    Write-Host "Found Python virtual environment at: $pythonExe" -ForegroundColor Green
} else {
    # Check common Python locations
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
                # It's a path pattern, try to resolve it
                $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) {
                    $pythonExe = $found.FullName
                    Write-Host "Found Python at: $pythonExe" -ForegroundColor Green
                    break
                }
            } else {
                # It's a command name, try to find it
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
}

if (-not $pythonExe) {
    Write-Host "❌ Python not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python 3.11+ or add it to your PATH." -ForegroundColor Yellow
    Write-Host "You can download Python from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternatively, you can run the test manually:" -ForegroundColor Yellow
    Write-Host "  python scripts/system_test.py" -ForegroundColor Gray
    exit 1
}

# Check if required packages are installed
Write-Host "Checking Python dependencies..." -ForegroundColor Cyan
$scriptPath = Join-Path $PSScriptRoot "system_test.py"
$testImports = @"
import sys
try:
    import cv2
    import mediapipe
    import numpy
    import requests
    print('✅ All dependencies available')
    sys.exit(0)
except ImportError as e:
    print(f'❌ Missing dependency: {e}')
    sys.exit(1)
"@

$importCheck = & $pythonExe -c $testImports 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $importCheck -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install required packages:" -ForegroundColor Yellow
    Write-Host "  pip install opencv-python mediapipe numpy requests" -ForegroundColor Gray
    exit 1
}

Write-Host $importCheck -ForegroundColor Green
Write-Host ""

# Run the test script
Write-Host "Running system_test.py..." -ForegroundColor Cyan
Write-Host ""
& $pythonExe $scriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Python system test completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Python system test completed with warnings or errors." -ForegroundColor Yellow
}

exit $LASTEXITCODE

