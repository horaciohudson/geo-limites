# Script para remover logica do memorial tradicional
$filePath = "src\main\java\com\momorialPro\CadMemorial\controller\MemorialGptController.java"

# Ler o arquivo
$content = Get-Content $filePath -Raw

# Substituir a secao do memorial tradicional
$oldPattern = "            // Primeiro gera o memorial tradicional`r`n            log.info\(`"Gerando memorial tradicional primeiro...`"\);`r`n            MemorialExportDTO traditionalMemorial = memorialService.generate\(request\);`r`n            log.info\(`"Memorial tradicional gerado com sucesso`"\);"

$newContent = "            // Geracao direta com IA (sem memorial tradicional)`r`n            log.info(`"Iniciando geracao direta com IA (sem memorial tradicional)`");"

# Aplicar substituicao
$content = $content -replace $oldPattern, $newContent

# Tambem remover referencias ao traditionalMemorial
$content = $content -replace "traditionalMemorial\.getComparisonSummary\(\)", '""'
$content = $content -replace "traditionalMemorial\.getDifferences\(\)", 'new ArrayList<>()'

# Salvar o arquivo
Set-Content $filePath -Value $content -Encoding UTF8

Write-Host "Correcao aplicada com sucesso!"
Write-Host "Arquivo modificado: $filePath"