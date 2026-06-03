# Sistema Financeiro - Memorial Pro

## Visão Geral

O Sistema Financeiro do Memorial Pro é um módulo completo para gerenciamento de créditos, permitindo que os usuários comprem, monitorem e utilizem créditos para gerar memoriais descritivos.

## Componentes Principais

### 1. CreditDashboard
**Arquivo:** `CreditDashboard.tsx`
**Descrição:** Dashboard principal com visão geral dos créditos e atividades recentes.

**Funcionalidades:**
- Exibição do saldo atual de créditos
- Estatísticas de gastos e compras
- Transações recentes
- Alertas de saldo baixo/crítico
- Navegação rápida para compra de créditos

### 2. CreditBalance
**Arquivo:** `CreditBalance.tsx`
**Descrição:** Componente detalhado para visualização do saldo de créditos.

**Funcionalidades:**
- Saldo atual com status visual
- Histórico de alterações de saldo
- Estimativas de uso
- Regras de utilização
- Ações rápidas (comprar créditos, ver transações)

### 3. CreditPurchaseForm
**Arquivo:** `CreditPurchaseForm.tsx`
**Descrição:** Formulário para compra de créditos com pacotes pré-definidos.

**Funcionalidades:**
- Seleção de pacotes de crédito
- Compra personalizada
- Múltiplos métodos de pagamento
- Resumo da compra
- Processamento de pagamento

### 4. CreditTransactions
**Arquivo:** `CreditTransactions.tsx`
**Descrição:** Lista e filtros para transações de crédito.

**Funcionalidades:**
- Histórico completo de transações
- Filtros por tipo, status e período
- Busca por descrição
- Exportação de dados
- Paginação

### 5. CreditPurchases
**Arquivo:** `CreditPurchases.tsx`
**Descrição:** Gerenciamento de compras realizadas.

**Funcionalidades:**
- Lista de compras com status
- Detalhes de cada compra
- Reprocessamento de pagamentos
- Cancelamento de compras pendentes
- Histórico de pagamentos

### 6. CreditStatistics
**Arquivo:** `CreditStatistics.tsx`
**Descrição:** Estatísticas e relatórios de uso de créditos.

**Funcionalidades:**
- Gráficos de uso ao longo do tempo
- Estatísticas de consumo
- Projeções de uso futuro
- Relatórios de economia
- Análise de padrões de uso

### 7. LoadingSpinner
**Arquivo:** `LoadingSpinner.tsx`
**Descrição:** Componente de loading personalizado para o sistema financeiro.

**Funcionalidades:**
- Diferentes tamanhos (small, medium, large)
- Mensagens personalizáveis
- Modo tela cheia
- Animações suaves

## Utilitários e Contextos

### CreditContext
**Arquivo:** `../contexts/CreditContext.tsx`
**Descrição:** Contexto React para gerenciamento global do estado de créditos.

**Funcionalidades:**
- Estado global de créditos
- Funções de carregamento de dados
- Validações de crédito
- Refresh automático

### useCredits Hook
**Arquivo:** `../hooks/useCredits.ts`
**Descrição:** Hook personalizado para operações com créditos.

**Funcionalidades:**
- Carregamento de dados
- Validações
- Cálculos de créditos necessários
- Estados derivados

### CreditValidation
**Arquivo:** `../components/CreditValidation.tsx`
**Descrição:** Componente para validação de créditos antes de operações.

**Funcionalidades:**
- Verificação de saldo suficiente
- Alertas visuais
- Navegação para compra
- Detalhes da validação

### CreditNotification
**Arquivo:** `../components/CreditNotification.tsx`
**Descrição:** Sistema de notificações para alertas de crédito.

**Funcionalidades:**
- Notificações de saldo baixo
- Alertas críticos
- Auto-dismiss
- Posicionamento configurável

### CreditBalanceWidget
**Arquivo:** `../components/CreditBalanceWidget.tsx`
**Descrição:** Widget compacto para exibição do saldo na navbar.

**Funcionalidades:**
- Saldo em tempo real
- Indicadores visuais de status
- Navegação rápida
- Responsivo

## Configurações

### Pacotes de Crédito
**Arquivo:** `../config/creditPackages.ts`
**Descrição:** Configuração dos pacotes de crédito disponíveis.

**Pacotes Disponíveis:**
- **Starter:** 10 créditos - R$ 50,00
- **Básico:** 30 créditos (25 + 5 bônus) - R$ 100,00
- **Profissional:** 65 créditos (50 + 15 bônus) - R$ 180,00 ⭐ Popular
- **Empresarial:** 135 créditos (100 + 35 bônus) - R$ 320,00
- **Corporativo:** 350 créditos (250 + 100 bônus) - R$ 700,00

