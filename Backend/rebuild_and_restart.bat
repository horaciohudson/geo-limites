@echo off
REM Script para recompilar e reiniciar o backend com as melhorias (Windows)

echo 🔨 Limpando build anterior...
call mvn clean

echo 📦 Compilando backend com melhorias...
call mvn install -DskipTests

echo ✅ Compilação concluída!
echo.
echo ⚠️  PRÓXIMOS PASSOS:
echo 1. Pare o servidor backend atual (Ctrl+C)
echo 2. Inicie o servidor novamente
echo 3. Gere um novo memorial
echo.
echo 🎯 RESULTADO ESPERADO: Memorial com 25 lotes completos

pause

