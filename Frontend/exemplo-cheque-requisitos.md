# 🔍 Botão "Cheque Requisitos" - Como Funciona

## 📍 Localização
O botão **"✅ Cheque Requisitos"** foi adicionado no **Viewer**, ao lado dos botões de zoom (+/-).

## 🎯 Funcionalidade
Quando clicado, o botão verifica se todos os dados necessários para gerar um memorial estão presentes no localStorage e mostra um relatório completo.

## 📋 Exemplo de Relatório - Todos os Requisitos OK

```
📋 VERIFICAÇÃO DE REQUISITOS PARA MEMORIAL
==========================================

✅ Arquivos DXF: ✅ OK
   └─ 2 arquivo(s) selecionado(s)

📋 Normas ABNT: ✅ OK
   └─ 1 norma(s) selecionada(s)

🎨 Template: ✅ OK
   └─ Template Padrão Memorial

🏠 Propriedade: ✅ OK (opcional)
   └─ Propriedade Teste

🔑 Autenticação: ✅ OK

🎯 STATUS GERAL: ✅ PRONTO PARA GERAR MEMORIAL

🎉 Todos os requisitos obrigatórios estão OK!
Você pode gerar o memorial clicando no botão "Gerar Memorial" 🤖
```

## 📋 Exemplo de Relatório - Requisitos Pendentes

```
📋 VERIFICAÇÃO DE REQUISITOS PARA MEMORIAL
==========================================

✅ Arquivos DXF: ❌ FALTA

📋 Normas ABNT: ✅ OK
   └─ 1 norma(s) selecionada(s)

🎨 Template: ❌ FALTA

🏠 Propriedade: ⚠️ OPCIONAL

🔑 Autenticação: ✅ OK

🎯 STATUS GERAL: ❌ REQUISITOS PENDENTES

📝 AÇÕES NECESSÁRIAS:
• Selecione arquivos DXF na sidebar
• Configure template em "Gerenciar Templates"
```

## 🔍 O que o Botão Verifica

### ✅ **Requisitos Obrigatórios:**
1. **Arquivos DXF** - `localStorage.getItem('selectedFiles')`
2. **Normas ABNT** - `localStorage.getItem('selectedMemorialNorms')`
3. **Template** - `localStorage.getItem('selectedTemplate')`
4. **Token de Autenticação** - `localStorage.getItem('token')`

### ⚠️ **Requisitos Opcionais:**
1. **Propriedade** - `localStorage.getItem('selectedPropertyForMemorial')`
   - Se não tiver, o memorial será gerado com placeholders genéricos
   - Se tiver, o memorial usará dados reais da propriedade

## 🎯 Benefícios

1. **Diagnóstico Rápido** - Identifica imediatamente o que está faltando
2. **Evita Erros** - Previne tentativas de gerar memorial sem requisitos
3. **Orientação Clara** - Mostra exatamente o que fazer para resolver
4. **Debug Facilitado** - Logs detalhados no console para desenvolvedores

## 🚀 Como Usar

1. **Abra o Viewer** - Navegue para qualquer arquivo DXF
2. **Clique no Botão** - "✅ Cheque Requisitos" (ao lado dos botões +/-)
3. **Veja o Relatório** - Alert com status completo dos requisitos
4. **Siga as Instruções** - Complete os requisitos pendentes se houver
5. **Gere o Memorial** - Quando tudo estiver OK, use o botão "Gerar Memorial"

## 🔧 Para Desenvolvedores

- **Logs no Console** - Informações detalhadas para debug
- **Função Reutilizável** - Pode ser chamada de outros componentes
- **Validação Robusta** - Trata erros de JSON e dados inválidos
- **Interface Amigável** - Mensagens claras para usuários finais

Este botão resolve definitivamente o problema de "não saber por que o memorial não gera" - agora é só clicar e ver exatamente o que está faltando! 🎯