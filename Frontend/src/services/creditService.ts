import api from './api';
import type {
  CreditBalance,
  CreditPricingSettings,
  CreditTransaction,
  CreditPurchaseRequest,
  CreditPurchaseResponse,
  CreditSummary,
  CreditTransactionFilter,
  CreditPurchaseFilter,
  CreditStatistics
} from '../types/credit';

interface ApiErrorLike {
  code?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const getApiError = (error: unknown): ApiErrorLike | null => {
  if (typeof error === 'object' && error !== null) {
    return error as ApiErrorLike;
  }

  return null;
};

const isMockableCreditError = (error: unknown): boolean => {
  const apiError = getApiError(error);
  const status = apiError?.response?.status;
  return status === 404 || status === 500 || apiError?.code === 'ERR_NETWORK';
};

const isUninitializedCreditsError = (error: unknown): boolean => {
  const apiError = getApiError(error);
  return (
    apiError?.response?.status === 500 &&
    apiError.response.data?.message?.includes('user_credits_id') === true
  );
};

/**
 * Serviço para gerenciar créditos via API
 */
class CreditService {
  private pricingSettingsCache: CreditPricingSettings | null = null;

  async getPricingSettings(): Promise<CreditPricingSettings> {
    try {
      const response = await api.get<CreditPricingSettings>('/credits/settings');
      this.pricingSettingsCache = response.data;
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar configuracao de creditos:', error);

      if (isMockableCreditError(error)) {
        this.pricingSettingsCache = {
          welcomeCredits: 25,
          singleLotCreditCost: 1,
          smallProjectMaxLots: 5,
          smallProjectCreditCost: 3,
          largeProjectCreditCost: 10,
          customPricePerCredit: 2.5,
          packages: [
            { id: 'starter', name: 'Starter', baseCredits: 10, bonusCredits: 0, totalCredits: 10, price: 25, pricePerCredit: 2.5, popular: false },
            { id: 'basic', name: 'Profissional', baseCredits: 50, bonusCredits: 5, totalCredits: 55, price: 100, pricePerCredit: 1.82, popular: true },
            { id: 'professional', name: 'Empresarial', baseCredits: 100, bonusCredits: 20, totalCredits: 120, price: 180, pricePerCredit: 1.5, popular: false },
            { id: 'enterprise', name: 'Corporativo', baseCredits: 250, bonusCredits: 75, totalCredits: 325, price: 400, pricePerCredit: 1.23, popular: false }
          ]
        };
        return this.pricingSettingsCache;
      }

      throw new Error('Erro ao carregar configuracao de creditos');
    }
  }
  
  /**
   * NOVO: Inicializa créditos para o usuário (chamado no login/primeiro acesso)
   */
  async initializeCredits(): Promise<CreditBalance> {
    try {
      const response = await api.post<CreditBalance>('/credits/initialize');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao inicializar créditos:', error);

      // Fallback para getBalance se inicialização falhar
      return this.getBalance();
    }
  }

  /**
   * Consulta o saldo atual de créditos
   * MODIFICADO: Tenta inicializar automaticamente se necessário
   */
  async getBalance(): Promise<CreditBalance> {
    try {
      const response = await api.get<CreditBalance>('/credits/balance');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao consultar saldo:', error);
      
      // Se erro for relacionado a créditos não existentes, tentar inicializar
      if (isUninitializedCreditsError(error)) {
        try {
          return await this.initializeCredits();
        } catch (initError) {
          console.error('❌ Falha na inicialização automática:', initError);
        }
      }
      
      // Mock temporário para desenvolvimento quando backend não está disponível
      if (isMockableCreditError(error)) {
        return {
          userId: 'mock-user-id',
          totalCredits: 25,
          lastUpdated: new Date().toISOString()
        };
      }
      
      throw new Error('Erro ao consultar saldo de créditos');
    }
  }

  /**
   * Lista transações de créditos
   */
  async getTransactions(filter?: CreditTransactionFilter): Promise<CreditTransaction[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.type && filter.type !== 'ALL') params.append('type', filter.type);
      if (filter?.startDate) params.append('startDate', filter.startDate);
      if (filter?.endDate) params.append('endDate', filter.endDate);
      if (filter?.limit) params.append('limit', filter.limit.toString());

