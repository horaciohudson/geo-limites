#!/bin/bash

echo "========================================"
echo "  INICIANDO BACKEND COM .ENV"
echo "========================================"
echo ""

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "❌ ERRO: Arquivo .env não encontrado!"
    echo ""
    echo "Crie o arquivo .env com suas chaves de API:"
    echo "  OPENAI_API_KEY=sk-proj-sua-chave-aqui"
    echo "  ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui"
    echo ""
    exit 1
fi

echo "[1/3] Carregando variáveis do arquivo .env..."
echo ""

# Carregar variáveis do .env
set -a
source .env
set +a

echo "[2/3] Variáveis carregadas:"

if [ -n "$OPENAI_API_KEY" ]; then
    echo "  ✓ OPENAI_API_KEY: Definida"
else
    echo "  ✗ OPENAI_API_KEY: NÃO DEFINIDA"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "  ✓ ANTHROPIC_API_KEY: Definida"
else
    echo "  ✗ ANTHROPIC_API_KEY: NÃO DEFINIDA"
fi

if [ -n "$OPENAI_MODEL" ]; then
    echo "  ℹ OPENAI_MODEL: $OPENAI_MODEL"
fi

if [ -n "$CLAUDE_MODEL" ]; then
    echo "  ℹ CLAUDE_MODEL: $CLAUDE_MODEL"
fi

if [ -n "$OPENAI_MAX_TOKENS" ]; then
    echo "  ℹ OPENAI_MAX_TOKENS: $OPENAI_MAX_TOKENS"
fi

if [ -n "$CLAUDE_MAX_TOKENS" ]; then
    echo "  ℹ CLAUDE_MAX_TOKENS: $CLAUDE_MAX_TOKENS"
fi

echo ""
echo "[3/3] Iniciando Spring Boot..."
echo ""
echo "========================================"
echo ""

# Iniciar o Maven com as variáveis de ambiente
./mvnw spring-boot:run

echo ""
echo "========================================"
echo "  Backend finalizado"
echo "========================================"

