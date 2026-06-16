# Teste Memorial Simples
$API_BASE = "http://localhost:9010"

Write-Host "Iniciando teste do memorial..." -ForegroundColor Green

# Login
$loginBody = @{
    email = "admin@memorialpro.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Login realizado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "Erro no login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Teste memorial com standardId
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$memorialBody = @{
    entities = @(
        @{
            type = "LINE"
            layer = "BOUNDARY"
            x = 325000.00
            y = 7650000.00
            x2 = 325020.00
            y2 = 7650000.00
            fingerprint = "line_test"
        }
    )
    fileName = "test.dxf"
    projectName = "Teste StandardId"
    projectDescription = "Teste"
    standardId = "12fb339a-89ce-457c-8292-b0109de2a1f1"
    propertyId = $null
} | ConvertTo-Json -Depth 10

Write-Host "Enviando requisicao com standardId..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/api/memorial/generate-gpt" -Method POST -Body $memorialBody -Headers $headers -TimeoutSec 180
    Write-Host "Memorial gerado com sucesso!" -ForegroundColor Green
    Write-Host "Tamanho: $($response.memorialText.Length) caracteres" -ForegroundColor Cyan
    
    # Salvar resultado
    $response | ConvertTo-Json -Depth 10 | Out-File "resultado_teste.json" -Encoding UTF8
    
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}

Write-Host "Teste concluido!" -ForegroundColor Green