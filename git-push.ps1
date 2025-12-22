# Quick Git Push Script
$ErrorActionPreference = "Continue"

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($scriptPath) {
    Set-Location $scriptPath
}

Write-Host "Staging changes..." -ForegroundColor Yellow
git add -A

Write-Host "Committing changes..." -ForegroundColor Yellow
$commitMessage = "Fix: Auto-start gesture tracking for camera feed - Prevent app crash when backend unavailable"
git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "Pushing to git..." -ForegroundColor Yellow
    $currentBranch = git branch --show-current 2>$null
    if ($currentBranch) {
        git push origin $currentBranch
    } else {
        git push
    }
    Write-Host "Done!" -ForegroundColor Green
} else {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}

