# Check Which Services Are Running
# Quick diagnostic script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dixi Services Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check ports
$ports = @{
    3000 = "Frontend"
    3001 = "Backend API"
    3002 = "WebSocket"
    5000 = "Vision Service"
    11434 = "Ollama (optional)"
}

foreach ($port in $ports.Keys) {
    $serviceName = $ports[$port]
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connections) {
        $process = Get-Process -Id $connections[0].OwningProcess -ErrorAction SilentlyContinue
        Write-Host "✅ $serviceName (port $port): RUNNING" -ForegroundColor Green
        if ($process) {
            Write-Host "   Process: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ $serviceName (port $port): NOT RUNNING" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quick Fix:" -ForegroundColor Yellow
Write-Host "  Run: .\start-dev.ps1" -ForegroundColor White
Write-Host ""

