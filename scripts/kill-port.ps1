# Kill process using a specific port
param(
    [Parameter(Mandatory=$true)]
    [int]$Port
)

Write-Host "Finding process using port $Port..." -ForegroundColor Cyan

try {
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    
    if ($connections) {
        $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 }
        
        if ($processIds) {
            $killed = $false
            foreach ($processId in $processIds) {
                try {
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    
                    if ($process) {
                        Write-Host "Found process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Yellow
                        Write-Host "Killing process..." -ForegroundColor Yellow
                        
                        Stop-Process -Id $processId -Force -ErrorAction Stop
                        Write-Host "✅ Process $processId killed successfully" -ForegroundColor Green
                        $killed = $true
                    } else {
                        Write-Host "⚠️  Process with PID $processId not found (may have already exited)" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "⚠️  Could not kill process $processId : $_" -ForegroundColor Yellow
                    Write-Host "   Try running as Administrator or manually kill it" -ForegroundColor Gray
                }
            }
            
            if (-not $killed) {
                Write-Host "❌ Could not kill any processes. Try running as Administrator:" -ForegroundColor Red
                Write-Host "   Run PowerShell as Administrator and try again" -ForegroundColor Yellow
                exit 1
            }
        } else {
            Write-Host "⚠️  Found connections but could not determine valid process IDs" -ForegroundColor Yellow
            Write-Host "   Port may be in TIME_WAIT state. Wait a few seconds and try again." -ForegroundColor Gray
        }
    } else {
        Write-Host "✅ No process found using port $Port" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "   Try running as Administrator" -ForegroundColor Yellow
    exit 1
}

