# 🔧 Otimização do Prompt - IA Recusando Tarefa

## 🔍 Problema Identificado

```
📝 Tamanho do prompt: 83.963 caracteres (~21k tokens)
prompt_tokens=34.507 total (entrada + saída)
completion_tokens=11 ← "Desculpe, mas não posso realizar essa tarefa."
```

### Causas:

1. **Prompt muito longo** (84k caracteres)
2. **Instruções repetidas** várias vezes
3. **Formatação excessiva** (boxes ASCII, ╔═══╗)
4. **Redundância** nas diretrizes

---

## ✅ Solução: Simplificar o Prompt

### Problemas no Código Atual:

#### 1. Instruções Repetidas:

```java
// Aparece 3x no código:
"OBRIGATÓRIO: Gere TODOS os X lotes"
"PROIBIDO: Usar [REPETIR] ou [CONTINUAR]"
"Memorial incompleto será REJEITADO"
```

#### 2. Formatação Excessiva:

```
╔═══════════════════════════════════════════════════════════╗
║  🚨🚨🚨 INSTRUÇÃO OBRIGATÓRIA - LEIA ATENTAMENTE 🚨🚨🚨  ║
╚═══════════════════════════════════════════════════════════╝
```

↓ **Reduzir para:**

```
🚨 INSTRUÇÃO CRÍTICA:
```

#### 3. System Prompt Muito Longo:

O `buildSystemPrompt()` tem ~75 linhas com instruções detalhadas que poderiam ser resumidas.

---

## 🎯 Ações de Otimização:

### 1. Consolidar Instruções
- Remover repetições
- Manter apenas 1 seção de "Instruções Críticas"
- Simplificar boxes ASCII

### 2. Reduzir System Prompt
- De 75 linhas → 30-40 linhas
- Manter apenas diretrizes essenciais
- Remover exemplos redundantes

### 3. Simplificar Dados
- Coordenadas: Mostrar apenas primeiras 50-100 (com aviso de continuação)
- Ruas: Listar diretamente sem formatação extra
- Áreas: Formato simples

---

## 📊 Objetivo:

| Métrica | Atual | Meta |
|---------|-------|------|
| **Caracteres** | 83.963 | <40.000 |
| **Tokens (entrada)** | ~21.000 | <10.000 |
| **Tokens (total)** | 34.507 | <26.000 |

---

## 🚀 Implementação:

Vou criar uma versão otimizada do `buildSystemPrompt()` e `buildPrompt()` que:

1. ✅ Remove repetições
2. ✅ Simplifica formatação
3. ✅ Mantém clareza
4. ✅ Reduz tamanho em ~50%

---

**Status**: Em análise  
**Próximo passo**: Refatorar métodos de prompt




