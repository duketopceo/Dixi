# Start Dixi Application
# This script starts all services using docker-compose

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Dixi Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting services with docker-compose..." -ForegroundColor Yellow
docker-compose up

Write-Host ""
Write-Host "Services started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "WebSocket: ws://localhost:3002" -ForegroundColor Cyan
Write-Host "Vision Service: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""

