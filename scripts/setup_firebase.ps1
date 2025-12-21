# Firebase Setup Script for Dixi
# This script helps initialize Firebase for the project

Write-Host "🔥 Firebase Setup for Dixi" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "Checking Firebase CLI installation..." -ForegroundColor Yellow
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseInstalled) {
    Write-Host "❌ Firebase CLI not found. Installing..." -ForegroundColor Red
    Write-Host "Run: npm install -g firebase-tools" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Firebase CLI found" -ForegroundColor Green
Write-Host ""

# Check if user is logged in
Write-Host "Checking Firebase login status..." -ForegroundColor Yellow
$loginStatus = firebase login:list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to Firebase. Please login:" -ForegroundColor Yellow
    Write-Host "   firebase login" -ForegroundColor Cyan
    Write-Host ""
    $login = Read-Host "Do you want to login now? (y/n)"
    if ($login -eq "y" -or $login -eq "Y") {
        firebase login
    } else {
        Write-Host "Please login manually and run this script again." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✅ Logged in to Firebase" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Firebase Configuration:" -ForegroundColor Cyan
Write-Host "  - Hosting: packages/frontend/dist" -ForegroundColor Gray
Write-Host "  - Functions: packages/backend" -ForegroundColor Gray
Write-Host "  - Project: dixi-vision" -ForegroundColor Gray
Write-Host ""

# Check if project exists
Write-Host "Current Firebase projects:" -ForegroundColor Yellow
firebase projects:list

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Verify project 'dixi-vision' exists in your Firebase account" -ForegroundColor Gray
Write-Host "2. Build frontend: npm run build:frontend" -ForegroundColor Gray
Write-Host "3. Deploy: firebase deploy" -ForegroundColor Gray
Write-Host "   Or deploy only hosting: firebase deploy --only hosting" -ForegroundColor Gray
Write-Host "   Or deploy only functions: firebase deploy --only functions" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Firebase setup complete!" -ForegroundColor Green

