# TESTE SIMPLES DAS MELHORIAS DO BACKEND
Write-Host "TESTANDO MELHORIAS DO BACKEND" -ForegroundColor Green

$API_BASE = "http://localhost:9010"

# Login
Write-Host "1. Login..."
$loginBody = '{"username":"admin@memorialpro.com","password":"123456"}'
$loginResponse = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginBody
$token = $loginResponse.token
Write-Host "   Login OK" -ForegroundColor Green

# Teste Dashboard
Write-Host "2. Dashboard..."
try {
    $dashboard = Invoke-RestMethod -Uri "$API_BASE/api/monitor/dashboard" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "   Dashboard OK - Status: $($dashboard.status.overall)" -ForegroundColor Green
} catch {
    Write-Host "   Dashboard ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste Conectividade
Write-Host "3. Conectividade..."
try {
    $connectivity = Invoke-RestMethod -Uri "$API_BASE/api/monitor/connectivity" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "   Conectividade OK - OpenAI: $($connectivity.openai.connected)" -ForegroundColor Green
} catch {
    Write-Host "   Conectividade ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste Métricas
Write-Host "4. Métricas..."
try {
    $realtime = Invoke-RestMethod -Uri "$API_BASE/api/monitor/realtime" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "   Métricas OK - Gerações 24h: $($realtime.generations24h)" -ForegroundColor Green
} catch {
    Write-Host "   Métricas ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste Health
Write-Host "5. Health Check..."
try {
    $health = Invoke-RestMethod -Uri "$API_BASE/api/memorial/stats/health" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "   Health OK - Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   Health ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "TESTES CONCLUIDOS!" -ForegroundColor Green