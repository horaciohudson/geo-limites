# 🔧 Solucao: Memorial Nao Usando a Geracao Assistida

## 🔍 Problema Identificado

O sistema está tentando usar o modelo Claude com um nome **inválido**:
- **Modelo configurado**: `claude-3-5-sonnet-20241022` ❌
- **Erro retornado**: `404 Not Found: model not found`

### O que estava acontecendo:

1. ✅ Sistema inicia geracao assistida do memorial
2. ❌ Tenta usar um modelo configurado invalido (3 tentativas)
3. ⚠️ Todas as tentativas falham com erro 404
4. 🔄 Sistema ativa **fallback** (gera memorial sem assistencia)
5. 📝 Memorial basico e gerado

**Resultado**: Voce recebe um memorial, mas ele foi gerado sem assistencia (fallback), por isso nao tem a qualidade esperada.

---

## ✅ Solução

### Opção 1: Script Automático (Recomendado)

Execute um dos scripts criados:

```powershell
# Para verificar a configuração atual
.\verificar-config-ia.bat

# Para corrigir automaticamente
.\fix-claude-model.bat
```

### Opção 2: Correção Manual

No PowerShell (como Administrador):

```powershell
# Corrigir o modelo Claude
setx CLAUDE_MODEL "claude-3-5-sonnet-20240620"
```

### Opção 3: Trocar de Provedor

Se preferir usar outro provedor suportado, certifique-se de ter:

```powershell
# Definir chave do provedor
setx OPENAI_API_KEY "sk-proj-sua-chave-aqui"

# (Opcional) Definir modelo
setx OPENAI_MODEL "gpt-4o"

# (Opcional) Limpar a configuracao do outro provedor para forcar esta opcao
setx CLAUDE_MODEL ""
```

---

## 📋 Modelos Válidos

### Claude (Anthropic) - Modelos Corretos:
- ✅ `claude-3-5-sonnet-20240620` (Recomendado)
- ✅ `claude-3-opus-20240229`
- ✅ `claude-3-sonnet-20240229`
- ❌ `claude-3-5-sonnet-20241022` (NÃO EXISTE)

### OpenAI - Modelos Válidos:
- ✅ `gpt-4o` (Recomendado)
- ✅ `gpt-4-turbo`
- ✅ `gpt-4`
- ✅ `gpt-3.5-turbo`

---

## 🚀 Após Corrigir

1. **Reinicie o terminal** (importante para carregar novas variáveis)
2. **Reinicie o backend**:
   ```bash
   # No diretório Backend
   mvnw clean spring-boot:run
   ```

3. **Teste novamente** a geração do memorial

---

## 🔍 Verificando se Funcionou

Após a correção, nos logs você deve ver:

```
🤖 Usando Claude: claude-3-5-sonnet-20240620 via https://api.anthropic.com/v1/messages
🚀 Tentativa 1/3 - Enviando requisicao para o provedor
✅ Resposta recebida: {...}
📄 Memorial gerado com XXXX caracteres
🎉 Memorial gerado com sucesso na tentativa 1
```

**NÃO deve aparecer**:
```
❌ 💥 Exceção na tentativa X: 404 Not Found
🔄 Todas as tentativas falharam, usando fallback
```

---

## ❓ Perguntas Frequentes

### Por que o modelo 20241022 não existe?

A Anthropic ainda não lançou esse modelo. O mais recente disponível é o `claude-3-5-sonnet-20240620` (junho/2024).

### Como sei qual provedor esta sendo usado?

O backend detecta automaticamente baseado nas variaveis de ambiente:
- Se `ANTHROPIC_API_KEY` estiver definida → usa Claude
- Caso contrario → usa OpenAI

Você também pode verificar nos logs a linha: `🤖 Provedor detectado/SELECIONADO: claude/openai`

### E se eu quiser usar OpenAI?

Basta não definir `ANTHROPIC_API_KEY` ou remover a variável:
```powershell
setx ANTHROPIC_API_KEY ""
```

### Quanto custa cada geracao?

**Claude (Anthropic)**:
- Claude 3.5 Sonnet: ~$3 por 1M tokens (entrada) / $15 por 1M tokens (saída)
- Memorial médio (15 lotes): ~$0.10-0.30 por geração

**OpenAI**:
- GPT-4o: ~$5 por 1M tokens (entrada) / $15 por 1M tokens (saída)
- Memorial médio (15 lotes): ~$0.15-0.40 por geração

---

## 🐛 Troubleshooting Adicional

### Erro: "API Key não configurada"

Verifique se a chave está definida:
```powershell
echo $env:ANTHROPIC_API_KEY
echo $env:OPENAI_API_KEY
```

### Erro: "Timeout"

Aumente o timeout no `application.properties`:
```properties
memorialpro.llm.timeout=300000
memorialpro.claude.timeout=300000
```

### Memorial ainda está incompleto

Aumente o max_tokens:
```powershell
# Para Claude
setx CLAUDE_MAX_TOKENS "30000"

# Para OpenAI
setx OPENAI_MAX_TOKENS "30000"
```

---

## 📞 Suporte

Se o problema persistir:

1. Execute `verificar-config-ia.bat` e envie o resultado
2. Verifique os logs em `Backend/logs/memorialpro.log`
3. Procure por linhas com `❌` ou `ERRO`

---

**Última atualização**: 21/11/2024

