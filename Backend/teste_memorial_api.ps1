# TESTE DE INTERCEPTAÇÃO DE MEMORIAL E API
# Testa o processo completo de geração de memorial com 25 lotes

Write-Host "🚀 INICIANDO TESTE DE INTERCEPTAÇÃO DE MEMORIAL" -ForegroundColor Green
Write-Host "=" * 60

$API_BASE = "http://localhost:9010"
$ErrorActionPreference = "Continue"

# Função para log
function Write-TestLog {
    param($Message, $Type = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch($Type) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] $Type: $Message" -ForegroundColor $color
}

# Dados de teste com 25 lotes
$testData = @{
    entities = @()
    fileName = "loteamento_25_lotes_teste.dxf"
    projectName = "Teste Interceptação Memorial - 25 Lotes"
    projectDescription = "Teste automatizado para validar detecção e geração de 25 lotes"
    standardId = $null
}

# Gera 25 lotes de teste
Write-TestLog "📊 Gerando dados de teste com 25 lotes..."
for ($i = 1; $i -le 25; $i++) {
    $lote = @{
        type = "TEXT"
        layer = "LOTE_$($i.ToString().PadLeft(2, '0'))"
        fingerprint = "lote_$i" + "_" + (Get-Date).Ticks
        x = 2888.27 + (($i - 1) % 5) * 22.17
        y = 1468.78 + [Math]::Floor(($i - 1) / 5) * 20.09
        z = $null
        x2 = $null
        y2 = $null
        z2 = $null
        radius = $null
        startAngle = $null
        endAngle = $null
        text = "LOTE $($i.ToString().PadLeft(2, '0'))"
        textStyle = "STANDARD"
        textHeight = 2.5
        textRotation = 0.0
        vertices = @()
    }
    $testData.entities += $lote
}

Write-TestLog "✅ Dados gerados: $($testData.entities.Count) entidades"

