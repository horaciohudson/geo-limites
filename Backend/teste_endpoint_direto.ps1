# TESTE DIRETO DO ENDPOINT PARA VERIFICAR RESPOSTA
Write-Host "TESTANDO ENDPOINT DIRETO PARA DIAGNOSTICAR PROBLEMA FRONTEND" -ForegroundColor Green

$API_BASE = "http://localhost:9010"

# 1. Login
Write-Host "1. Fazendo login..."
try {
    $loginBody = @{
        username = "admin@memorialpro.com"
        password = "123456"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginBody
    $token = $loginResponse.token
    Write-Host "   Login OK - Token obtido" -ForegroundColor Green
} catch {
    Write-Host "   ERRO no login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Dados de teste simples (menos entidades para teste rápido)
Write-Host "2. Preparando dados de teste..."
$testData = @{
    entities = @(
        @{
            type = "TEXT"
            layer = "LOTE_01"
            fingerprint = "test1"
            x = 2888.27
            y = 1468.78
            z = $null
            x2 = $null
            y2 = $null
            z2 = $null
            radius = $null
            startAngle = $null
            endAngle = $null
            text = "LOTE 01"
            textStyle = "STANDARD"
            textHeight = 2.5
            textRotation = 0.0
            vertices = @()
        },
        @{
            type = "TEXT"
            layer = "LOTE_02"
            fingerprint = "test2"
            x = 2900.50
            y = 1468.78
            z = $null
            x2 = $null
            y2 = $null
            z2 = $null
            radius = $null
            startAngle = $null
            endAngle = $null
            text = "LOTE 02"
            textStyle = "STANDARD"
            textHeight = 2.5
            textRotation = 0.0
            vertices = @()
        }
    )
    fileName = "teste_simples.dxf"
    projectName = "Teste Diagnóstico Frontend"
    projectDescription = "Teste para diagnosticar problema no frontend"
    standardId = $null
}

Write-Host "   Dados preparados: $($testData.entities.Count) entidades" -ForegroundColor Green

# 3. Teste do endpoint
Write-Host "3. Testando endpoint de memorial..."
try {
    $body = $testData | ConvertTo-Json -Depth 10
    Write-Host "   Enviando requisição..." -ForegroundColor Yellow
    
    $startTime = Get-Date
    $response = Invoke-RestMethod -Uri "$API_BASE/api/memorial/generate-gpt" -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $token"} -Body $body -TimeoutSec 180
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "   SUCESSO! Memorial gerado em $($duration.ToString('F2')) segundos" -ForegroundColor Green
    Write-Host "   Tamanho da resposta: $($response.memorialText.Length) caracteres" -ForegroundColor Green
    
    # Verifica estrutura da resposta
    Write-Host "4. Analisando estrutura da resposta..."
    Write-Host "   - memorialText: $($response.memorialText -ne $null)" -ForegroundColor Cyan
    Write-Host "   - projectName: $($response.projectName -ne $null)" -ForegroundColor Cyan
    Write-Host "   - projectDescription: $($response.projectDescription -ne $null)" -ForegroundColor Cyan
    
    # Salva resposta completa para análise
    $response | ConvertTo-Json -Depth 10 | Out-File -FilePath "resposta_completa_endpoint.json" -Encoding UTF8
    $response.memorialText | Out-File -FilePath "memorial_endpoint_direto.txt" -Encoding UTF8
    
    Write-Host "5. Arquivos salvos:"
    Write-Host "   - resposta_completa_endpoint.json (estrutura completa)"
    Write-Host "   - memorial_endpoint_direto.txt (apenas o texto do memorial)"
    
    # Verifica se há caracteres especiais problemáticos
    $problematicChars = $response.memorialText | Select-String -Pattern "[^\x00-\x7F]" -AllMatches
    if ($problematicChars.Matches.Count -gt 0) {
        Write-Host "   AVISO: Encontrados $($problematicChars.Matches.Count) caracteres não-ASCII" -ForegroundColor Yellow
    } else {
        Write-Host "   OK: Nenhum caracter problemático encontrado" -ForegroundColor Green
    }
    
    Write-Host "`nCONCLUSÃO: Endpoint está funcionando corretamente!" -ForegroundColor Green
    Write-Host "O problema está no FRONTEND, não no backend." -ForegroundColor Yellow
    
} catch {
    Write-Host "   ERRO no endpoint: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Detalhes: $($_.Exception)" -ForegroundColor Red
    
    if ($_.Exception.Message -like "*timeout*") {
        Write-Host "   CAUSA: Timeout - Frontend pode ter timeout menor que backend" -ForegroundColor Yellow
    } elseif ($_.Exception.Message -like "*500*") {
        Write-Host "   CAUSA: Erro interno do servidor" -ForegroundColor Yellow
    } elseif ($_.Exception.Message -like "*400*") {
        Write-Host "   CAUSA: Dados inválidos enviados" -ForegroundColor Yellow
    }
}

Write-Host "`nRECOMENDAÇÕES PARA CORRIGIR FRONTEND:" -ForegroundColor Cyan
Write-Host "1. Aumentar timeout do frontend para 3+ minutos"
Write-Host "2. Verificar tratamento de caracteres especiais"
Write-Host "3. Adicionar indicador de progresso durante geração"
Write-Host "4. Verificar se está processando resposta JSON corretamente"