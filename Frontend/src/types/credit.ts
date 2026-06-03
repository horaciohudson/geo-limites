// ===== TIPOS PARA O SISTEMA DE CRÉDITOS =====

export interface CreditBalance {
  userId: string;
  totalCredits: number;
  lastUpdated: string;
}

export interface CreditTransaction {
  id: string;
  type: 'PURCHASE' | 'USE';
  amount: number;
  description: string;
  createdAt: string;
}

export interface CreditPurchaseRequest {
  credits: number;
  amountReais: number;
  paymentProvider?: string;
}

export interface CreditPurchaseResponse {
  id: string;
  creditsPurchased: number;
  amountReais: number;
  paymentProvider: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  createdAt: string;
  message: string;
}

export interface CreditSummary {
  balance: CreditBalance;
  recentTransactions: CreditTransaction[];
}

export interface CreditUsageInfo {
  currentBalance: number;
  requiredCredits: number;
  estimatedLots: number;
  canGenerate: boolean;
  message: string;
}

// Tipos para formulários
export interface CreditPurchaseFormData {
  credits: number;
  amountReais: number;
  paymentProvider: string;
}

export interface CreditPurchaseFormValidation {
  credits?: string;
  amountReais?: string;
  paymentProvider?: string;
  general?: string[];
}

// Tipos para estatísticas
export interface CreditStatistics {
  totalPurchased: number;
  totalUsed: number;
  totalSpent: number;
  averagePurchase: number;
  lastPurchaseDate?: string;
  lastUsageDate?: string;
}

// Tipos para filtros
export interface CreditTransactionFilter {
  type?: 'PURCHASE' | 'USE' | 'ALL';
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface CreditPurchaseFilter {
  status?: 'PENDING' | 'PAID' | 'FAILED' | 'ALL';
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// Constantes
export const CREDIT_PRICING = {
  SINGLE_LOT: 1,      // 1 lote = 1 crédito
  SMALL_PROJECT: 3,   // 2-5 lotes = 3 créditos
  LARGE_PROJECT: 10   // 6+ lotes = 10 créditos
} as const;

export const PAYMENT_PROVIDERS = [
  { value: 'stripe', label: 'Cartão de Crédito (Stripe)' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto Bancário' },
  { value: 'default', label: 'Padrão do Sistema' }
] as const;

export const CREDIT_PACKAGES = [
  { credits: 10, price: 25.00, bonus: 0, popular: false },
  { credits: 50, price: 100.00, bonus: 5, popular: true },
  { credits: 100, price: 180.00, bonus: 20, popular: false },
  { credits: 250, price: 400.00, bonus: 75, popular: false }
] as const;