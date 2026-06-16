@echo off
chcp 65001 >nul
echo ========================================
echo   VERIFICANDO CONFIGURAÇÃO DE IA
echo ========================================
echo.
echo [OpenAI]
if defined OPENAI_API_KEY (
    echo   ✓ OPENAI_API_KEY: Definida [%OPENAI_API_KEY:~0,10%...]
) else (
    echo   ✗ OPENAI_API_KEY: NÃO DEFINIDA
)

if defined OPENAI_MODEL (
    echo   ✓ OPENAI_MODEL: %OPENAI_MODEL%
) else (
    echo   ℹ OPENAI_MODEL: Usando padrão (gpt-4o)
)

if defined OPENAI_MAX_TOKENS (
    echo   ✓ OPENAI_MAX_TOKENS: %OPENAI_MAX_TOKENS%
) else (
    echo   ℹ OPENAI_MAX_TOKENS: Usando padrão (25000)
)

echo.
echo [Claude/Anthropic]
if defined ANTHROPIC_API_KEY (
    echo   ✓ ANTHROPIC_API_KEY: Definida [%ANTHROPIC_API_KEY:~0,10%...]
) else (
    echo   ✗ ANTHROPIC_API_KEY: NÃO DEFINIDA
)

if defined CLAUDE_MODEL (
    echo   ✓ CLAUDE_MODEL: %CLAUDE_MODEL%
    if "%CLAUDE_MODEL%"=="claude-3-5-sonnet-20241022" (
        echo   ⚠ ATENÇÃO: Modelo INVÁLIDO detectado!
        echo   ℹ Use: claude-3-5-sonnet-20240620
    ) else if "%CLAUDE_MODEL%"=="claude-3-5-sonnet-20240620" (
        echo   ✓ Modelo VÁLIDO
    )
) else (
    echo   ℹ CLAUDE_MODEL: Usando padrão (claude-3-5-sonnet-20240620)
)

if defined CLAUDE_MAX_TOKENS (
    echo   ✓ CLAUDE_MAX_TOKENS: %CLAUDE_MAX_TOKENS%
) else (
    echo   ℹ CLAUDE_MAX_TOKENS: Usando padrão (25000)
)

echo.
echo ========================================
echo   RECOMENDAÇÕES
echo ========================================
echo.
if not defined OPENAI_API_KEY if not defined ANTHROPIC_API_KEY (
    echo ⚠ NENHUMA API KEY CONFIGURADA!
    echo.
    echo Para configurar OpenAI:
    echo   setx OPENAI_API_KEY "sua-chave-aqui"
    echo.
    echo Para configurar Claude:
    echo   setx ANTHROPIC_API_KEY "sua-chave-aqui"
)

if defined CLAUDE_MODEL (
    if "%CLAUDE_MODEL%"=="claude-3-5-sonnet-20241022" (
        echo.
        echo ⚠ MODELO CLAUDE INVÁLIDO DETECTADO!
        echo.
        echo Execute este comando para corrigir:
        echo   setx CLAUDE_MODEL "claude-3-5-sonnet-20240620"
        echo.
        echo Ou execute o script: fix-claude-model.bat
    )
)

echo.
echo ========================================
echo   COMO CORRIGIR
echo ========================================
echo.
echo ⚠ Spring Boot NAO LE .env AUTOMATICAMENTE!
echo.
echo Para usar as chaves do arquivo .env:
echo   1. Use o script: start-with-env.bat
echo   2. OU defina as variaveis permanentemente com setx
echo.
echo Exemplo com setx:
echo   setx OPENAI_API_KEY "sua-chave-aqui"
echo   setx OPENAI_MAX_TOKENS "16000"
echo.
pause

