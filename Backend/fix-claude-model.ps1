# Corrigir Modelo Claude - Remover variavel de ambiente incorreta

Write-Host "Removendo variavel CLAUDE_MODEL..." -ForegroundColor Cyan

# Remover de User e Machine
[System.Environment]::SetEnvironmentVariable('CLAUDE_MODEL', $null, 'User')
[System.Environment]::SetEnvironmentVariable('CLAUDE_MODEL', $null, 'Machine')

Write-Host "Variavel CLAUDE_MODEL removida com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Verificando configuracao atual..." -ForegroundColor Cyan

# Verificar se foi removida
$userVar = [System.Environment]::GetEnvironmentVariable('CLAUDE_MODEL', 'User')
$machineVar = [System.Environment]::GetEnvironmentVariable('CLAUDE_MODEL', 'Machine')

if ($null -eq $userVar -and $null -eq $machineVar) {
    Write-Host "OK: Variavel removida. Backend usara o modelo padrao do application.properties" -ForegroundColor Green
} else {
    Write-Host "AVISO: Variavel ainda existe. Pode ser necessario reiniciar o PowerShell" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Reinicie o backend Spring Boot" -ForegroundColor White
Write-Host "2. Teste a geracao de memorial novamente" -ForegroundColor White
