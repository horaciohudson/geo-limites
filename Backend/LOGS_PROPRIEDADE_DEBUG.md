# 🔍 Logs Detalhados da Propriedade - Guia de Debug

## 📋 Objetivo
Este documento explica como usar os logs detalhados implementados para rastrear os dados da propriedade no processo de geração do memorial.

## 🚀 Como Executar o Teste

1. **Execute o script de teste:**
   ```powershell
   .\teste_logs_propriedade.ps1
   ```

2. **Monitore os logs do backend** (console ou arquivo de log)

## 🔍 Logs a Procurar

### 1. Busca da Propriedade
Procure por esta seção nos logs:
```
=== INICIANDO BUSCA DETALHADA DA PROPRIEDADE ===
🏠 PropertyId recebido: [UUID]
👤 UserId: [UUID]
🔍 Chamando propertyService.findByIdWithRelationships()...
```

### 2. Dados Recuperados
Se a propriedade for encontrada, você verá:
```
✅ PROPRIEDADE ENCONTRADA NO STORAGE!
=== DADOS COMPLETOS DA PROPRIEDADE RECUPERADOS ===
📋 ID: [UUID]
📋 Nome: [Nome da propriedade]
👤 Proprietário: [Nome do proprietário]
👤 Documento: [CPF/CNPJ]
📍 Rua: [Endereço]
📍 Cidade: [Cidade]
📐 Área total: [Área] m²
🧭 Confrontação Norte: [Confrontação]
...
```

### 3. Verificação de Campos Críticos
```
=== VERIFICAÇÃO DE CAMPOS CRÍTICOS ===
✅ Nome do proprietário: DISPONÍVEL
✅ Endereço: DISPONÍVEL
✅ Cidade: DISPONÍVEL
✅ Área: DISPONÍVEL
✅ Confrontações: DISPONÍVEL
📊 RESUMO: 5/5 campos críticos disponíveis (100%)
🎉 DADOS SUFICIENTES para gerar memorial com informações reais!
```

### 4. Construção do Prompt
```
=== CONSTRUINDO PROMPT COM DADOS REAIS DA PROPRIEDADE ===
📝 Adicionado ao prompt - Nome: [Nome]
📝 Adicionado ao prompt - Proprietário: [Proprietário]
📝 Adicionado ao prompt - Endereço: [Endereço]
...
📊 RESUMO FINAL DO PROMPT: 17/17 campos disponíveis (100%)
🎉 EXCELENTE: Dados suficientes para memorial completo!
```

## ❌ Problemas Comuns e Soluções

### Propriedade Não Encontrada
```
❌ PROPRIEDADE RETORNADA COMO NULL!
🔍 Possíveis causas:
   - PropertyId [UUID] não existe no banco
   - Propriedade não pertence ao usuário [UUID]
   - Erro na consulta do banco de dados
```

**Soluções:**
1. Verificar se o PropertyId existe no banco
2. Verificar se o usuário tem permissão
3. Verificar conectividade com o banco

### Exceção na Busca
```
❌ EXCEÇÃO AO BUSCAR PROPRIEDADE!
🔍 PropertyId: [UUID]
🔍 UserId: [UUID]
🔍 Tipo da exceção: [Tipo]
🔍 Mensagem: [Mensagem de erro]
```

**Soluções:**
1. Verificar stack trace completo
2. Verificar configuração do banco
3. Verificar se o PropertyService está funcionando

### Dados Insuficientes
```
⚠️ DADOS INSUFICIENTES - memorial pode conter muitos placeholders
📊 RESUMO: 2/5 campos críticos disponíveis (40%)
```

**Soluções:**
1. Verificar se a propriedade foi criada com todos os campos
2. Verificar se os dados não estão sendo perdidos na consulta
3. Completar os dados faltantes na propriedade

## 📊 Interpretação dos Resultados

### Percentual de Campos Disponíveis
- **≥ 70%**: 🎉 Excelente - Memorial completo
- **≥ 50%**: ✅ Bom - Memorial com dados reais
- **< 50%**: ⚠️ Limitado - Muitos placeholders

### Campos Críticos para Memorial
1. **Nome do proprietário** - Essencial para identificação
2. **Endereço** - Localização da propriedade
3. **Cidade** - Contexto geográfico
4. **Área** - Dados técnicos
5. **Confrontações** - Limites da propriedade

## 🔧 Próximos Passos de Debug

1. **Execute o teste** e colete os logs
2. **Identifique onde o processo falha:**
   - Busca da propriedade?
   - Recuperação dos dados?
   - Construção do prompt?
   - Geração do memorial?
3. **Compare** os dados nos logs com o memorial final
4. **Verifique** se os dados estão chegando até a IA
5. **Analise** se a IA está usando os dados corretamente

## 📝 Exemplo de Log Completo Esperado

```
=== INICIANDO BUSCA DETALHADA DA PROPRIEDADE ===
🏠 PropertyId recebido: 12345678-1234-1234-1234-123456789012
👤 UserId: 87654321-4321-4321-4321-210987654321
🔍 Chamando propertyService.findByIdWithRelationships()...
✅ PROPRIEDADE ENCONTRADA NO STORAGE!
=== DADOS COMPLETOS DA PROPRIEDADE RECUPERADOS ===
📋 ID: 12345678-1234-1234-1234-123456789012
📋 Nome: Lote 25 - Quadra B - Teste Logs Detalhados
👤 Proprietário: João Silva Santos
👤 Documento: 123.456.789-00
📍 Rua: Rua das Flores
📍 Cidade: São Paulo
📐 Área total: 600.0 m²
🧭 Confrontação Norte: Confronta ao norte com a Rua das Flores
=== VERIFICAÇÃO DE CAMPOS CRÍTICOS ===
✅ Nome do proprietário: DISPONÍVEL
✅ Endereço: DISPONÍVEL
✅ Cidade: DISPONÍVEL
✅ Área: DISPONÍVEL
✅ Confrontações: DISPONÍVEL
📊 RESUMO: 5/5 campos críticos disponíveis (100%)
🎉 DADOS SUFICIENTES para gerar memorial com informações reais!
=== CONSTRUINDO PROMPT COM DADOS REAIS DA PROPRIEDADE ===
📝 Adicionado ao prompt - Nome: Lote 25 - Quadra B - Teste Logs Detalhados
📝 Adicionado ao prompt - Proprietário: João Silva Santos
📊 RESUMO FINAL DO PROMPT: 17/17 campos disponíveis (100%)
🎉 EXCELENTE: Dados suficientes para memorial completo!
```

## 🎯 Resultado Esperado

Após implementar os logs detalhados, você deve conseguir:

1. **Rastrear exatamente** onde os dados da propriedade estão sendo perdidos
2. **Verificar** se todos os campos estão sendo recuperados do banco
3. **Confirmar** se os dados estão sendo adicionados ao prompt
4. **Identificar** se o problema está na busca, no prompt ou na IA
5. **Resolver** o problema de forma direcionada

Execute o teste e analise os logs para identificar onde está o problema!