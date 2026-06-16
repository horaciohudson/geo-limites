@echo off
echo ========================================
echo   CORRIGINDO MODELO CLAUDE
echo ========================================
echo.
echo Este script vai:
echo   1. Remover a variavel CLAUDE_MODEL incorreta
echo   2. Definir o modelo correto (claude-3-5-sonnet-20240620)
echo.
pause

echo.
echo [1/3] Removendo variavel antiga...
setx CLAUDE_MODEL "" >nul 2>&1

echo [2/3] Definindo modelo correto...
setx CLAUDE_MODEL "claude-3-5-sonnet-20240620"

echo [3/3] Verificando configuracao...
echo.
echo CLAUDE_MODEL atual: %CLAUDE_MODEL%
echo.
echo ========================================
echo   CONFIGURACAO CONCLUIDA!
echo ========================================
echo.
echo IMPORTANTE: Reinicie o terminal e o backend para aplicar as mudancas
echo.
pause

