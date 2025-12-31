<#
.SYNOPSIS
    Sync with git, merge all branches into main, and create development branch

.DESCRIPTION
    This script:
    1. Fetches latest from remote
    2. Lists all branches
    3. Merges all branches into main
    4. Creates a development branch from main
    5. Pushes everything to remote

.EXAMPLE
    .\scripts\sync-and-merge-branches.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   GIT SYNC & BRANCH MERGE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is available
try {
    $null = Get-Command git -ErrorAction Stop
} catch {
    Write-Host "ERROR: git is not available in PATH" -ForegroundColor Red
    Write-Host "Please run this script in a terminal where git is configured." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual steps:" -ForegroundColor Yellow
    Write-Host "1. Open Git Bash or PowerShell with git in PATH" -ForegroundColor Gray
    Write-Host "2. cd C:\Users\kimba\OneDrive\Documents\Dixi" -ForegroundColor Gray
    Write-Host "3. Run the commands below:" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   git fetch --all" -ForegroundColor White
    Write-Host "   git branch -a" -ForegroundColor White
    Write-Host "   git checkout main" -ForegroundColor White
    Write-Host "   git pull origin main" -ForegroundColor White
    Write-Host "   git merge <branch-name>  # For each branch" -ForegroundColor White
    Write-Host "   git checkout -b development" -ForegroundColor White
    Write-Host "   git push origin main" -ForegroundColor White
    Write-Host "   git push origin development" -ForegroundColor White
    exit 1
}

# Navigate to project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray
Write-Host ""

# Step 1: Fetch latest from remote
Write-Host "Step 1: Fetching latest from remote..." -ForegroundColor Yellow
git fetch --all
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: git fetch failed. Continuing anyway..." -ForegroundColor Yellow
}
Write-Host ""

# Step 2: List all branches
Write-Host "Step 2: Listing all branches..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Local branches:" -ForegroundColor Cyan
git branch
Write-Host ""
Write-Host "Remote branches:" -ForegroundColor Cyan
git branch -r
Write-Host ""

# Step 3: Get current branch
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $currentBranch" -ForegroundColor Gray
Write-Host ""

# Step 4: Switch to main branch
Write-Host "Step 3: Switching to main branch..." -ForegroundColor Yellow
git checkout main
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not checkout main branch" -ForegroundColor Red
    Write-Host "Creating main branch if it doesn't exist..." -ForegroundColor Yellow
    git checkout -b main
}
Write-Host ""

# Step 5: Pull latest main
Write-Host "Step 4: Pulling latest main..." -ForegroundColor Yellow
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not pull main. May not exist on remote yet." -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Get all local branches (except main and HEAD)
Write-Host "Step 5: Finding branches to merge..." -ForegroundColor Yellow
$allBranches = git branch --format='%(refname:short)' | Where-Object { $_ -ne 'main' -and $_ -ne 'HEAD' }
Write-Host "Branches to merge: $($allBranches -join ', ')" -ForegroundColor Gray
Write-Host ""

# Step 7: Merge each branch into main
if ($allBranches.Count -gt 0) {
    Write-Host "Step 6: Merging branches into main..." -ForegroundColor Yellow
    foreach ($branch in $allBranches) {
        Write-Host "  Merging $branch..." -ForegroundColor Gray
        git merge $branch --no-edit
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WARNING: Merge conflict or error with $branch" -ForegroundColor Yellow
            Write-Host "  You may need to resolve conflicts manually." -ForegroundColor Yellow
        } else {
            Write-Host "  ✓ Merged $branch successfully" -ForegroundColor Green
        }
    }
} else {
    Write-Host "No other branches to merge." -ForegroundColor Gray
}
Write-Host ""

# Step 8: Stage all changes
Write-Host "Step 7: Staging all changes..." -ForegroundColor Yellow
git add -A
Write-Host ""

# Step 9: Commit if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "Step 8: Committing changes..." -ForegroundColor Yellow
    git commit -m "Merge all branches into main and add test suite"
    Write-Host ""
} else {
    Write-Host "No changes to commit." -ForegroundColor Gray
    Write-Host ""
}

# Step 10: Create development branch
Write-Host "Step 9: Creating development branch..." -ForegroundColor Yellow
$devBranchExists = git branch --list development
if ($devBranchExists) {
    Write-Host "Development branch already exists. Switching to it..." -ForegroundColor Gray
    git checkout development
    git merge main --no-edit
} else {
    Write-Host "Creating new development branch from main..." -ForegroundColor Gray
    git checkout -b development
}
Write-Host ""

# Step 11: Push main branch
Write-Host "Step 10: Pushing main branch to remote..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not push main. May need to set upstream:" -ForegroundColor Yellow
    Write-Host "  git push -u origin main" -ForegroundColor White
} else {
    Write-Host "✓ Main branch pushed successfully" -ForegroundColor Green
}
Write-Host ""

# Step 12: Push development branch
Write-Host "Step 11: Pushing development branch to remote..." -ForegroundColor Yellow
git push -u origin development
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not push development branch." -ForegroundColor Yellow
} else {
    Write-Host "✓ Development branch pushed successfully" -ForegroundColor Green
}
Write-Host ""

# Step 13: Show final status
Write-Host "Step 12: Final status..." -ForegroundColor Yellow
git status
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   SYNC COMPLETE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Current branch: $(git rev-parse --abbrev-ref HEAD)" -ForegroundColor Gray
Write-Host ""
Write-Host "Branches:" -ForegroundColor Cyan
git branch -a
Write-Host ""

