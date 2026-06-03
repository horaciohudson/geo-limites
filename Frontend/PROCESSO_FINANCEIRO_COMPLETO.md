# 💰 Processo Financeiro Completo - Memorial Pro

## 📋 Visão Geral do Sistema

O Memorial Pro utiliza um **sistema de créditos** para controlar o uso da IA na geração de memoriais descritivos. Cada memorial gerado consome créditos baseado na complexidade do projeto.

---

## 🔐 Controle de Acesso

### 👥 Tipos de Usuário

#### **🔧 Administradores (ADMIN)**
- **Acesso completo** ao sistema financeiro
- **Podem comprar créditos** para a organização
- **Visualizam todas as transações**
- **Gerenciam o saldo** da empresa
- **Menu financeiro visível** no sidebar

#### **👤 Usuários Regulares**
- **Visualizam apenas** o saldo atual (widget na navbar)
- **Não podem comprar** créditos diretamente
- **Recebem notificações** de saldo baixo
- **Podem solicitar** créditos ao administrador

---

## 🚪 Como Acessar o Sistema Financeiro

### **Para Administradores:**

#### **Método 1: Menu Lateral**
1. Faça login como administrador
2. No **menu lateral esquerdo**, procure a seção "💰 FINANCEIRO"
3. Clique em "💰 Sistema Financeiro"

#### **Método 2: URL Direta**
- Acesse diretamente: `http://localhost:3000/financial`

#### **Método 3: Widget da Navbar**
- Clique no **widget de saldo** no canto superior direito da navbar

### **Para Usuários Regulares:**
- **Apenas o widget** de saldo está disponível na navbar
- **Clique no widget** para ser redirecionado ao sistema (se tiver permissão)

---

## 📊 Interface do Sistema Financeiro

### **🎯 6 Abas Principais:**

#### **1. 📊 Dashboard**
- **Visão geral** do sistema
- **Saldo atual** com indicadores visuais
- **Estatísticas rápidas** (total gasto, comprado, etc.)
- **Transações recentes** (últimas 3)
- **Alertas de saldo** baixo/crítico
- **Navegação rápida** para compra

#### **2. 💰 Saldo**
- **Saldo detalhado** com histórico
- **Estimativas de uso** baseadas no consumo
- **Regras de utilização** dos créditos
- **Ações rápidas** (comprar, ver transações)
- **Status visual** do saldo (verde/amarelo/vermelho)

#### **3. 🛒 Comprar Créditos**
- **5 pacotes pré-configurados**:
  - **Starter:** 10 créditos - R$ 50,00
  - **Básico:** 30 créditos (25 + 5 bônus) - R$ 100,00
  - **Profissional:** 65 créditos (50 + 15 bônus) - R$ 180,00 ⭐ **Popular**
  - **Empresarial:** 135 créditos (100 + 35 bônus) - R$ 320,00
  - **Corporativo:** 350 créditos (250 + 100 bônus) - R$ 700,00
- **Compra personalizada** com valor livre
- **4 métodos de pagamento**:
  - 🏦 **PIX** (instantâneo)
  - 💳 **Cartão de Crédito**
  - 📄 **Boleto Bancário**
  - 🏛️ **Transferência Bancária**
- **Resumo detalhado** antes da compra

#### **4. 📋 Transações**
- **Histórico completo** de movimentações
- **Filtros avançados**:
  - Por tipo (compra, uso, reembolso, bônus)
  - Por status (pago, pendente, falhou)
  - Por período (data início/fim)
- **Busca** por descrição
- **Paginação** inteligente
- **Exportação** de dados (futuro)

#### **5. 🧾 Compras**
- **Lista de todas as compras** realizadas
- **Status detalhado** de cada compra
- **Ações disponíveis**:
  - **Reprocessar** pagamentos falhados
  - **Cancelar** compras pendentes
  - **Ver detalhes** da transação
- **Histórico de pagamentos**

#### **6. 📈 Estatísticas**
- **Gráficos de uso** ao longo do tempo
- **Projeções** de consumo futuro
- **Análise de padrões** de uso
- **Relatórios de economia**
- **Métricas de performance**

---

## 💳 Processo de Compra de Créditos

### **🛒 Fluxo Completo:**

#### **Passo 1: Seleção do Pacote**
1. Acesse a aba "🛒 Comprar Créditos"
2. **Escolha um pacote** pré-configurado OU
3. **Configure compra personalizada**
4. **Visualize o resumo** (créditos, bônus, preço)

#### **Passo 2: Dados da Compra**
1. **Preencha os dados**:
   - Quantidade de créditos (se personalizada)
   - Método de pagamento
   - Dados de cobrança (se necessário)
