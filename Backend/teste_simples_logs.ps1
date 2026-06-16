# Teste Simples para Logs da Propriedade
$API_BASE = "http://localhost:9010"

Write-Host "=== TESTE SIMPLES DE LOGS ===" -ForegroundColor Cyan

# 1. Login
Write-Host "1. Login..." -ForegroundColor Green
$loginBody = @{
    email = "admin@memorialpro.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "✅ Login OK" -ForegroundColor Green

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Criar propriedade
Write-Host "2. Criando propriedade..." -ForegroundColor Green
$propertyBody = @{
    name = "Teste Logs"
    ownerName = "João Silva"
    street = "Rua das Flores"
    city = "São Paulo"
    state = "SP"
    totalArea = 600.00
} | ConvertTo-Json

$propertyResponse = Invoke-RestMethod -Uri "$API_BASE/api/properties" -Method POST -Body $propertyBody -Headers $headers
$propertyId = $propertyResponse.propertyId
Write-Host "✅ Propriedade criada: $propertyId" -ForegroundColor Green

# 3. Gerar memorial COM propertyId
Write-Host "3. Gerando memorial COM propertyId..." -ForegroundColor Yellow
Write-Host "🔍 VERIFIQUE OS LOGS DO BACKEND AGORA!" -ForegroundColor Cyan

$memorialBody = @{
    entities = @(
        @{
            type = "LINE"
            layer = "BOUNDARY"
            x = 325000.00
            y = 7650000.00
            x2 = 325020.00
            y2 = 7650000.00
        }
    )
    fileName = "teste.dxf"
    projectName = "Teste Logs"
    projectDescription = "Teste"
    standardId = "12fb339a-89ce-457c-8292-b0109de2a1f1"
    propertyId = $propertyId
} | ConvertTo-Json -Depth 10

Write-Host "📡 Enviando com propertyId: $propertyId" -ForegroundColor Cyan

try {
    $memorialResponse = Invoke-RestMethod -Uri "$API_BASE/api/memorial/generate-gpt" -Method POST -Body $memorialBody -Headers $headers -TimeoutSec 180
    Write-Host "✅ Memorial gerado!" -ForegroundColor Green
    
    # Verificar se contém dados da propriedade
    $memorial = $memorialResponse.memorialText
    if ($memorial -match "João Silva") {
        Write-Host "✅ Nome do proprietário ENCONTRADO no memorial!" -ForegroundColor Green
    } else {
        Write-Host "❌ Nome do proprietário NÃO encontrado no memorial" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Limpar
Write-Host "4. Limpando..." -ForegroundColor Green
Invoke-RestMethod -Uri "$API_BASE/api/properties/$propertyId" -Method DELETE -Headers $headers
Write-Host "✅ Concluído!" -ForegroundColor Green