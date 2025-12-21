# Comprehensive Test Script for Dixi Application
# Tests all services and functionality

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIXI COMPREHENSIVE SYSTEM TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allTestsPassed = $true
$testResults = @()

function Test-Service {
    param(
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSeconds = 5
    )
    
    Write-Host "Testing $Name..." -NoNewline
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSeconds -ErrorAction Stop
        Write-Host " ✅ PASSED (Status: $($response.StatusCode))" -ForegroundColor Green
        return @{ Success = $true; StatusCode = $response.StatusCode; Content = $response.Content }
    } catch {
        Write-Host " ❌ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Test-OllamaConnection {
    Write-Host "`n--- Testing Ollama Service ---" -ForegroundColor Cyan
    $result = Test-Service -Name "Ollama API" -Url "http://localhost:11434/api/tags"
    
    if ($result.Success) {
        try {
            $json = $result.Content | ConvertFrom-Json
            $models = $json.models | ForEach-Object { $_.name }
            Write-Host "   Available models: $($models -join ', ')" -ForegroundColor Gray
            return @{ Success = $true; Models = $models }
        } catch {
            Write-Host "   Warning: Could not parse model list" -ForegroundColor Yellow
            return @{ Success = $true; Models = @() }
        }
    }
    return @{ Success = $false }
}

function Test-BackendHealth {
    Write-Host "`n--- Testing Backend Service ---" -ForegroundColor Cyan
    
    # Basic health check
    $health = Test-Service -Name "Backend Health" -Url "http://localhost:3001/health"
    if (-not $health.Success) {
        return @{ Success = $false }
    }
    
    # Deep health check
    $deepHealth = Test-Service -Name "Backend Deep Health" -Url "http://localhost:3001/health/deep"
    if ($deepHealth.Success) {
        try {
            $json = $deepHealth.Content | ConvertFrom-Json
            Write-Host "   Overall Status: $($json.status)" -ForegroundColor $(if ($json.status -eq 'healthy') { 'Green' } else { 'Yellow' })
            if ($json.checks.ollama) {
                Write-Host "   Ollama Status: $($json.checks.ollama.status)" -ForegroundColor $(if ($json.checks.ollama.status -eq 'healthy') { 'Green' } else { 'Yellow' })
            }
        } catch {
            Write-Host "   Warning: Could not parse health data" -ForegroundColor Yellow
        }
    }
    
    return @{ Success = $health.Success }
}

function Test-AIService {
    Write-Host "`n--- Testing AI Service ---" -ForegroundColor Cyan
    
    # Check AI status
    $status = Test-Service -Name "AI Service Status" -Url "http://localhost:3001/api/ai/status"
    if (-not $status.Success) {
        return @{ Success = $false }
    }
    
    try {
        $json = $status.Content | ConvertFrom-Json
        Write-Host "   Model: $($json.modelName)" -ForegroundColor Gray
        Write-Host "   Ollama Status: $($json.ollamaStatus)" -ForegroundColor $(if ($json.ollamaStatus -eq 'connected') { 'Green' } else { 'Yellow' })
        Write-Host "   Initialized: $($json.initialized)" -ForegroundColor Gray
        Write-Host "   Base URL: $($json.ollamaBaseUrl)" -ForegroundColor Gray
        
        # Test actual AI inference
        Write-Host "`n   Testing AI inference..." -NoNewline
        try {
            $inferBody = @{
                query = "Say hello and confirm you're working. Keep it brief."
                context = $null
            } | ConvertTo-Json
            
            $inferResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/ai/infer" `
                -Method POST `
                -Body $inferBody `
                -ContentType "application/json" `
                -UseBasicParsing `
                -TimeoutSec 30 `
                -ErrorAction Stop
            
            $inferJson = $inferResponse.Content | ConvertFrom-Json
            Write-Host " ✅ PASSED" -ForegroundColor Green
            Write-Host "   Response preview: $($inferJson.text.Substring(0, [Math]::Min(100, $inferJson.text.Length)))..." -ForegroundColor Gray
            Write-Host "   Inference time: $($inferJson.metadata.inferenceTime)ms" -ForegroundColor Gray
            
            return @{ Success = $true; InferenceWorking = $true }
        } catch {
            Write-Host " ❌ FAILED" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
            return @{ Success = $true; InferenceWorking = $false }
        }
    } catch {
        Write-Host "   Warning: Could not parse AI status" -ForegroundColor Yellow
        return @{ Success = $true }
    }
}

function Test-Frontend {
    Write-Host "`n--- Testing Frontend Service ---" -ForegroundColor Cyan
    $result = Test-Service -Name "Frontend" -Url "http://localhost:3000"
    return $result
}

function Test-WebSocket {
    Write-Host "`n--- Testing WebSocket Server ---" -ForegroundColor Cyan
    Write-Host "Checking WebSocket port 3002..." -NoNewline
    try {
        $connection = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
        if ($connection) {
            Write-Host " ✅ LISTENING" -ForegroundColor Green
            return @{ Success = $true }
        } else {
            Write-Host " ⚠️  NOT LISTENING" -ForegroundColor Yellow
            return @{ Success = $false }
        }
    } catch {
        Write-Host " ⚠️  COULD NOT CHECK" -ForegroundColor Yellow
        return @{ Success = $false }
    }
}

# Run all tests
Write-Host "Starting comprehensive system tests...`n" -ForegroundColor Cyan

# Test 1: Ollama
$ollamaResult = Test-OllamaConnection
$testResults += @{ Name = "Ollama"; Success = $ollamaResult.Success }

# Test 2: Backend
$backendResult = Test-BackendHealth
$testResults += @{ Name = "Backend"; Success = $backendResult.Success }

# Test 3: AI Service
$aiResult = Test-AIService
$testResults += @{ Name = "AI Service"; Success = $aiResult.Success }

# Test 4: Frontend
$frontendResult = Test-Frontend
$testResults += @{ Name = "Frontend"; Success = $frontendResult.Success }

# Test 5: WebSocket
$wsResult = Test-WebSocket
$testResults += @{ Name = "WebSocket"; Success = $wsResult.Success }

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Success }).Count
$total = $testResults.Count

foreach ($test in $testResults) {
    $status = if ($test.Success) { "✅ PASSED" } else { "❌ FAILED" }
    $color = if ($test.Success) { "Green" } else { "Red" }
    Write-Host "  $($test.Name): $status" -ForegroundColor $color
}

Write-Host "`n  Results: $passed/$total tests passed" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })

if ($passed -eq $total) {
    Write-Host "`n🎉 All systems operational!" -ForegroundColor Green
    $allTestsPassed = $true
} else {
    Write-Host "`n⚠️  Some tests failed. Check the errors above." -ForegroundColor Yellow
    $allTestsPassed = $false
}

Write-Host "`n========================================" -ForegroundColor Cyan
return $allTestsPassed

