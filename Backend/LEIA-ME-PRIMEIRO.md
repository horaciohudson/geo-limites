# ⚠️ LEIA ANTES DE INICIAR O BACKEND

## 🔴 PROBLEMA IMPORTANTE

O **Spring Boot NÃO lê arquivos `.env` automaticamente**!

Mesmo que você tenha as chaves configuradas em `Backend/.env`, o Spring Boot não as carregará sozinho.

---

## ✅ SOLUÇÃO RÁPIDA

### Use o script correto:

#### Windows:
```batch
start-with-env.bat
```

#### Linux/Mac:
```bash
./start-with-env.sh
```

### ❌ NÃO FAÇA ISSO:
```batch
mvnw spring-boot:run  ← Não carrega o .env!
```

### ✅ FAÇA ISSO:
```batch
start-with-env.bat  ← Carrega o .env antes de iniciar!
```

---

## 📋 O que os Scripts Fazem

1. ✅ Leem o arquivo `.env`
2. ✅ Carregam as variáveis de ambiente
3. ✅ Mostram quais chaves foram encontradas
4. ✅ Iniciam o Spring Boot com essas variáveis

---

## 🔍 Verificar Configuração

Execute:
```batch
verificar-config-ia.bat
```

Deve mostrar:
```
✓ OPENAI_API_KEY: Definida
✓ ANTHROPIC_API_KEY: Definida
```

Se mostrar "NÃO DEFINIDA", significa que você precisa usar o `start-with-env.bat`!

---

## 📖 Documentação Completa

Veja: **`SOLUCAO_DOTENV_SPRING.md`**

---

## ⚙️ Configuração Importante

No arquivo `.env`, certifique-se de que:

```env
OPENAI_MAX_TOKENS=16000    ← Maximo 16384 para o modelo configurado
CLAUDE_MAX_TOKENS=16000    ← Maximo para o modelo assistido configurado
```

**NAO use valores maiores que 16384 para o modelo OpenAI configurado**, senao recebera erro 400!

---

## 🎯 Resumo

| ❌ Errado | ✅ Correto |
|-----------|-----------|
| `mvnw spring-boot:run` | `start-with-env.bat` |
| `./mvnw spring-boot:run` | `./start-with-env.sh` |
| Variáveis no .env (não funciona sozinho) | Script que carrega .env primeiro |

---

**Última atualização**: 21/11/2024

