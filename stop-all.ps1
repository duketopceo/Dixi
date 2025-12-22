# Stop All Dixi Services
# This script stops all running services (Docker and npm processes)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Stopping All Dixi Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop Docker Compose services
Write-Host "Step 1: Stopping Docker Compose services..." -ForegroundColor Yellow
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose down
    Write-Host "  Docker Compose services stopped" -ForegroundColor Green
} else {
    Write-Host "  Docker Compose not found, skipping..." -ForegroundColor Yellow
}

# Step 2: Kill npm/node/python processes on ports 3000, 3001, 3002, 5000
Write-Host ""
Write-Host "Step 2: Stopping processes on service ports..." -ForegroundColor Yellow

$ports = @(3000, 3001, 3002, 5000)
foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $processId = $conn.OwningProcess
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process -and ($process.ProcessName -eq "node" -or $process.ProcessName -eq "npm" -or $process.ProcessName -eq "python" -or $process.ProcessName -eq "python3")) {
                    Write-Host "  Stopping $($process.ProcessName) on port $port (PID: $processId)..." -ForegroundColor Gray
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {
        # Port might not be in use, continue
    }
}

Write-Host "  Port cleanup complete" -ForegroundColor Green

# Step 3: Kill any remaining node/npm processes related to Dixi
Write-Host ""
Write-Host "Step 3: Cleaning up any remaining Dixi processes..." -ForegroundColor Yellow
$dixiProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*Dixi*" -or $_.CommandLine -like "*Dixi*"
}
if ($dixiProcesses) {
    foreach ($proc in $dixiProcesses) {
        Write-Host "  Stopping process: $($proc.ProcessName) (PID: $($proc.Id))..." -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All Services Stopped!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start services again, run:" -ForegroundColor Cyan
Write-Host "  .\start-dev.ps1" -ForegroundColor White
Write-Host "  OR" -ForegroundColor White
Write-Host "  docker-compose up" -ForegroundColor White
Write-Host ""