2. **Revise o resumo** da compra
3. **Confirme** os dados

#### **Passo 3: Processamento**
1. **Clique em "Comprar Créditos"**
2. **Sistema processa** a solicitação
3. **Redirecionamento** para gateway de pagamento (se necessário)

#### **Passo 4: Confirmação**
1. **Pagamento processado**
2. **Créditos adicionados** automaticamente
3. **Notificação** de sucesso
4. **Email de confirmação** (futuro)

### **💰 Métodos de Pagamento:**

#### **🏦 PIX (Recomendado)**
- **Processamento:** Instantâneo
- **Disponibilidade:** 24/7
- **Confirmação:** Automática
- **Taxa:** Sem taxa adicional

#### **💳 Cartão de Crédito**
- **Processamento:** Instantâneo
- **Parcelamento:** Até 12x (futuro)
- **Confirmação:** Imediata
- **Taxa:** Conforme operadora

#### **📄 Boleto Bancário**
- **Processamento:** 1-3 dias úteis
- **Vencimento:** 3 dias úteis
- **Confirmação:** Após compensação
- **Taxa:** Sem taxa adicional

#### **🏛️ Transferência Bancária**
- **Processamento:** 1-2 dias úteis
- **Confirmação:** Manual
- **Comprovante:** Necessário
- **Taxa:** Conforme banco

---

## ⚡ Consumo de Créditos

### **📊 Regras de Consumo:**

#### **Por Número de Lotes:**
- **1 lote:** 1 crédito
- **2-5 lotes:** 3 créditos
- **6-10 lotes:** 5 créditos
- **11-20 lotes:** 8 créditos
- **21+ lotes:** 12 créditos

#### **Fatores que Influenciam:**
- **Complexidade** do projeto
- **Número de entidades** DXF
- **Tamanho** dos arquivos
- **Detalhamento** solicitado

### **🔍 Validação Automática:**
- **Antes de gerar** cada memorial
- **Verificação** de saldo suficiente
- **Alerta visual** se insuficiente
- **Redirecionamento** para compra

---

## 🚨 Sistema de Alertas

### **📱 Notificações Automáticas:**

#### **⚠️ Saldo Baixo (≤ 5 créditos)**
- **Notificação** no canto da tela
- **Widget amarelo** na navbar
- **Sugestão** de recarga
- **Auto-dismiss** em 5 segundos

#### **🚨 Saldo Crítico (0 créditos)**
- **Notificação vermelha** persistente
- **Widget vermelho** na navbar
- **Bloqueio** de geração de memoriais
- **Botão direto** para compra

#### **✅ Compra Confirmada**
- **Notificação verde** de sucesso
- **Atualização** automática do saldo
- **Confirmação** por email (futuro)

---

## 📊 Widget de Saldo (Navbar)

### **🎯 Funcionalidades:**
- **Sempre visível** para todos os usuários
- **Atualização** a cada 30 segundos
- **Cores indicativas**:
  - 🟢 **Verde:** Saldo bom (≥20 créditos)
  - 🟡 **Amarelo:** Saldo baixo (5-19 créditos)
  - 🔴 **Vermelho:** Saldo crítico (0-4 créditos)
- **Clique** para navegar ao sistema financeiro

### **📱 Responsividade:**
- **Desktop:** Mostra número + "créditos"
- **Mobile:** Apenas número + ícone

---

## 🔄 Fluxo de Uso Completo

### **🎯 Cenário Típico:**

#### **1. Usuário Novo**
1. **Cadastra** propriedade
2. **Faz upload** de arquivos DXF
3. **Tenta gerar** memorial
4. **Recebe alerta** de créditos insuficientes
5. **Admin compra** créditos
6. **Usuário gera** memorial com sucesso

#### **2. Uso Regular**
1. **Verifica saldo** no widget
2. **Gera memoriais** normalmente
3. **Recebe alerta** quando saldo baixa
4. **Admin recarrega** conforme necessário

#### **3. Administrador**
1. **Monitora** uso no dashboard
2. **Compra créditos** proativamente
3. **Analisa** estatísticas de consumo
4. **Otimiza** compras baseado no uso

---

## 🛠️ Configurações Administrativas

### **⚙️ Pacotes Personalizáveis:**
```typescript
// Arquivo: Frontend/src/config/creditPackages.ts
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    baseCredits: 10,
    bonusCredits: 0,
    price: 50.00,
    // Personalize aqui
  }
];
```

