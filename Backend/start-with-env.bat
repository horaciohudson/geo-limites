@echo off
chcp 65001 >nul
echo ========================================
echo   INICIANDO BACKEND COM .ENV
echo ========================================
echo.

REM Verificar se o arquivo .env existe
if not exist ".env" (
    echo ❌ ERRO: Arquivo .env não encontrado!
    echo.
    echo Crie o arquivo .env com suas chaves de API:
    echo   OPENAI_API_KEY=sk-proj-sua-chave-aqui
    echo   ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
    echo.
    pause
    exit /b 1
)

echo [1/3] Carregando variáveis do arquivo .env...
echo.

REM Ler e exportar variáveis do .env
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    REM Ignorar linhas vazias e comentários
    echo %%a | findstr /r "^#" >nul
    if errorlevel 1 (
        if not "%%a"=="" (
            if not "%%b"=="" (
                echo   ✓ Carregando: %%a
                set "%%a=%%b"
            )
        )
    )
)

echo.
echo [2/3] Variáveis carregadas:
if defined OPENAI_API_KEY (
    echo   ✓ OPENAI_API_KEY: Definida
) else (
    echo   ✗ OPENAI_API_KEY: NÃO DEFINIDA
)

if defined ANTHROPIC_API_KEY (
    echo   ✓ ANTHROPIC_API_KEY: Definida
) else (
    echo   ✗ ANTHROPIC_API_KEY: NÃO DEFINIDA
)

if defined OPENAI_MODEL (
    echo   ℹ OPENAI_MODEL: %OPENAI_MODEL%
)

if defined CLAUDE_MODEL (
    echo   ℹ CLAUDE_MODEL: %CLAUDE_MODEL%
)

if defined OPENAI_MAX_TOKENS (
    echo   ℹ OPENAI_MAX_TOKENS: %OPENAI_MAX_TOKENS%
)

if defined CLAUDE_MAX_TOKENS (
    echo   ℹ CLAUDE_MAX_TOKENS: %CLAUDE_MAX_TOKENS%
)

echo.
echo [3/3] Iniciando Spring Boot...
echo.
echo ========================================
echo.

REM Iniciar o Maven com as variáveis de ambiente
call mvnw.cmd spring-boot:run

echo.
echo ========================================
echo   Backend finalizado
echo ========================================
pause