      const response = await api.get<CreditTransaction[]>(`/credits/transactions?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao listar transações:', error);
      
      // Mock temporário para desenvolvimento quando backend não está disponível
      if (isMockableCreditError(error)) {
        return [
          {
            id: 'mock-transaction-1',
            type: 'PURCHASE',
            amount: 50,
            description: 'Compra de créditos - Pacote Básico',
            createdAt: new Date(Date.now() - 86400000).toISOString() // 1 dia atrás
          },
          {
            id: 'mock-transaction-2',
            type: 'USE',
            amount: 10,
            description: 'Geração de memorial - Loteamento Vila Nova',
            createdAt: new Date(Date.now() - 43200000).toISOString() // 12 horas atrás
          },
          {
            id: 'mock-transaction-3',
            type: 'USE',
            amount: 15,
            description: 'Geração de memorial - Desmembramento Centro',
            createdAt: new Date(Date.now() - 21600000).toISOString() // 6 horas atrás
          }
        ];
      }
      
      throw new Error('Erro ao listar transações de créditos');
    }
  }

  /**
   * Inicia uma compra de créditos
   */
  async startPurchase(request: CreditPurchaseRequest): Promise<CreditPurchaseResponse> {
    try {
      const response = await api.post<CreditPurchaseResponse>('/credits/purchase/start', request);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao iniciar compra:', error);
      throw new Error('Erro ao iniciar compra de créditos');
    }
  }

  /**
   * Confirma uma compra (simulação para desenvolvimento)
   */
  async confirmPurchase(purchaseId: string): Promise<CreditPurchaseResponse> {
    try {
      const response = await api.post<CreditPurchaseResponse>(`/credits/purchase/confirm/${purchaseId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao confirmar compra:', error);
      throw new Error('Erro ao confirmar compra');
    }
  }

  /**
   * Marca uma compra como falha (simulação para desenvolvimento)
   */
  async failPurchase(purchaseId: string): Promise<CreditPurchaseResponse> {
    try {
      const response = await api.post<CreditPurchaseResponse>(`/credits/purchase/fail/${purchaseId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao marcar compra como falha:', error);
      throw new Error('Erro ao processar falha da compra');
    }
  }

  /**
   * Lista compras de créditos
   */
  async getPurchases(filter?: CreditPurchaseFilter): Promise<CreditPurchaseResponse[]> {
    try {
      const params = new URLSearchParams();
      if (filter?.status && filter.status !== 'ALL') params.append('status', filter.status);
      if (filter?.startDate) params.append('startDate', filter.startDate);
      if (filter?.endDate) params.append('endDate', filter.endDate);
      if (filter?.limit) params.append('limit', filter.limit.toString());

      const response = await api.get<CreditPurchaseResponse[]>(`/credits/purchases?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao listar compras:', error);
      
      // Mock temporário para desenvolvimento quando backend não está disponível
      if (isMockableCreditError(error)) {
        return [
          {
            id: 'mock-purchase-1',
            creditsPurchased: 50,
            amountReais: 25.00,
            paymentProvider: 'stripe',
            status: 'PAID',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            message: 'Compra realizada com sucesso'
          },
          {
            id: 'mock-purchase-2',
            creditsPurchased: 100,
            amountReais: 45.00,
            paymentProvider: 'pix',
            status: 'PENDING',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            message: 'Aguardando confirmação do pagamento'
          }
        ];
      }
      
      throw new Error('Erro ao listar compras de créditos');
    }
  }

  /**
   * Obtém resumo completo (saldo + transações recentes)
   */
  async getSummary(): Promise<CreditSummary> {
    try {
      const response = await api.get<CreditSummary>('/credits/summary');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao consultar resumo:', error);
      
      // Mock temporário para desenvolvimento quando backend não está disponível
      if (isMockableCreditError(error)) {
        const balance = await this.getBalance();
        const transactions = await this.getTransactions({ limit: 5 });
        
        return {
          balance,
          recentTransactions: transactions
        };
      }
      
      throw new Error('Erro ao consultar resumo de créditos');
    }
  }

  /**
   * Calcula estatísticas de uso de créditos
   */
  async getStatistics(): Promise<CreditStatistics> {
    try {
      const [transactions, purchases] = await Promise.all([
        this.getTransactions(),
        this.getPurchases({ status: 'PAID' })
      ]);

      const totalPurchased = transactions
        .filter(t => t.type === 'PURCHASE')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalUsed = transactions
        .filter(t => t.type === 'USE')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalSpent = purchases
        .reduce((sum, p) => sum + p.amountReais, 0);

      const averagePurchase = purchases.length > 0 
        ? totalSpent / purchases.length 
        : 0;

      const lastPurchase = transactions
        .filter(t => t.type === 'PURCHASE')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      const lastUsage = transactions
        .filter(t => t.type === 'USE')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        totalPurchased,
        totalUsed,
        totalSpent,
        averagePurchase,
        lastPurchaseDate: lastPurchase?.createdAt,
        lastUsageDate: lastUsage?.createdAt
      };
    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      throw new Error('Erro ao calcular estatísticas');
    }
  }

