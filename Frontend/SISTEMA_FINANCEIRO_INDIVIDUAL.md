# 👤 Sistema Financeiro Individual - Memorial Pro

## 🎯 Esclarecimento Importante

O **Sistema Financeiro do Memorial Pro** é um sistema **INDIVIDUAL por usuário**, não corporativo. Cada usuário tem sua própria conta de créditos independente.

---

## 🔐 Isolamento por Usuário

### **👤 Cada Usuário Tem:**
- **Saldo próprio** de créditos
- **Histórico individual** de transações
- **Compras pessoais** de créditos
- **Estatísticas próprias** de uso

### **🚫 Usuários NÃO Veem:**
- Saldo de outros usuários
- Transações de terceiros
- Compras de outras pessoas
- Dados financeiros da empresa

---

## 🏗️ Arquitetura de Segurança

### **🔒 Backend (Isolamento Garantido):**

#### **Controller Level:**
```java
@GetMapping("/balance")
public ResponseEntity<CreditBalanceDTO> getBalance() {
    UUID userId = AuthUtils.getCurrentUserId(); // ✅ Usuário logado
    UserCredits userCredits = creditService.getBalance(userId);
    // Retorna APENAS dados do usuário logado
}
```

#### **Service Level:**
```java
public UserCredits getBalance(UUID userId) {
    return findOrCreateUserCredits(userId); // ✅ Busca por userId
}

public List<CreditTransaction> listTransactions(UUID userId) {
    return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    // ✅ Filtra por userId
}
```

#### **Repository Level:**
```java
// Todas as queries incluem userId como filtro
findByUserIdOrderByCreatedAtDesc(UUID userId)
findByIdAndUserId(UUID purchaseId, UUID userId)
findTotalCreditsByUserId(UUID userId)
```

### **🛡️ Segurança Implementada:**
- **Autenticação obrigatória** em todos os endpoints
- **AuthUtils.getCurrentUserId()** extrai usuário do token JWT
- **Todas as queries** filtram por userId
- **Validação dupla** (purchaseId + userId) para compras
- **Logs detalhados** com userId para auditoria

---

## 👥 Tipos de Usuário

### **👤 Usuários Regulares:**
- **Veem:** Apenas seus próprios dados financeiros
- **Podem:** Comprar créditos para si mesmos
- **Usam:** Créditos para gerar memoriais
- **Acesso:** Widget de saldo na navbar

### **🔧 Administradores:**
- **Veem:** Apenas seus próprios dados financeiros (igual aos usuários)
- **Podem:** Acessar o sistema financeiro completo
- **Diferença:** Menu "Sistema Financeiro" no sidebar
- **Nota:** Admins NÃO veem dados de outros usuários

---

## 💰 Fluxo Individual de Créditos

### **🔄 Ciclo de Vida dos Créditos:**

#### **1. Compra Individual:**
```
Usuário A compra 50 créditos → Saldo do Usuário A = 50
Usuário B compra 30 créditos → Saldo do Usuário B = 30
```

#### **2. Uso Individual:**
```
Usuário A gera memorial (5 créditos) → Saldo do Usuário A = 45
Usuário B gera memorial (3 créditos) → Saldo do Usuário B = 27
```

#### **3. Isolamento Total:**
```
Usuário A não vê nem pode usar créditos do Usuário B
Usuário B não vê nem pode usar créditos do Usuário A
```

---

## 📊 Interface Individual

### **🎯 Dashboard Pessoal:**
- **Meu saldo atual**
- **Minhas transações**
- **Minhas compras**
- **Minhas estatísticas**

### **🛒 Compra Pessoal:**
- **Pacotes para minha conta**
- **Pagamento com meus dados**
- **Créditos adicionados ao meu saldo**

### **📋 Histórico Pessoal:**
- **Apenas minhas movimentações**
- **Filtros nos meus dados**
- **Exportação dos meus registros**

---

## 🔍 Verificação de Isolamento

### **🧪 Como Testar:**

#### **1. Teste com Múltiplos Usuários:**
```
1. Faça login como Usuário A
2. Compre 50 créditos
3. Faça logout
4. Faça login como Usuário B
5. Verifique que o saldo está zerado
6. Compre 30 créditos
7. Faça logout
8. Faça login como Usuário A novamente
9. Verifique que ainda tem 50 créditos
```

