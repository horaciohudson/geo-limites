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
  packageId?: string;
  credits?: number;
  amountReais?: number;
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

export interface CreditPackage {
  id: string;
  name: string;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
  pricePerCredit: number;
  popular: boolean;
}

export interface CreditPricingSettings {
  welcomeCredits: number;
  singleLotCreditCost: number;
  smallProjectMaxLots: number;
  smallProjectCreditCost: number;
  largeProjectCreditCost: number;
  customPricePerCredit: number;
  packages: CreditPackage[];
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

export const PAYMENT_PROVIDERS = [
  { value: 'stripe', label: 'Cartão de Crédito (Stripe)' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto Bancário' },
  { value: 'default', label: 'Padrão do Sistema' }
] as const;