# 1. TESTE DE LOGIN
Write-TestLog "🔐 Testando login..." 
try {
    $loginBody = @{
        username = "admin@memorialpro.com"
        password = "123456"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginBody
    $token = $loginResponse.token
    Write-TestLog "✅ Login realizado com sucesso" "SUCCESS"
} catch {
    Write-TestLog "❌ Erro no login: $($_.Exception.Message)" "ERROR"
    exit 1
}

# 2. TESTE DE DIAGNÓSTICO
Write-TestLog "🔍 Testando diagnóstico OpenAI..."
try {
    $diagnostic = Invoke-RestMethod -Uri "$API_BASE/api/diagnostic/openai/config" -Method GET -Headers @{"Authorization"="Bearer $token"}
    if (-not $diagnostic.hasIssues) {
        Write-TestLog "✅ Diagnóstico OpenAI: Configuração OK" "SUCCESS"
        Write-TestLog "   - Sucessos: $($diagnostic.successes.Count)"
    } else {
        Write-TestLog "⚠️ Diagnóstico encontrou problemas:" "WARN"
        $diagnostic.issues | ForEach-Object { Write-TestLog "   - $_" "WARN" }
    }
} catch {
    Write-TestLog "❌ Erro no diagnóstico: $($_.Exception.Message)" "ERROR"
}

# 3. TESTE DE CONECTIVIDADE
Write-TestLog "🌐 Testando conectividade OpenAI..."
try {
    $connectivity = Invoke-RestMethod -Uri "$API_BASE/api/diagnostic/openai/test" -Method GET -Headers @{"Authorization"="Bearer $token"}
    if ($connectivity.status -eq "SUCCESS") {
        Write-TestLog "✅ Conectividade OpenAI: OK" "SUCCESS"
        Write-TestLog "   - Mensagem: $($connectivity.connectivityTest.message)"
    } else {
        Write-TestLog "⚠️ Conectividade falhou: $($connectivity.status)" "WARN"
    }
} catch {
    Write-TestLog "❌ Erro na conectividade: $($_.Exception.Message)" "ERROR"
}

# 4. TESTE DE MEMORIAL TRADICIONAL
Write-TestLog "📝 Testando memorial tradicional..."
try {
    $traditionalBody = $testData | ConvertTo-Json -Depth 10
    $traditionalResponse = Invoke-RestMethod -Uri "$API_BASE/api/memorial/generate-traditional" -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $token"} -Body $traditionalBody
    
    Write-TestLog "✅ Memorial tradicional gerado" "SUCCESS"
    Write-TestLog "   - Tamanho: $($traditionalResponse.memorialText.Length) caracteres"
    
    # Salva memorial tradicional
    $traditionalResponse.memorialText | Out-File -FilePath "memorial_tradicional_teste.txt" -Encoding UTF8
    Write-TestLog "   - Salvo em: memorial_tradicional_teste.txt"
} catch {
    Write-TestLog "❌ Erro no memorial tradicional: $($_.Exception.Message)" "ERROR"
}

# 5. TESTE DE MEMORIAL COM IA (PRINCIPAL)
Write-TestLog "🤖 Testando memorial com IA..."
Write-TestLog "   - Enviando dados de 25 lotes para IA..."

try {
    $startTime = Get-Date
    $iaBody = $testData | ConvertTo-Json -Depth 10
    $iaResponse = Invoke-RestMethod -Uri "$API_BASE/api/memorial/generate-gpt" -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $token"} -Body $iaBody -TimeoutSec 180
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-TestLog "✅ Memorial com IA gerado" "SUCCESS"
    Write-TestLog "   - Tamanho: $($iaResponse.memorialText.Length) caracteres"
    Write-TestLog "   - Tempo: $($duration.ToString('F2')) segundos"
    
    # Salva memorial da IA
    $iaResponse.memorialText | Out-File -FilePath "memorial_ia_teste.txt" -Encoding UTF8
    Write-TestLog "   - Salvo em: memorial_ia_teste.txt"
    
    # 6. VALIDAÇÃO DO MEMORIAL
    Write-TestLog "🔍 Validando memorial para 25 lotes..."
    
    $texto = $iaResponse.memorialText
    
    # Conta lotes no memorial
    $lotesEncontrados = ([regex]::Matches($texto, "LOTE \d+")).Count
    $secaoLotes = ([regex]::Matches($texto, "### LOTE \d+:|LOTE \d+:")).Count
    
    Write-TestLog "   - Lotes mencionados no texto: $lotesEncontrados"
    Write-TestLog "   - Seções de lotes encontradas: $secaoLotes"
    
    # Verifica coordenadas
    $coordenadasReais = ([regex]::Matches($texto, "E \d{4}\.\d{2}m.*N \d{4}\.\d{2}m")).Count
    $coordenadasFicticias = ([regex]::Matches($texto, "123456|7654321")).Count
    
    Write-TestLog "   - Coordenadas reais encontradas: $coordenadasReais"
    Write-TestLog "   - Coordenadas fictícias encontradas: $coordenadasFicticias"
    
    # Validação final
    if ($secaoLotes -ge 20) {
        Write-TestLog "✅ VALIDAÇÃO 25 LOTES: PASSOU ($secaoLotes lotes ≥ 20 esperado)" "SUCCESS"
    } else {
        Write-TestLog "❌ VALIDAÇÃO 25 LOTES: FALHOU (apenas $secaoLotes lotes)" "ERROR"
    }
    
    if ($coordenadasReais -gt 0 -and $coordenadasFicticias -eq 0) {
        Write-TestLog "✅ VALIDAÇÃO COORDENADAS: PASSOU" "SUCCESS"
    } else {
        Write-TestLog "❌ VALIDAÇÃO COORDENADAS: FALHOU" "ERROR"
    }
    
} catch {
    Write-TestLog "❌ Erro no memorial IA: $($_.Exception.Message)" "ERROR"
    if ($_.Exception.Message -like "*timeout*") {
        Write-TestLog "   - Timeout na requisição (>3min)" "ERROR"
    }
}

# RELATÓRIO FINAL
Write-TestLog "📊 TESTE DE INTERCEPTAÇÃO CONCLUÍDO" "SUCCESS"
Write-Host "=" * 60

Write-Host "📁 ARQUIVOS GERADOS:" -ForegroundColor Cyan
Write-Host "   - memorial_tradicional_teste.txt"
Write-Host "   - memorial_ia_teste.txt"

Write-Host "`n🎯 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Verificar memorial_ia_teste.txt"
Write-Host "   2. Contar quantos lotes foram gerados"
Write-Host "   3. Validar coordenadas reais"
Write-Host "   4. Comparar com memorial_tradicional_teste.txt"

Write-TestLog "🎉 TESTE FINALIZADO - Verifique os arquivos gerados" "SUCCESS"