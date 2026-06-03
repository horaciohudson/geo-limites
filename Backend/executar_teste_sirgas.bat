@echo off
echo ========================================
echo 🚀 TESTE COORDENADAS SIRGAS 2000
echo ========================================
echo.

echo 📋 Executando testes de extração SIRGAS...
echo.

REM Executar teste específico da extração SIRGAS
./mvnw test -Dtest=DxfGeoReferenciaExtractorServiceTest

echo.
echo ========================================
echo 🔧 TESTE COM ARQUIVO DXF REAL
echo ========================================
echo.

REM Executar teste com arquivo DXF real
./mvnw test -Dtest=DxfRealFileTest

echo.
echo ========================================
echo 🔧 TESTE INTEGRAÇÃO MEMORIAL
echo ========================================
echo.

REM Executar teste de integração completo
./mvnw test -Dtest=MemorialSIRGASIntegrationTest

echo.
echo ========================================
echo 📊 RESULTADO DOS TESTES
echo ========================================
echo.

echo ✅ Se os testes passaram: Sistema SIRGAS funcionando!
echo ❌ Se os testes falharam: Precisa ajustar extração
echo.

echo 🎯 Próximo passo: Gerar memorial real e verificar coordenadas
echo.

pause