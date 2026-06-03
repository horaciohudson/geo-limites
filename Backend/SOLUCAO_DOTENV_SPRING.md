# 🔧 Solução: Spring Boot + Arquivo .env

## 🔍 Problema Identificado

O **Spring Boot NÃO lê arquivos `.env` automaticamente** como Node.js faz.

Por isso, mesmo tendo as chaves configuradas no `.env`, o sistema não as estava usando e ativava o fallback.

---

## ✅ Solução Implementada

Criados **scripts que carregam o `.env` antes de iniciar o backend**:

### 📁 Arquivos Criados:

1. **`start-with-env.bat`** (Windows)
2. **`start-with-env.sh`** (Linux/Mac)
3. **`.env.example`** (Template de configuração)

---

## 🚀 Como Usar

### Passo 1: Verificar o arquivo .env

Certifique-se de que o arquivo `.env` existe em `Backend/` e contém suas chaves:

```env
# Backend/.env
OPENAI_API_KEY=sk-proj-sua-chave-real-aqui
ANTHROPIC_API_KEY=sk-ant-sua-chave-real-aqui

# Opcional (se não definir, usa os padrões)
OPENAI_MODEL=gpt-4o
CLAUDE_MODEL=claude-3-5-sonnet-20240620
OPENAI_MAX_TOKENS=16000
CLAUDE_MAX_TOKENS=16000
```

### Passo 2: Usar o Script Correto

#### Windows:
```batch
cd Backend
start-with-env.bat
```

#### Linux/Mac:
```bash
cd Backend
chmod +x start-with-env.sh
./start-with-env.sh
```

O script irá:
1. ✅ Carregar todas as variáveis do `.env`
2. ✅ Mostrar quais variáveis foram carregadas
3. ✅ Iniciar o Spring Boot com essas variáveis

---

## 📊 Verificando se Funcionou

Ao iniciar, você verá:

```
========================================
  INICIANDO BACKEND COM .ENV
========================================

[1/3] Carregando variáveis do arquivo .env...
  ✓ Carregando: OPENAI_API_KEY
  ✓ Carregando: ANTHROPIC_API_KEY
  ✓ Carregando: OPENAI_MODEL
  ✓ Carregando: OPENAI_MAX_TOKENS

[2/3] Variáveis carregadas:
  ✓ OPENAI_API_KEY: Definida
  ✓ ANTHROPIC_API_KEY: Definida
  ℹ OPENAI_MODEL: gpt-4o
  ℹ OPENAI_MAX_TOKENS: 16000

[3/3] Iniciando Spring Boot...
```

Nos **logs do backend**, agora deve aparecer:

```
🤖 Usando OpenAI: gpt-4o via https://api.openai.com/v1/chat/completions
🚀 Tentativa 1/3 - Enviando requisição para IA
✅ Resposta recebida
📄 Memorial gerado com XXXX caracteres
🎉 Memorial gerado com sucesso!
```

**NÃO deve mais aparecer**:
```
❌ 404 Not Found
🔄 Usando fallback
```

---

## ⚙️ Configurações Importantes

### Max Tokens

**ATENÇÃO**: O GPT-4o suporta **no máximo 16384 tokens**.

Se configurar mais que isso, receberá erro:
```
400 Bad Request: max_tokens is too large: 25000
```

**Recomendações**:
```env
# Para memoriais pequenos (1-5 lotes)
OPENAI_MAX_TOKENS=8000

# Para memoriais médios (6-15 lotes)
OPENAI_MAX_TOKENS=12000

# Para memoriais grandes (16-25+ lotes)
OPENAI_MAX_TOKENS=16000
```

### Modelos Válidos

**OpenAI**:
- ✅ `gpt-4o` (Recomendado - Mais rápido)
- ✅ `gpt-4-turbo`
- ✅ `gpt-4`
- ✅ `gpt-3.5-turbo`

**Claude**:
- ✅ `claude-3-5-sonnet-20240620` (Recomendado)
- ✅ `claude-3-opus-20240229`
- ✅ `claude-3-sonnet-20240229`
- ❌ `claude-3-5-sonnet-20241022` (NÃO EXISTE!)

---

## 🔄 Alternativa: Variáveis de Sistema

Se preferir não usar o script, pode definir as variáveis permanentemente no Windows:

```powershell
# PowerShell como Administrador
setx OPENAI_API_KEY "sk-proj-sua-chave-aqui"
setx OPENAI_MODEL "gpt-4o"
setx OPENAI_MAX_TOKENS "16000"

# Depois, reinicie o terminal e inicie normalmente
mvnw spring-boot:run
```

---

## 🐛 Problemas Comuns

### 1. Erro 429 (Rate Limit)

```
429 Too Many Requests: Rate limit reached
```

**Solução**: Aguarde alguns segundos. O sistema já retenta automaticamente 3 vezes.

### 2. Erro 400 (max_tokens too large)

```
400 Bad Request: max_tokens is too large: 25000
```

**Solução**: Reduza o valor no `.env`:
```env
OPENAI_MAX_TOKENS=16000  # Máximo para gpt-4o
```

### 3. Ainda usa fallback

Verifique se está usando o script correto:
- ❌ `mvnw spring-boot:run` (não carrega .env)
- ✅ `start-with-env.bat` (carrega .env)

### 4. Arquivo .env não encontrado

Verifique se o arquivo está em `Backend/.env` (não na raiz do projeto).

Se não existir, copie do template:
```bash
cp .env.example .env
# Depois edite o .env com suas chaves reais
```

---

## 📝 Estrutura Correta

```
memorial-pro/
├── Backend/
│   ├── .env              ← Suas chaves aqui (não commitar!)
│   ├── .env.example      ← Template
│   ├── start-with-env.bat  ← Use este (Windows)
│   ├── start-with-env.sh   ← Use este (Linux/Mac)
│   ├── verificar-config-ia.bat
│   └── ...
```

---

## ✅ Checklist Final

Antes de iniciar o backend:

- [ ] Arquivo `.env` existe em `Backend/`
- [ ] `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY` configurada
- [ ] `OPENAI_MAX_TOKENS` ≤ 16000 (para gpt-4o)
- [ ] `CLAUDE_MODEL` é válido (se usar Claude)
- [ ] Usando `start-with-env.bat` (Windows) ou `start-with-env.sh` (Linux/Mac)

---

## 📞 Ainda com Problemas?

1. Execute: `verificar-config-ia.bat`
2. Verifique os logs: `Backend/logs/memorialpro.log`
3. Procure por linhas com `❌` ou `ERROR`

---

**Data**: 21/11/2024  
**Status**: ✅ Solução Implementada