### Formatadores
**Arquivo:** `../utils/formatters.ts`
**Descrição:** Utilitários para formatação de dados financeiros.

**Funções Disponíveis:**
- `formatCurrency()` - Formatação monetária
- `formatDate()` - Formatação de datas
- `formatTransactionStatus()` - Status de transações
- `formatTransactionType()` - Tipos de transação
- E muitas outras...

## Estilos CSS

### Arquivo Principal
**Arquivo:** `../styles/Financial.css`
**Descrição:** Estilos completos para todo o sistema financeiro.

**Características:**
- Design responsivo
- Variáveis CSS customizáveis
- Animações suaves
- Suporte a dark mode
- Estilos para impressão

## Integração com Backend

### Service
**Arquivo:** `../services/creditService.ts`
**Descrição:** Serviço para comunicação com a API de créditos.

**Endpoints:**
- `GET /api/credits/balance` - Saldo atual
- `GET /api/credits/transactions` - Lista de transações
- `GET /api/credits/purchases` - Lista de compras
- `POST /api/credits/purchase` - Nova compra
- `GET /api/credits/statistics` - Estatísticas

### Tipos TypeScript
**Arquivo:** `../types/credit.ts`
**Descrição:** Definições de tipos para o sistema de créditos.

**Tipos Principais:**
- `CreditBalance` - Saldo de créditos
- `CreditTransaction` - Transação de crédito
- `CreditPurchaseRequest` - Solicitação de compra
- `CreditPurchaseResponse` - Resposta de compra
- `CreditStatistics` - Estatísticas de uso

## Navegação e Roteamento

### Página Principal
**Arquivo:** `../pages/Financial.tsx`
**Descrição:** Página principal do sistema financeiro com navegação por abas.

**Abas Disponíveis:**
1. **Dashboard** - Visão geral
2. **Saldo** - Detalhes do saldo
3. **Comprar Créditos** - Formulário de compra
4. **Transações** - Histórico de transações
5. **Compras** - Gerenciamento de compras
6. **Estatísticas** - Relatórios e gráficos

### Navegação por URL
É possível navegar diretamente para uma aba específica usando o parâmetro `tab`:
- `/financial?tab=0` - Dashboard
- `/financial?tab=1` - Saldo
- `/financial?tab=2` - Comprar Créditos
- etc.

## Segurança e Permissões

### Controle de Acesso
- Apenas usuários autenticados podem acessar
- Administradores têm acesso completo
- Usuários regulares veem apenas seus próprios dados

### Validações
- Validação de saldo antes de operações
- Verificação de permissões no backend
- Sanitização de dados de entrada

## Responsividade

O sistema é totalmente responsivo e funciona em:
- **Desktop** - Layout completo com todas as funcionalidades
- **Tablet** - Layout adaptado com navegação otimizada
- **Mobile** - Interface simplificada e touch-friendly

## Acessibilidade

- Suporte a leitores de tela
- Navegação por teclado
- Contraste adequado
- Textos alternativos para ícones
- Foco visível em elementos interativos

## Performance

### Otimizações Implementadas
- Lazy loading de componentes
- Memoização de cálculos pesados
- Debounce em buscas e filtros
- Cache de dados no contexto
- Carregamento paralelo de dados

### Monitoramento
- Loading states em todas as operações
- Error boundaries para captura de erros
- Logs detalhados para debugging
- Métricas de performance

## Manutenção e Extensibilidade

### Estrutura Modular
Cada componente é independente e pode ser:
- Testado isoladamente
- Reutilizado em outras partes do sistema
- Modificado sem afetar outros componentes

### Configurabilidade
- Pacotes de crédito configuráveis
- Temas personalizáveis via CSS
- Textos e mensagens externalizados
- Comportamentos ajustáveis via props

### Testes
- Testes unitários para cada componente
- Testes de integração para fluxos completos
- Testes de acessibilidade
- Testes de performance

## Roadmap Futuro

### Funcionalidades Planejadas
- [ ] Sistema de assinatura mensal
- [ ] Créditos com validade
- [ ] Programa de fidelidade
- [ ] Integração com mais gateways de pagamento
- [ ] Relatórios avançados com BI
- [ ] API para integrações externas
- [ ] App mobile nativo
- [ ] Sistema de referência e indicação

### Melhorias Técnicas
- [ ] Migração para React Query
- [ ] Implementação de PWA
- [ ] Otimização de bundle
- [ ] Implementação de Service Workers
- [ ] Testes E2E automatizados