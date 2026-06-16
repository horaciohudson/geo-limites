# Script para corrigir quebras de linha no arquivo .env
$envPath = ".env"
$content = Get-Content $envPath -Raw

# Corrigir ANTHROPIC_API_KEY (remover quebra de linha)
$content = $content -replace "ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui`r?`ncontinua-aqui", "ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui"

# Corrigir OPENAI_API_KEY (remover quebras de linha)
$content = $content -replace "OPENAI_API_KEY=sk-proj-sua-chave-aqui`r?`ncontinua-aqui", "OPENAI_API_KEY=sk-proj-sua-chave-aqui"

# Salvar arquivo corrigido
$content | Set-Content $envPath -NoNewline

Write-Host "✅ Arquivo .env corrigido!" -ForegroundColor Green
Write-Host ""
Write-Host "Verificando resultado:" -ForegroundColor Yellow
Get-Content $envPath | Select-String "API_KEY"
