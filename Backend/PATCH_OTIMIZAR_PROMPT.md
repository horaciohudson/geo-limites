# 🔧 PATCH - Otimizar Prompt para IA

## 🎯 Objetivo

Reduzir o prompt de **84k caracteres para ~35-40k** removendo repetições e simplificando formatação.

## 📋 Mudanças Necessárias

### 1. Simplificar `buildSystemPrompt()`

**Localização**: `MemorialApiService.java` linha 575-647

**Problema**: System prompt tem ~3.000 caracteres com muita repetição

**Solução**: Reduzir para ~1.500 caracteres, mantendo o essencial

### 2. Simplificar `buildPrompt()` 

**Localização**: `MemorialApiService.java` linhas 650-1400+

**Problemas**:
- Avisos repetidos sobre completude (3x)
- Boxes ASCII ocupam muito espaço
- Instruções críticas duplicadas
- Coordenadas listadas completamente (pode ser resumido)

**Soluções**:
- Consolidar avisos em 1 seção única
- Remover boxes ASCII decorativos
- Limitar coordenadas a primeiras 100 + aviso "... e mais X coordenadas"
- Simplificar formatação

---

## 🔨 Implementação Sugerida

### Antes (System Prompt - 75 linhas):

```java
return """
    Você é um engenheiro cartógrafo especialista...
    
    SUAS ESPECIALIDADES:
    - Análise precisa...
    - Elaboração de memoriais...
    [... 70+ linhas de instruções ...]
    """;
```

### Depois (System Prompt - 35 linhas):

```java
return """
    Você é um engenheiro cartógrafo especializado em memorial descritivo conforme NBR-17047:2024.
    
    DIRETRIZES OBRIGATÓRIAS:
    1. Use APENAS coordenadas reais fornecidas (SIRGAS 2000, 6+ dígitos)
    2. Use APENAS confrontações fornecidas (com matrículas/CNPJs reais)
    3. Use TODAS as ruas identificadas no DXF
    4. Gere TODOS os lotes detectados (não pare no meio)
    5. Calcule áreas reais (nunca use "A calcular")
    
    PROIBIDO:
    - Inventar coordenadas sequenciais
    - Usar placeholders como [REPETIR], [CONTINUAR]
    - Parar antes de gerar todos os lotes
    - Usar nomes fictícios ou CNPJs genéricos
    
    Este é um documento LEGAL para cartórios. Precisão é obrigatória.
    """;
```

### Antes (Avisos Repetidos):

```java
// Aparece em 3 lugares diferentes:
promptBuilder.append("╔═══════════════════╗\n");
promptBuilder.append("║ AVISO CRÍTICO     ║\n");
promptBuilder.append("╚═══════════════════╝\n");
promptBuilder.append("Gere TODOS os X lotes...\n\n");
```

### Depois (1 único aviso):

```java
promptBuilder.append("\n🚨 IMPORTANTE: Foram detectados " + estimatedLots + " lotes.\n");
promptBuilder.append("Gere TODOS os lotes de LOTE 01 até LOTE " + String.format("%02d", estimatedLots) + ".\n");
promptBuilder.append("Não use [REPETIR] ou pare no meio.\n\n");
```

---

## 📊 Impacto Esperado

| Seção | Antes | Depois | Economia |
|-------|-------|--------|----------|
| System Prompt | ~3.000 chars | ~1.500 chars | 50% |
| Avisos/Boxes | ~8.000 chars | ~2.000 chars | 75% |
| Instruções | ~15.000 chars | ~7.000 chars | 53% |
| Coordenadas | Todas | Primeiras 100 | Variável |
| **TOTAL** | **~84.000** | **~35.000** | **~58%** |

---

## ⚠️ Cuidados

1. **Não remover** dados essenciais (coordenadas, ruas, áreas)
2. **Manter** clareza nas instruções
3. **Testar** após aplicação para garantir que IA ainda entende

---

## 🚀 Como Aplicar

### Opção 1: Manual

Editar `MemorialApiService.java`:
1. Simplificar método `buildSystemPrompt()` (linhas 570-648)
2. Consolidar avisos em `buildPrompt()` (remover duplicações)
3. Simplificar formatação (remover boxes ASCII)

### Opção 2: Criar Nova Versão

Criar `MemorialApiServiceOptimized.java` com prompt otimizado e testar antes de substituir.

---

## 📝 Checklist de Testes

Após aplicar:

- [ ] Prompt tem <45k caracteres
- [ ] IA gera memorial completo (não recusa)
- [ ] Memorial contém todos os lotes
- [ ] Coordenadas reais são usadas
- [ ] Ruas corretas são incluídas

---

**Recomendação**: Aplicar gradualmente, testando cada mudança.

**Prioridade**: ALTA (IA está recusando atualmente)




