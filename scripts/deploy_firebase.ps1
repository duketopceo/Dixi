# Firebase Deployment Script for Dixi
# This script builds and deploys the frontend to Firebase Hosting (Free Tier)

Write-Host "🔥 Firebase Deployment for Dixi" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseInstalled) {
    Write-Host "❌ Firebase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Firebase CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g firebase-tools" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or if npm is not in PATH, use:" -ForegroundColor Yellow
    Write-Host "  npx firebase-tools deploy --only hosting" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "✅ Firebase CLI found" -ForegroundColor Green
Write-Host ""

# Check login status
Write-Host "Checking Firebase login..." -ForegroundColor Yellow
$loginCheck = firebase login:list 2>&1
if ($LASTEXITCODE -ne 0 -or $loginCheck -match "No authorized accounts") {
    Write-Host "⚠️  Not logged in to Firebase" -ForegroundColor Yellow
    Write-Host "Please run: firebase login" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "✅ Logged in to Firebase" -ForegroundColor Green
Write-Host ""

# Verify project
Write-Host "Verifying Firebase project..." -ForegroundColor Yellow
$projectCheck = firebase use 2>&1
if ($projectCheck -match "dixi-vision") {
    Write-Host "✅ Using project: dixi-vision" -ForegroundColor Green
} else {
    Write-Host "⚠️  Setting project to dixi-vision..." -ForegroundColor Yellow
    firebase use dixi-vision
}

Write-Host ""

# Build frontend
Write-Host "Building frontend for production..." -ForegroundColor Yellow
Set-Location packages/frontend

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Running production build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

Write-Host "✅ Build complete" -ForegroundColor Green
Set-Location ../..
Write-Host ""

# Verify dist folder exists
if (-not (Test-Path "packages/frontend/dist")) {
    Write-Host "❌ Build output not found at packages/frontend/dist" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Build output verified" -ForegroundColor Green
Write-Host ""

# Deploy to Firebase Hosting (FREE TIER - Spark Plan)
Write-Host "🚀 Deploying to Firebase Hosting (Free Tier)..." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: Firebase Hosting is FREE on Spark plan:" -ForegroundColor Yellow
Write-Host "   - 10 GB storage" -ForegroundColor Gray
Write-Host "   - 360 MB/day transfer" -ForegroundColor Gray
Write-Host "   - No credit card required" -ForegroundColor Gray
Write-Host ""

$deploy = Read-Host "Deploy now? (y/n)"
if ($deploy -ne "y" -and $deploy -ne "Y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Deploying..." -ForegroundColor Cyan
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    
    # Get deployment URL
    $deployInfo = firebase hosting:sites:list 2>&1
    Write-Host "🌐 Your site is live at:" -ForegroundColor Cyan
    Write-Host "   https://dixi-vision.web.app" -ForegroundColor White
    Write-Host "   https://dixi-vision.firebaseapp.com" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening site in browser..." -ForegroundColor Yellow
    Start-Process "https://dixi-vision.web.app"
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ All done!" -ForegroundColor Green

