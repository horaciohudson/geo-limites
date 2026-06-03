# Script para remover lógica do memorial tradicional do backend

$backendFile = "../Backend/src/main/java/com/momorialPro/CadMemorial/controller/MemorialGptController.java"

Write-Host "🔍 Analisando arquivo do backend..." -ForegroundColor Yellow

# Ler o arquivo
$content = Get-Content $backendFile -Raw

Write-Host "📄 Arquivo lido: $($content.Length) caracteres" -ForegroundColor Green

# Procurar pelas linhas problemáticas
$lines = Get-Content $backendFile
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "memorial tradicional|Memorial tradicional|generateTraditional") {
        Write-Host "🎯 Linha $($i+1): $($lines[$i])" -ForegroundColor Cyan
        
        # Mostrar contexto
        $start = [Math]::Max(0, $i - 5)
        $end = [Math]::Min($lines.Count - 1, $i + 5)
        
        Write-Host "📋 Contexto (linhas $($start+1) a $($end+1)):" -ForegroundColor Yellow
        for ($j = $start; $j -le $end; $j++) {
            $marker = if ($j -eq $i) { ">>> " } else { "    " }
            Write-Host "$marker$($j+1): $($lines[$j])" -ForegroundColor $(if ($j -eq $i) { "Red" } else { "Gray" })
        }
        Write-Host ""
    }
}

Write-Host "🔍 Procurando por chamadas do MemorialService..." -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "memorialService\.generate|MemorialService.*generate") {
        Write-Host "🎯 Linha $($i+1): $($lines[$i])" -ForegroundColor Cyan
    }
}

Write-Host "✅ Análise concluída. Verifique as linhas identificadas acima." -ForegroundColor Green