#### **2. Teste de Transações:**
```
1. Usuário A gera memorial (consome créditos)
2. Usuário B não vê essa transação
3. Usuário B gera memorial (consome seus créditos)
4. Usuário A não vê essa transação
```

#### **3. Teste de Compras:**
```
1. Usuário A faz compra de créditos
2. Usuário B não vê essa compra
3. Apenas Usuário A vê sua compra no histórico
```

---

## 🏢 Cenários de Uso

### **📈 Empresa com Múltiplos Usuários:**

#### **Cenário Típico:**
```
Empresa XYZ tem 5 funcionários:
- João (Engenheiro) → Saldo: 25 créditos
- Maria (Arquiteta) → Saldo: 40 créditos  
- Pedro (Técnico) → Saldo: 15 créditos
- Ana (Gerente) → Saldo: 60 créditos
- Carlos (Admin) → Saldo: 30 créditos

Cada um compra e usa seus próprios créditos
Ninguém vê o saldo dos outros
```

#### **Vantagens:**
- **Controle individual** de gastos
- **Responsabilidade pessoal** pelo uso
- **Privacidade** dos dados financeiros
- **Auditoria** por usuário
- **Flexibilidade** de compra

### **🏠 Profissional Autônomo:**
```
Arquiteto independente:
- Compra créditos conforme demanda
- Usa para projetos de clientes
- Controla próprio orçamento
- Histórico pessoal completo
```

---

## 🔧 Configuração Administrativa

### **⚙️ O que Admins Podem Fazer:**
- **Acessar** interface completa do sistema financeiro
- **Comprar** créditos para sua própria conta
- **Ver** apenas seus próprios dados
- **Configurar** pacotes de crédito (futuro)

### **🚫 O que Admins NÃO Podem Fazer:**
- Ver saldo de outros usuários
- Transferir créditos entre usuários
- Acessar transações de terceiros
- Gerenciar conta corporativa (não existe)

---

## 📋 Comparação: Individual vs Corporativo

### **✅ Sistema Atual (Individual):**
```
Usuário A: 50 créditos (isolado)
Usuário B: 30 créditos (isolado)
Usuário C: 20 créditos (isolado)
Total: Cada um gerencia o seu
```

### **❌ Sistema Corporativo (NÃO implementado):**
```
Conta Empresa: 100 créditos (compartilhado)
Todos os usuários usam da mesma conta
Admin gerencia conta central
```

---

## 🚀 Benefícios do Sistema Individual

### **👤 Para Usuários:**
- **Controle total** sobre seus créditos
- **Privacidade** financeira
- **Flexibilidade** de compra
- **Responsabilidade** clara

### **🏢 Para Empresas:**
- **Transparência** de custos por usuário
- **Controle** de gastos individuais
- **Auditoria** detalhada
- **Escalabilidade** sem complexidade

### **🔧 Para Desenvolvedores:**
- **Segurança** por design
- **Isolamento** natural
- **Simplicidade** de implementação
- **Manutenção** facilitada

---

## 📞 Perguntas Frequentes

### **❓ "Como faço para ver o saldo da empresa?"**
**Resposta:** Não existe saldo da empresa. Cada usuário tem seu próprio saldo individual.

### **❓ "Posso transferir créditos para outro usuário?"**
**Resposta:** Não. Cada usuário deve comprar seus próprios créditos.

### **❓ "O admin pode adicionar créditos na minha conta?"**
**Resposta:** Não. Cada usuário deve comprar seus próprios créditos através do sistema.

### **❓ "Como controlar gastos da equipe?"**
**Resposta:** Cada usuário é responsável por seus gastos. Use relatórios individuais para acompanhamento.

### **❓ "Posso ver quanto outros usuários gastaram?"**
**Resposta:** Não. Dados financeiros são privados de cada usuário.

---

## 🎯 Conclusão

O **Sistema Financeiro do Memorial Pro** é projetado para ser **individual e privado**. Cada usuário:

- ✅ **Tem sua própria conta** de créditos
- ✅ **Compra créditos** para si mesmo
- ✅ **Usa créditos** de sua conta
- ✅ **Vê apenas** seus dados
- ✅ **Controla** seus gastos

Esta arquitetura garante **privacidade**, **segurança** e **simplicidade** no gerenciamento de créditos.

**💡 O sistema funciona como contas bancárias individuais - cada pessoa tem a sua!**