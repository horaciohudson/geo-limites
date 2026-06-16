# Teste Memorial com Logs Detalhados da Propriedade
$API_BASE = "http://localhost:9010"

Write-Host "=== TESTE DE LOGS DETALHADOS DA PROPRIEDADE ===" -ForegroundColor Cyan
Write-Host "Este teste vai gerar logs detalhados para rastrear os dados da propriedade" -ForegroundColor Yellow

# Login
Write-Host "1. Fazendo login..." -ForegroundColor Green
$loginBody = @{
    email = "admin@memorialpro.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Criar uma propriedade de teste com TODOS os campos preenchidos
Write-Host "2. Criando propriedade de teste com TODOS os campos..." -ForegroundColor Green

$propertyBody = @{
    name = "Lote 25 - Quadra B - Teste Logs Detalhados"
    ownerName = "João Silva Santos"
    ownerDocument = "123.456.789-00"
    ownerPhone = "+55 11 99999-9999"
    ownerEmail = "joao.santos@email.com"
    street = "Rua das Flores"
    number = "123"
    neighborhood = "Centro"
    city = "São Paulo"
    state = "SP"
    zipCode = "01234-567"
    coordinateSystem = "SIRGAS 2000 / UTM zone 23S"
    totalArea = 600.00
    totalPerimeter = 100.00
    registrationNumber = "12345"
    registryOffice = "1º Cartório de Registro de Imóveis"
    northBoundary = "Confronta ao norte com a Rua das Flores"
    southBoundary = "Confronta ao sul com propriedade de Maria Silva"
    eastBoundary = "Confronta ao leste com propriedade de José Santos"
    westBoundary = "Confronta ao oeste com a Avenida Principal"
} | ConvertTo-Json

try {
    $propertyResponse = Invoke-RestMethod -Uri "$API_BASE/api/properties" -Method POST -Body $propertyBody -Headers $headers
    $propertyId = $propertyResponse.propertyId
    Write-Host "✅ Propriedade criada: $($propertyResponse.name)" -ForegroundColor Green
    Write-Host "📋 PropertyId: $propertyId" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro ao criar propriedade: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Gerar memorial usando a propriedade (FOCO NOS LOGS)
Write-Host "3. Gerando memorial com propertyId para análise de logs..." -ForegroundColor Green
Write-Host "⚠️ ATENÇÃO: Verifique os logs do backend para ver os dados detalhados!" -ForegroundColor Yellow

$memorialBody = @{
    entities = @(
        @{
            type = "LINE"
            layer = "BOUNDARY"
            x = 325000.00
            y = 7650000.00
            x2 = 325020.00
            y2 = 7650000.00
            fingerprint = "line_north"
        },
        @{
            type = "LINE"
            layer = "BOUNDARY"
            x = 325020.00
            y = 7650000.00
            x2 = 325020.00
            y2 = 7649970.00
            fingerprint = "line_east"
        }
    )
    fileName = "propriedade_teste_logs.dxf"
    projectName = "Teste de Logs Detalhados"
    projectDescription = "Teste para verificar logs da propriedade no memorial"
    standardId = "12fb339a-89ce-457c-8292-b0109de2a1f1"
    propertyId = $propertyId
} | ConvertTo-Json -Depth 10

Write-Host "📡 Enviando requisição com propertyId: $propertyId" -ForegroundColor Cyan
Write-Host "🔍 VERIFIQUE OS LOGS DO BACKEND AGORA!" -ForegroundColor Yellow

try {
    $startTime = Get-Date
    Write-Host "⏰ Iniciando geração às $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
    
    $memorialResponse = Invoke-RestMethod -Uri "$API_BASE/api/memorial/generate-gpt" -Method POST -Body $memorialBody -Headers $headers -TimeoutSec 180
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "✅ Memorial gerado com sucesso!" -ForegroundColor Green
    Write-Host "⏰ Tempo: $duration segundos" -ForegroundColor Cyan
    Write-Host "📄 Tamanho: $($memorialResponse.memorialText.Length) caracteres" -ForegroundColor Cyan
    
    # Salvar resultado
    $memorialResponse | ConvertTo-Json -Depth 10 | Out-File "memorial_teste_logs.json" -Encoding UTF8
    
    # Verificar se contém dados reais da propriedade
    $memorial = $memorialResponse.memorialText
    
    Write-Host "=== VERIFICAÇÃO DOS DADOS NO MEMORIAL ===" -ForegroundColor Yellow
    
    $checks = @(
        @{ Name = "Nome do proprietário (João Silva Santos)"; Pattern = "João Silva Santos"; Found = $false },
        @{ Name = "Endereço (Rua das Flores)"; Pattern = "Rua das Flores"; Found = $false },
        @{ Name = "Cidade (São Paulo)"; Pattern = "São Paulo"; Found = $false },
        @{ Name = "Área (600)"; Pattern = "600"; Found = $false },
        @{ Name = "Matrícula (12345)"; Pattern = "12345"; Found = $false },
        @{ Name = "Confrontação Norte"; Pattern = "Rua das Flores"; Found = $false },
        @{ Name = "Sistema de coordenadas"; Pattern = "SIRGAS"; Found = $false }
    )
    
    foreach ($check in $checks) {
        if ($memorial -match $check.Pattern) {
            $check.Found = $true
            Write-Host "✅ $($check.Name): ENCONTRADO" -ForegroundColor Green
        } else {
            Write-Host "❌ $($check.Name): NÃO ENCONTRADO" -ForegroundColor Red
        }
    }
    
    $foundCount = ($checks | Where-Object { $_.Found }).Count
    $totalCount = $checks.Count
    $percentage = [math]::Round(($foundCount / $totalCount) * 100, 1)
    
    Write-Host "📊 RESULTADO: $foundCount/$totalCount dados encontrados ($percentage%)" -ForegroundColor Cyan
    
    if ($percentage -ge 70) {
        Write-Host "🎉 EXCELENTE: Dados da propriedade estão sendo usados!" -ForegroundColor Green
    } elseif ($percentage -ge 50) {
        Write-Host "✅ BOM: Alguns dados da propriedade estão sendo usados" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️ PROBLEMA: Poucos dados da propriedade no memorial" -ForegroundColor Red
        Write-Host "🔍 VERIFIQUE OS LOGS DO BACKEND para entender o que aconteceu!" -ForegroundColor Yellow
    }
    
    # Mostrar trecho do memorial
    Write-Host "=== TRECHO DO MEMORIAL GERADO ===" -ForegroundColor Yellow
    $excerpt = $memorial.Substring(0, [Math]::Min(1000, $memorial.Length))
    Write-Host $excerpt -ForegroundColor White
    
    if ($memorial.Length > 1000) {
        Write-Host "... (memorial completo salvo em memorial_teste_logs.json)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Erro na geração do memorial: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "🔍 VERIFIQUE OS LOGS DO BACKEND para mais detalhes!" -ForegroundColor Yellow
}

# 4. Limpar - deletar propriedade de teste
Write-Host "4. Limpando propriedade de teste..." -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "$API_BASE/api/properties/$propertyId" -Method DELETE -Headers $headers
    Write-Host "✅ Propriedade de teste removida" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Erro ao remover propriedade: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "=== TESTE CONCLUÍDO ===" -ForegroundColor Cyan
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Verifique os logs do backend (console ou arquivo de log)" -ForegroundColor White
Write-Host "2. Procure por linhas com '=== INICIANDO BUSCA DETALHADA DA PROPRIEDADE ===' " -ForegroundColor White
Write-Host "3. Analise se todos os campos estão sendo recuperados corretamente" -ForegroundColor White
Write-Host "4. Verifique se os dados estão sendo adicionados ao prompt" -ForegroundColor White
Write-Host "5. Compare com o memorial gerado para ver se os dados aparecem" -ForegroundColor White