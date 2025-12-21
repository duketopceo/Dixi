# Firebase Deployment Script (Non-Interactive)
# Automatically builds and deploys to Firebase Hosting

Write-Host "🔥 Firebase Deployment for Dixi" -ForegroundColor Cyan
Write-Host ""

# Try to use npx firebase-tools if firebase CLI not in PATH
$firebaseCmd = "firebase"
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseInstalled) {
    Write-Host "Firebase CLI not in PATH, trying npx..." -ForegroundColor Yellow
    $firebaseCmd = "npx firebase-tools"
}

Write-Host "Using: $firebaseCmd" -ForegroundColor Gray
Write-Host ""

# Build frontend
Write-Host "Building frontend for production..." -ForegroundColor Yellow
Set-Location packages/frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed!" -ForegroundColor Red
        Set-Location ../..
        exit 1
    }
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

# Verify dist folder
if (-not (Test-Path "packages/frontend/dist")) {
    Write-Host "❌ Build output not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build output verified" -ForegroundColor Green
Write-Host ""

# Deploy to Firebase
Write-Host "🚀 Deploying to Firebase Hosting (Free Tier)..." -ForegroundColor Cyan
Write-Host "⚠️  Firebase Hosting is FREE - No billing required" -ForegroundColor Yellow
Write-Host ""

& $firebaseCmd deploy --only hosting --project dixi-vision

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Your site is live at:" -ForegroundColor Cyan
    Write-Host "   https://dixi-vision.web.app" -ForegroundColor White
    Write-Host "   https://dixi-vision.firebaseapp.com" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening site..." -ForegroundColor Yellow
    Start-Process "https://dixi-vision.web.app"
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check error messages above" -ForegroundColor Yellow
    exit 1
}