### **🎨 Temas e Cores:**
```css
/* Arquivo: Frontend/src/styles/themes.css */
:root {
  --financial-primary: #2563eb;
  --financial-success: #16a34a;
  /* Personalize as cores */
}
```

### **💸 Custos e Limites:**
```typescript
export const CREDIT_CONFIG = {
  COST_PER_LOT: 1, // Créditos por lote
  LOW_BALANCE_THRESHOLD: 5, // Alerta saldo baixo
  MIN_PURCHASE_AMOUNT: 10, // Compra mínima
  MAX_PURCHASE_AMOUNT: 1000, // Compra máxima
};
```

---

## 🔧 Troubleshooting

### **❓ Problemas Comuns:**

#### **"Não vejo o menu financeiro"**
- **Solução:** Verifique se está logado como administrador
- **Verificação:** User deve ter role "ADMIN"

#### **"Widget não aparece"**
- **Solução:** Faça logout/login
- **Verificação:** Token de autenticação válido

#### **"Erro ao carregar saldo"**
- **Solução:** Verifique conexão com backend
- **Verificação:** API `/api/credits/balance` funcionando

#### **"Compra não processada"**
- **Solução:** Verifique status na aba "Compras"
- **Ação:** Use botão "Reprocessar" se necessário

### **🔍 Logs de Debug:**
- **Frontend:** Console do navegador (F12)
- **Backend:** Logs do Spring Boot
- **Busque por:** "💰", "❌", "✅" nos logs

---

## 📈 Métricas e Relatórios

### **📊 Dados Disponíveis:**
- **Saldo atual** e histórico
- **Consumo** por período
- **Compras** realizadas
- **Economia** com pacotes
- **Projeções** de uso

### **📋 Relatórios Futuros:**
- **Exportação** para Excel/PDF
- **Relatórios** mensais automáticos
- **Análise** de ROI
- **Comparativo** de períodos

---

## 🚀 Roadmap Futuro

### **🔮 Funcionalidades Planejadas:**
- [ ] **Assinatura mensal** recorrente
- [ ] **Créditos com validade**
- [ ] **Programa de fidelidade**
- [ ] **Mais gateways** de pagamento
- [ ] **App mobile** nativo
- [ ] **API externa** para integrações
- [ ] **Relatórios avançados** com BI
- [ ] **Sistema de referência**

### **🛠️ Melhorias Técnicas:**
- [ ] **React Query** para cache
- [ ] **PWA** (Progressive Web App)
- [ ] **Service Workers**
- [ ] **Testes E2E** automatizados
- [ ] **Monitoramento** de performance

---

## 📞 Suporte e Contato

### **🆘 Em Caso de Problemas:**
1. **Verifique** este documento primeiro
2. **Consulte** os logs de debug
3. **Teste** em modo incógnito
4. **Contate** o suporte técnico

### **📚 Documentação Adicional:**
- **README técnico:** `Frontend/src/components/financial/README.md`
- **Arquivo de teste:** `Frontend/src/test-financial.html`
- **Guia de implementação:** `Frontend/SISTEMA_FINANCEIRO_PRONTO.md`

---

## ✅ Checklist de Verificação

### **🔍 Para Administradores:**
- [ ] Consigo ver o menu "💰 FINANCEIRO" no sidebar?
- [ ] Consigo acessar `/financial` sem erros?
- [ ] O dashboard carrega corretamente?
- [ ] Posso navegar entre todas as 6 abas?
- [ ] O formulário de compra funciona?
- [ ] As transações aparecem corretamente?

### **👤 Para Usuários:**
- [ ] Vejo o widget de saldo na navbar?
- [ ] O widget mostra o saldo correto?
- [ ] Recebo alertas quando o saldo está baixo?
- [ ] Sou bloqueado quando não tenho créditos?
- [ ] Posso gerar memoriais quando tenho saldo?

### **🔧 Para Desenvolvedores:**
- [ ] Todos os componentes compilam sem erro?
- [ ] As APIs do backend respondem corretamente?
- [ ] Os estilos CSS carregam sem problemas?
- [ ] O sistema é responsivo em mobile?
- [ ] Os testes passam sem falhas?

---

## 🎉 Conclusão

O **Sistema Financeiro do Memorial Pro** é uma solução completa e robusta para gerenciamento de créditos, oferecendo:

- ✅ **Interface intuitiva** e responsiva
- ✅ **Controle granular** de acesso
- ✅ **Múltiplos métodos** de pagamento
- ✅ **Validações automáticas**
- ✅ **Relatórios detalhados**
- ✅ **Notificações inteligentes**

**🚀 O sistema está pronto para uso em produção e pode ser facilmente personalizado conforme as necessidades da organização!**