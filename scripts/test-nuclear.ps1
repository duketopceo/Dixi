<# 
.SYNOPSIS
    Nuclear Test Suite Runner for Dixi

.DESCRIPTION
    Runs the complete test suite including unit tests, integration tests,
    E2E tests, and stress tests.

.PARAMETER Type
    Type of tests to run: all, unit, integration, e2e, stress

.EXAMPLE
    .\scripts\test-nuclear.ps1 -Type all
    .\scripts\test-nuclear.ps1 -Type unit
#>

param(
    [ValidateSet("all", "unit", "integration", "e2e", "stress")]
    [string]$Type = "all"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   DIXI NUCLEAR TEST SUITE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if npm is available
try {
    $null = Get-Command npm -ErrorAction Stop
} catch {
    Write-Host "ERROR: npm is not available in PATH" -ForegroundColor Red
    Write-Host "Please run this script in a terminal with npm configured." -ForegroundColor Yellow
    exit 1
}

# Function to run a test phase
function Run-TestPhase {
    param(
        [string]$Name,
        [string]$Command
    )
    
    Write-Host ""
    Write-Host "--- $Name ---" -ForegroundColor Yellow
    Write-Host "Running: $Command" -ForegroundColor Gray
    
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: $Name returned non-zero exit code: $LASTEXITCODE" -ForegroundColor Yellow
        } else {
            Write-Host "$Name completed successfully" -ForegroundColor Green
        }
    } catch {
        Write-Host "ERROR: $Name failed - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Navigate to project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Run tests based on type
switch ($Type) {
    "all" {
        Write-Host "Running FULL test suite..." -ForegroundColor Cyan
        
        Run-TestPhase "Backend Unit Tests" "npx jest --config tests/jest.config.js tests/unit/backend --coverage --passWithNoTests"
        
        # Python tests if pytest available
        if (Get-Command pytest -ErrorAction SilentlyContinue) {
            Run-TestPhase "Vision Service Tests" "cd packages/vision && pytest tests/ -v --tb=short; cd ../.."
        } else {
            Write-Host "Skipping Vision tests - pytest not available" -ForegroundColor Yellow
        }
        
        Run-TestPhase "Integration Tests" "npx jest --config tests/jest.config.js tests/integration --testPathIgnorePatterns=[] --passWithNoTests"
        
        # E2E tests if Playwright installed
        if (Test-Path "node_modules/@playwright") {
            Run-TestPhase "E2E Tests" "npx playwright test tests/e2e --reporter=list"
        } else {
            Write-Host "Skipping E2E tests - Playwright not installed. Run: npx playwright install" -ForegroundColor Yellow
        }
        
        Run-TestPhase "Stress Tests" "npx jest --config tests/jest.config.js tests/stress --testPathIgnorePatterns=[] --maxWorkers=1 --passWithNoTests"
    }
    
    "unit" {
        Write-Host "Running UNIT tests only..." -ForegroundColor Cyan
        Run-TestPhase "Backend Unit Tests" "npx jest --config tests/jest.config.js tests/unit/backend --coverage --passWithNoTests"
        
        if (Get-Command pytest -ErrorAction SilentlyContinue) {
            Run-TestPhase "Vision Service Tests" "cd packages/vision && pytest tests/ -v --tb=short; cd ../.."
        }
    }
    
    "integration" {
        Write-Host "Running INTEGRATION tests only..." -ForegroundColor Cyan
        Write-Host "NOTE: Requires backend and vision services to be running" -ForegroundColor Yellow
        Run-TestPhase "Integration Tests" "npx jest --config tests/jest.config.js tests/integration --testPathIgnorePatterns=[] --passWithNoTests"
    }
    
    "e2e" {
        Write-Host "Running E2E tests only..." -ForegroundColor Cyan
        Write-Host "NOTE: Requires full stack to be running (frontend, backend, vision)" -ForegroundColor Yellow
        
        if (Test-Path "node_modules/@playwright") {
            Run-TestPhase "E2E Tests" "npx playwright test tests/e2e --reporter=list"
        } else {
            Write-Host "ERROR: Playwright not installed. Run: npx playwright install" -ForegroundColor Red
            exit 1
        }
    }
    
    "stress" {
        Write-Host "Running STRESS tests only..." -ForegroundColor Cyan
        Write-Host "NOTE: Requires backend to be running" -ForegroundColor Yellow
        Run-TestPhase "Stress Tests" "npx jest --config tests/jest.config.js tests/stress --testPathIgnorePatterns=[] --maxWorkers=1 --passWithNoTests"
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   TEST SUITE COMPLETE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Coverage reports: ./coverage/" -ForegroundColor Gray
Write-Host "Playwright reports: ./playwright-report/" -ForegroundColor Gray

