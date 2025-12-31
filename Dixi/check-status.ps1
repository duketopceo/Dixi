# Check Dixi App Status
# This script checks if all services are running

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dixi App Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker containers
Write-Host "Checking Docker containers..." -ForegroundColor Yellow
docker ps --filter "name=dixi" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "Checking all running containers..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "Testing service endpoints..." -ForegroundColor Yellow

# Test Backend Health
Write-Host ""
Write-Host "Backend Health Check (http://localhost:3001/health):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "  ✅ Backend is running! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Backend is not responding" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Frontend
Write-Host ""
Write-Host "Frontend Check (http://localhost:3000):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    Write-Host "  ✅ Frontend is running! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Frontend is not responding" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Vision Service
Write-Host ""
Write-Host "Vision Service Check (http://localhost:5000):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -TimeoutSec 5 -UseBasicParsing
    Write-Host "  ✅ Vision service is running! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Vision service may not be running (optional)" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Status Check Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If services are not running, start them with:" -ForegroundColor Yellow
Write-Host "  docker-compose up" -ForegroundColor White
Write-Host ""

