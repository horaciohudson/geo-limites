@echo off
chcp 65001 >nul
echo ========================================
echo   TESTE DA API CLAUDE (ANTHROPIC)
echo ========================================
echo.

REM Carregar variáveis do .env
if not exist ".env" (
    echo ❌ ERRO: Arquivo .env não encontrado!
    pause
    exit /b 1
)

echo [1/4] Carregando variáveis do .env...
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    echo %%a | findstr /r "^#" >nul
    if errorlevel 1 (
        if not "%%a"=="" (
            if not "%%b"=="" (
                set "%%a=%%b"
            )
        )
    )
)

echo.
echo [2/4] Verificando configuração...
if not defined ANTHROPIC_API_KEY (
    echo ❌ ANTHROPIC_API_KEY não está definida!
    pause
    exit /b 1
)

echo ✓ ANTHROPIC_API_KEY: Definida
echo   Primeiros 20 caracteres: %ANTHROPIC_API_KEY:~0,20%...
echo   Tamanho: 
powershell -Command "$env:ANTHROPIC_API_KEY.Length"

echo.
echo [3/4] Testando conexão com API Claude...
echo.

REM Criar arquivo JSON temporário para o teste
echo {"model":"claude-3-5-sonnet-20240620","max_tokens":100,"messages":[{"role":"user","content":"Responda apenas: OK"}]} > test-request.json

REM Fazer requisição de teste
curl -X POST https://api.anthropic.com/v1/messages ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: %ANTHROPIC_API_KEY%" ^
  -H "anthropic-version: 2023-06-01" ^
  -d @test-request.json

echo.
echo.
echo [4/4] Limpando arquivos temporários...
del test-request.json

echo.
echo ========================================
echo   Teste concluído
echo ========================================
echo.
echo Se você viu uma resposta JSON com "content", a API está funcionando!
echo Se viu erro 401: API key inválida
echo Se viu erro 404: Modelo não existe
echo.
pause
