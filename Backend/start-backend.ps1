# Script para iniciar o backend com variáveis de ambiente do .env

Write-Host "🔧 Carregando variáveis de ambiente do .env..." -ForegroundColor Cyan

# Verifica se o arquivo .env existe
if (-Not (Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "💡 Certifique-se de que o arquivo .env existe no diretório Backend" -ForegroundColor Yellow
    exit 1
}

# Carrega todas as variáveis do .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        # Remove aspas se existirem
        $value = $value -replace '^["'']|["'']$', ''
        
        # Define a variável de ambiente
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
        Write-Host "✅ $key carregado" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🚀 Iniciando backend Spring Boot..." -ForegroundColor Cyan
Write-Host ""

# Inicia o backend
mvn spring-boot:run
