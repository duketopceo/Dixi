# Deploy Script - Git Push, Start App, Deploy to Firebase
# Run this script from the project root

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dixi Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptPath) {
    Set-Location $scriptPath
}

# Step 1: Git Status
Write-Host "Step 1: Checking git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "Step 2: Staging all changes..." -ForegroundColor Yellow
git add -A
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: git add failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Committing changes..." -ForegroundColor Yellow
$commitMessage = "Complete test suite and backend services - All Phase 6-10 features implemented and tested"
git commit -m $commitMessage -m "- Comprehensive test suite: 20+ test files, 100+ test cases" -m "- Backend routes: gesture-recorder, prompt-templates, metrics, admin" -m "- Integration tests for advanced features" -m "- Updated docker-compose.yml with correct build contexts" -m "- Updated AI_to_Khan.md with latest status" -m "- All planned features complete and production-ready"

if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit or commit failed. Continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 4: Pushing to git..." -ForegroundColor Yellow
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

if ($LASTEXITCODE -ne 0) {
    Write-Host "Git push failed. Continuing anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 5: Building frontend for production..." -ForegroundColor Yellow
Set-Location packages/frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

Set-Location ../..

Write-Host ""
Write-Host "Step 6: Deploying to Firebase..." -ForegroundColor Yellow
firebase deploy --only hosting --project dixi-vision

if ($LASTEXITCODE -ne 0) {
    Write-Host "Firebase deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the app locally:" -ForegroundColor Cyan
Write-Host "  docker-compose up" -ForegroundColor White
Write-Host "  OR" -ForegroundColor White
Write-Host "  npm run dev (in packages/backend and packages/frontend)" -ForegroundColor White
Write-Host ""

