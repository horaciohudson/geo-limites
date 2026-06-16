@echo off
echo ========================================
echo    CONFIGURACAO OPENAI - MEMORIALPRO
echo ========================================
echo.

echo Este script ajuda a configurar a API Key da OpenAI
echo.

echo OPCOES:
echo 1. Configurar variavel de ambiente (recomendado)
echo 2. Editar application.properties diretamente
echo 3. Testar conectividade atual
echo 4. Ver guia completo
echo.

set /p choice="Escolha uma opcao (1-4): "

if "%choice%"=="1" goto :env_config
if "%choice%"=="2" goto :file_config
if "%choice%"=="3" goto :test_connectivity
if "%choice%"=="4" goto :show_guide
goto :invalid_choice

:env_config
echo.
echo === CONFIGURACAO POR VARIAVEL DE AMBIENTE ===
echo.
echo 1. Acesse: https://platform.openai.com/api-keys
echo 2. Crie uma nova API Key (comeca com 'sk-')
echo 3. Copie a chave
echo.
set /p api_key="Cole sua API Key aqui: "

if "%api_key%"=="" (
    echo ERRO: API Key nao pode estar vazia
    pause
    exit /b 1
)

if not "%api_key:~0,3%"=="sk-" (
    echo AVISO: API Key nao comeca com 'sk-' - verifique se esta correta
)

echo.
echo Configurando variavel de ambiente...
setx OPENAI_API_KEY "%api_key%"

echo.
echo ✅ SUCESSO! Variavel de ambiente configurada.
echo.
echo IMPORTANTE: Reinicie o servidor Spring Boot para aplicar as mudancas.
echo.
pause
exit /b 0

:file_config
echo.
echo === CONFIGURACAO POR ARQUIVO ===
echo.
echo Editando application.properties...
echo.
set /p api_key="Digite sua API Key: "

if "%api_key%"=="" (
    echo ERRO: API Key nao pode estar vazia
    pause
    exit /b 1
)

echo Fazendo backup do arquivo original...
copy "src\main\resources\application.properties" "src\main\resources\application.properties.backup"

echo Atualizando arquivo...
powershell -Command "(Get-Content 'src\main\resources\application.properties') -replace 'PLACEHOLDER_KEY', '%api_key%' | Set-Content 'src\main\resources\application.properties'"

echo.
echo ✅ SUCESSO! Arquivo application.properties atualizado.
echo Backup salvo como: application.properties.backup
echo.
echo IMPORTANTE: Reinicie o servidor Spring Boot para aplicar as mudancas.
echo.
pause
exit /b 0

:test_connectivity
echo.
echo === TESTE DE CONECTIVIDADE ===
echo.
echo Testando conectividade atual...
echo.

curl -s -X GET "http://localhost:9010/api/diagnostic/openai/config" -H "Content-Type: application/json" > temp_config.json

if %errorlevel% neq 0 (
    echo ERRO: Nao foi possivel conectar ao servidor local
    echo Verifique se o servidor esta rodando na porta 9010
) else (
    echo Resposta do servidor:
    type temp_config.json
    del temp_config.json
)

echo.
pause
exit /b 0

:show_guide
echo.
echo === GUIA COMPLETO DE CONFIGURACAO ===
echo.
echo 1. OBTER API KEY:
echo    - Acesse: https://platform.openai.com/api-keys
echo    - Faca login ou crie uma conta
echo    - Clique em "Create new secret key"
echo    - Copie a chave (comeca com 'sk-')
echo.
echo 2. CONFIGURAR NO SISTEMA:
echo    Opcao A - Variavel de ambiente (recomendado):
echo      set OPENAI_API_KEY=sua_chave_aqui
echo.
echo    Opcao B - Arquivo de configuracao:
echo      Edite: src\main\resources\application.properties
echo      Linha: memorialpro.llm.api-key=sua_chave_aqui
echo.
echo 3. REINICIAR SERVIDOR:
echo    - Pare o servidor Spring Boot (Ctrl+C)
echo    - Inicie novamente: mvnw spring-boot:run
echo.
echo 4. TESTAR:
echo    - Acesse: http://localhost:9010/api/diagnostic/openai/test
echo    - Ou use este script (opcao 3)
echo.
echo 5. SOLUCAO DE PROBLEMAS:
echo    - Connection reset: Verificar firewall/internet
echo    - 401 Unauthorized: API Key invalida
echo    - 429 Rate Limit: Muitas requisicoes
echo    - Timeout: Aumentar timeout ou usar modelo mais rapido
echo.
pause
exit /b 0

:invalid_choice
echo.
echo ERRO: Opcao invalida. Escolha 1, 2, 3 ou 4.
echo.
pause
exit /b 1