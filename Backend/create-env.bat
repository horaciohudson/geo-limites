@echo off
chcp 65001 >nul
echo Criando arquivo .env corrigido...

(
echo # Arquivo de configuração de variáveis de ambiente
echo # SUBSTITUA "sua-chave-aqui" pela sua chave real da OpenAI
echo.
echo OPENAI_API_KEY=sk-proj-sua-chave-aqui
echo.
echo ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
) > .env

echo ✅ Arquivo .env criado!
echo.
echo Verificando:
type .env | findstr "ANTHROPIC_API_KEY"
echo.
pause
