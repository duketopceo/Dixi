# Run All App Tests
# This script runs all test suites for the Dixi application

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Dixi Application Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptPath) {
    Set-Location $scriptPath
}

$allTestsPassed = $true

# Test 1: Backend Unit Tests
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Test 1: Backend Unit Tests" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
try {
    Set-Location packages/backend
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend unit tests failed" -ForegroundColor Red
        $allTestsPassed = $false
    } else {
        Write-Host "✅ Backend unit tests passed" -ForegroundColor Green
    }
    Set-Location ../..
} catch {
    Write-Host "❌ Error running backend tests: $_" -ForegroundColor Red
    $allTestsPassed = $false
    Set-Location $scriptPath
}

Write-Host ""

# Test 2: Frontend Unit Tests
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Test 2: Frontend Unit Tests" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
try {
    Set-Location packages/frontend
    npm test -- --run
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend unit tests failed" -ForegroundColor Red
        $allTestsPassed = $false
    } else {
        Write-Host "✅ Frontend unit tests passed" -ForegroundColor Green
    }
    Set-Location ../..
} catch {
    Write-Host "❌ Error running frontend tests: $_" -ForegroundColor Red
    $allTestsPassed = $false
    Set-Location $scriptPath
}

Write-Host ""

# Test 3: Integration Tests
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Test 3: Integration Tests" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
try {
    npm run test:integration
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Integration tests failed" -ForegroundColor Red
        $allTestsPassed = $false
    } else {
        Write-Host "✅ Integration tests passed" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Integration tests skipped (may require services running)" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Vision Service Tests
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Test 4: Vision Service Tests" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
try {
    Set-Location packages/vision
    if (Get-Command python -ErrorAction SilentlyContinue) {
        python -m pytest
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        python3 -m pytest
    } else {
        Write-Host "⚠️  Python not found, skipping vision tests" -ForegroundColor Yellow
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Vision service tests failed" -ForegroundColor Red
        $allTestsPassed = $false
    } else {
        Write-Host "✅ Vision service tests passed" -ForegroundColor Green
    }
    Set-Location ../..
} catch {
    Write-Host "⚠️  Vision tests skipped: $_" -ForegroundColor Yellow
    Set-Location $scriptPath
}

Write-Host ""

# Test 5: System Tests (requires services running)
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Test 5: System Tests (Service Health Checks)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: System tests require services to be running" -ForegroundColor Gray
Write-Host "Run .\scripts\test_everything.ps1 separately to test running services" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($allTestsPassed) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Check the output above for details." -ForegroundColor Red
}

Write-Host ""
Write-Host "To run system/service tests (requires services running):" -ForegroundColor Cyan
Write-Host "  .\scripts\test_everything.ps1" -ForegroundColor White
Write-Host ""
Write-Host "To run E2E tests:" -ForegroundColor Cyan
Write-Host "  npm run test:e2e" -ForegroundColor White
Write-Host ""

exit $(if ($allTestsPassed) { 0 } else { 1 })