  /**
   * Verifica se tem créditos suficientes (cache local + verificação remota)
   */
  async hasEnoughCredits(requiredCredits: number): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      return balance.totalCredits >= requiredCredits;
    } catch (error) {
      console.error('❌ Erro ao verificar créditos:', error);
      return false;
    }
  }

  /**
   * Calcula créditos necessários baseado no número de lotes
   */
  calculateRequiredCredits(lotCount: number): number {
    const pricingSettings = this.pricingSettingsCache;

    if (!pricingSettings) {
      if (lotCount <= 1) return 1;
      if (lotCount <= 5) return 3;
      return 10;
    }

    if (lotCount <= 1) return pricingSettings.singleLotCreditCost;
    if (lotCount <= pricingSettings.smallProjectMaxLots) return pricingSettings.smallProjectCreditCost;
    return pricingSettings.largeProjectCreditCost;
  }

  /**
   * Formata valor monetário para exibição
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  /**
   * Formata data para exibição
   */
  formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }



  /**
   * Obtém ícone baseado no tipo de transação
   */
  getTransactionIcon(type: string): string {
    const icons: Record<string, string> = {
      'PURCHASE': '💰',
      'USE': '📤',
      'REFUND': '↩️',
      'BONUS': '🎁',
      'ADJUSTMENT': '⚖️'
    };
    return icons[type] || '❓';
  }

  /**
   * Obtém cor baseada no tipo de transação
   */
  getTransactionColor(type: string): string {
    const colors: Record<string, string> = {
      'PURCHASE': '#16a34a',
      'USE': '#dc2626',
      'REFUND': '#0891b2',
      'BONUS': '#7c3aed',
      'ADJUSTMENT': '#d97706'
    };
    return colors[type] || '#6b7280';
  }

  /**
   * Obtém ícone do status da compra
   */
  getPurchaseStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'PENDING': '⏳',
      'PAID': '✅',
      'FAILED': '❌',
      'CANCELLED': '⚪',
      'REFUNDED': '↩️'
    };
    return icons[status] || '❓';
  }

  /**
   * Obtém cor do status da compra
   */
  getPurchaseStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'PENDING': '#f59e0b',
      'PAID': '#16a34a',
      'FAILED': '#dc2626',
      'CANCELLED': '#6b7280',
      'REFUNDED': '#0891b2'
    };
    return colors[status] || '#6b7280';
  }

  /**
   * Obtém texto do status da compra
   */
  getPurchaseStatusText(status: string): string {
    const texts: Record<string, string> = {
      'PENDING': 'Pendente',
      'PAID': 'Pago',
      'FAILED': 'Falhou',
      'CANCELLED': 'Cancelado',
      'REFUNDED': 'Reembolsado'
    };
    return texts[status] || status;
  }



}

// Exportar instância singleton
export const creditService = new CreditService();
export default creditService;
