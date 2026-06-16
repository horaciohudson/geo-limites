# ========================================
# 🧪 TESTE MEMORIAL COM STANDARD ID
# ========================================

$API_BASE = "http://localhost:9010"

Write-Host "🚀 Iniciando teste do memorial com standardId..." -ForegroundColor Green

# ========================================
# 1. LOGIN PARA OBTER TOKEN
# ========================================
Write-Host "🔐 Fazendo login..." -ForegroundColor Yellow

$loginBody = @{
    email = "admin@memorialpro.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
    Write-Host "🎫 Token: $($token.Substring(0,20))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro no login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ========================================
# 2. LISTAR NORMAS DISPONÍVEIS
# ========================================
Write-Host "`n📋 Listando normas disponíveis..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $standards = Invoke-RestMethod -Uri "$API_BASE/api/memorial-standards" -Method GET -Headers $headers
    
    Write-Host "✅ Normas encontradas: $($standards.Count)" -ForegroundColor Green
    
    if ($standards.Count -gt 0) {
        $selectedStandard = $standards[0]
        Write-Host "🎯 Usando norma: $($selectedStandard.name) (ID: $($selectedStandard.id))" -ForegroundColor Cyan
        $standardId = $selectedStandard.id
    } else {
        Write-Host "⚠️ Nenhuma norma encontrada! Criando uma norma de teste..." -ForegroundColor Yellow
        
        # Criar norma de teste
        $createStandardBody = @{
            name = "Norma Teste"
            description = "Norma criada para teste"
            standardText = "Texto da norma de teste"
            promptTemplate = "Template de prompt de teste"
            active = $true
            isDefault = $true
        } | ConvertTo-Json
        
        $newStandard = Invoke-RestMethod -Uri "$API_BASE/api/memorial-standards" -Method POST -Body $createStandardBody -Headers $headers
        $standardId = $newStandard.id
        Write-Host "✅ Norma de teste criada: $($newStandard.name) (ID: $standardId)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Erro ao listar normas: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "⚠️ Usando ID fixo para teste..." -ForegroundColor Yellow
    $standardId = "12fb339a-89ce-457c-8292-b0109de2a1f1"
}

# ========================================
# 3. TESTE MEMORIAL COM STANDARD ID
# ========================================
Write-Host "`n🤖 Testando geração de memorial com standardId..." -ForegroundColor Yellow

$memorialBody = @{
    entities = @(
        @{
            type = "LINE"
            layer = "BOUNDARY"
            x = 325000.00
            y = 7650000.00
            x2 = 325020.00
            y2 = 7650000.00
            fingerprint = "line_north_boundary"
        },
        @{
            type = "LINE"
            layer = "BOUNDARY"
            x = 325020.00
            y = 7650000.00
            x2 = 325020.00
            y2 = 7649970.00
            fingerprint = "line_east_boundary"
        }
    )
    fileName = "test_with_standard.dxf"
    projectName = "Teste com StandardId"
    projectDescription = "Teste para verificar se o standardId está funcionando"
    standardId = $standardId
    propertyId = $null
} | ConvertTo-Json -Depth 10

Write-Host "📤 Enviando requisição com standardId: $standardId" -ForegroundColor Cyan

try {
    $startTime = Get-Date
    $memorialResponse = Invoke-RestMethod -Uri "$API_BASE/api/memorial/generate-gpt" -Method POST -Body $memorialBody -Headers $headers -TimeoutSec 180
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "✅ Memorial gerado com sucesso!" -ForegroundColor Green
    Write-Host "⏱️ Tempo: $duration segundos" -ForegroundColor Cyan
    Write-Host "📄 Tamanho: $($memorialResponse.memorialText.Length) caracteres" -ForegroundColor Cyan
    Write-Host "🏷️ Projeto: $($memorialResponse.projectName)" -ForegroundColor Cyan
    
    # Salvar resultado
    $memorialResponse | ConvertTo-Json -Depth 10 | Out-File "memorial_resultado_teste.json" -Encoding UTF8
    Write-Host "💾 Resultado salvo em: memorial_resultado_teste.json" -ForegroundColor Green
    
    # Mostrar início do memorial
    Write-Host "`n📖 Início do memorial gerado:" -ForegroundColor Yellow
    Write-Host $memorialResponse.memorialText.Substring(0, [Math]::Min(500, $memorialResponse.memorialText.Length)) -ForegroundColor White
    if ($memorialResponse.memorialText.Length -gt 500) {
        Write-Host "..." -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Erro na geração do memorial: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "📊 Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 400) {
            Write-Host "Erro 400: Verifique se o standardId esta sendo enviado corretamente" -ForegroundColor Yellow
        } elseif ($statusCode -eq 500) {
            Write-Host "Erro 500: Verifique se a norma existe no banco de dados" -ForegroundColor Yellow
        }
    }
}

# ========================================
# 4. TESTE SEM STANDARD ID (DEVE FALHAR)
# ========================================
Write-Host "`n🚫 Testando sem standardId (deve falhar)..." -ForegroundColor Yellow

$memorialBodyNoStandard = @{
    entities = @(
        @{
            type = "LINE"
            layer = "TEST"
            x = 100.0
            y = 100.0
            x2 = 200.0
            y2 = 200.0
        }
    )
    fileName = "test_no_standard.dxf"
    projectName = "Teste sem StandardId"
    projectDescription = "Este teste deve falhar"
    standardId = $null
    propertyId = $null
} | ConvertTo-Json -Depth 10

try {
    $failResponse = Invoke-RestMethod -Uri "$API_BASE/api/memorial/generate-gpt" -Method POST -Body $memorialBodyNoStandard -Headers $headers -TimeoutSec 30
    Write-Host "⚠️ ATENÇÃO: Memorial foi gerado sem standardId (não deveria acontecer!)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✅ Correto: Erro 400 retornado quando standardId é null" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro inesperado: Status $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Teste concluído!" -ForegroundColor Green