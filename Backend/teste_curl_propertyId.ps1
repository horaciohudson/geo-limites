# Teste direto com curl para verificar propertyId
$API_BASE = "http://localhost:9010"

Write-Host "=== TESTE DIRETO PROPERTYID ===" -ForegroundColor Cyan

# 1. Login primeiro
Write-Host "1. Fazendo login..." -ForegroundColor Green

$loginJson = '{"email":"admin@memorialpro.com","password":"admin123"}'

try {
    $loginResult = curl -X POST "$API_BASE/api/auth/login" -H "Content-Type: application/json" -d $loginJson 2>$null
    $loginData = $loginResult | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "✅ Login OK - Token: $($token.Substring(0,20))..." -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Testar memorial COM propertyId
Write-Host "2. Testando memorial COM propertyId..." -ForegroundColor Yellow
Write-Host "🔍 VERIFIQUE OS LOGS DO BACKEND!" -ForegroundColor Cyan

$memorialJson = Get-Content "teste_direto_propertyId.json" -Raw

$headers = @(
    "Authorization: Bearer $token",
    "Content-Type: application/json"
)

Write-Host "📡 Enviando requisição com propertyId: 12345678-1234-1234-1234-123456789012" -ForegroundColor Cyan

try {
    $result = curl -X POST "$API_BASE/api/memorial/generate-gpt" -H $headers[0] -H $headers[1] -d $memorialJson 2>$null
    Write-Host "✅ Requisição enviada!" -ForegroundColor Green
    Write-Host "📋 Resposta recebida (primeiros 200 chars):" -ForegroundColor Yellow
    Write-Host $result.Substring(0, [Math]::Min(200, $result.Length)) -ForegroundColor White
} catch {
    Write-Host "❌ Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🔍 VERIFIQUE OS LOGS DO BACKEND para ver se o propertyId chegou!" -ForegroundColor Cyan