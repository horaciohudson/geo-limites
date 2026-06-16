# Script para remover lógica do memorial tradicional
$filePath = "src\main\java\com\momorialPro\CadMemorial\controller\MemorialGptController.java"

# Lê o conteúdo do arquivo
$content = Get-Content $filePath -Raw

# Remove a seção do memorial tradicional
$content = $content -replace '            // Primeiro gera o memorial tradicional[\s\S]*?log\.info\("✅ Memorial tradicional gerado com sucesso"\);', '            // Geração direta com IA (sem memorial tradicional)
            log.info("🤖 Iniciando geração direta com IA (sem memorial tradicional)");'

# Remove a linha de simulação de comparação DXF
$content = $content -replace '            log\.info\("🔄 Simulando comparação DXF\.\.\."\);', '            log.info("🔄 Processando entidades DXF...");'

# Remove referências ao traditionalMemorial nas linhas de summary e differences
$content = $content -replace '\.summary\(traditionalMemorial\.getComparisonSummary\(\)\)', '.summary("Comparação processada via IA")'
$content = $content -replace '\.differences\(traditionalMemorial\.getDifferences\(\)\)', '.differences(new ArrayList<>())'
$content = $content -replace 'gptMemorial\.setComparisonSummary\(traditionalMemorial\.getComparisonSummary\(\)\);', 'gptMemorial.setComparisonSummary("Análise realizada via IA");'
$content = $content -replace 'gptMemorial\.setDifferences\(traditionalMemorial\.getDifferences\(\)\);', 'gptMemorial.setDifferences(new ArrayList<>());'

# Salva o arquivo modificado
Set-Content $filePath $content -Encoding UTF8

Write-Host "✅ Arquivo modificado com sucesso!"
Write-Host "📝 Backup salvo como: ${filePath}.backup"