/**
 * Configuração dos pacotes de crédito disponíveis
 */

export interface CreditPackage {
  id: string;
  name: string;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
  pricePerCredit: number;
  popular?: boolean;
  description?: string;
  features?: string[];
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    baseCredits: 10,
    bonusCredits: 0,
    totalCredits: 10,
    price: 50.00,
    pricePerCredit: 5.00,
    description: 'Ideal para testes e pequenos projetos',
    features: [
      '10 créditos',
      'Suporte básico',
      'Válido por 6 meses'
    ]
  },
  {
    id: 'basic',
    name: 'Básico',
    baseCredits: 25,
    bonusCredits: 5,
    totalCredits: 30,
    price: 100.00,
    pricePerCredit: 3.33,
    description: 'Perfeito para uso regular',
    features: [
      '25 créditos + 5 bônus',
      'Suporte prioritário',
      'Válido por 12 meses'
    ]
  },
  {
    id: 'professional',
    name: 'Profissional',
    baseCredits: 50,
    bonusCredits: 15,
    totalCredits: 65,
    price: 180.00,
    pricePerCredit: 2.77,
    popular: true,
    description: 'Mais popular entre profissionais',
    features: [
      '50 créditos + 15 bônus',
      'Suporte premium',
      'Válido por 12 meses',
      'Desconto em renovações'
    ]
  },
  {
    id: 'business',
    name: 'Empresarial',
    baseCredits: 100,
    bonusCredits: 35,
    totalCredits: 135,
    price: 320.00,
    pricePerCredit: 2.37,
    description: 'Ideal para empresas e escritórios',
    features: [
      '100 créditos + 35 bônus',
      'Suporte dedicado',
      'Válido por 18 meses',
      'Relatórios de uso',
      'API de integração'
    ]
  },
  {
    id: 'enterprise',
    name: 'Corporativo',
    baseCredits: 250,
    bonusCredits: 100,
    totalCredits: 350,
    price: 700.00,
    pricePerCredit: 2.00,
    description: 'Para grandes volumes e corporações',
    features: [
      '250 créditos + 100 bônus',
      'Suporte 24/7',
      'Válido por 24 meses',
      'Gerente de conta dedicado',
      'Integração personalizada',
      'SLA garantido'
    ]
  }
];

/**
 * Configurações do sistema de créditos
 */
export const CREDIT_CONFIG = {
  // Custo por lote processado
  COST_PER_LOT: 1,
  
  // Alertas de saldo baixo
  LOW_BALANCE_THRESHOLD: 5,
  CRITICAL_BALANCE_THRESHOLD: 0,
  
  // Limites
  MIN_PURCHASE_AMOUNT: 10,
  MAX_PURCHASE_AMOUNT: 1000,
  
  // Validade dos créditos (em meses)
  DEFAULT_EXPIRY_MONTHS: 12,
  
  // Métodos de pagamento disponíveis
  PAYMENT_METHODS: [
    { id: 'pix', name: 'PIX', icon: '🏦', description: 'Pagamento instantâneo' },
    { id: 'credit_card', name: 'Cartão de Crédito', icon: '💳', description: 'Visa, Mastercard, Elo' },
    { id: 'bank_slip', name: 'Boleto Bancário', icon: '📄', description: 'Vencimento em 3 dias úteis' },
    { id: 'bank_transfer', name: 'Transferência Bancária', icon: '🏛️', description: 'TED/DOC' }
  ],
  
  // Status de transação
  TRANSACTION_STATUS: {
    PENDING: { name: 'Pendente', color: '#f59e0b', icon: '⏳' },
    PAID: { name: 'Pago', color: '#16a34a', icon: '✅' },
    FAILED: { name: 'Falhou', color: '#dc2626', icon: '❌' },
    CANCELLED: { name: 'Cancelado', color: '#6b7280', icon: '⚪' },
    REFUNDED: { name: 'Reembolsado', color: '#0891b2', icon: '↩️' }
  },
  
  // Tipos de transação
  TRANSACTION_TYPES: {
    PURCHASE: { name: 'Compra', color: '#16a34a', icon: '💰' },
    USE: { name: 'Uso', color: '#dc2626', icon: '📄' },
    REFUND: { name: 'Reembolso', color: '#0891b2', icon: '↩️' },
    BONUS: { name: 'Bônus', color: '#7c3aed', icon: '🎁' },
    ADJUSTMENT: { name: 'Ajuste', color: '#f59e0b', icon: '⚖️' }
  }
};

/**
 * Encontrar pacote por ID
 */
export const findPackageById = (id: string): CreditPackage | undefined => {
  return CREDIT_PACKAGES.find(pkg => pkg.id === id);
};

/**
 * Obter pacote mais popular
 */
export const getPopularPackage = (): CreditPackage | undefined => {
  return CREDIT_PACKAGES.find(pkg => pkg.popular);
};

/**
 * Calcular economia em relação ao pacote básico
 */
export const calculateSavings = (packageId: string): number => {
  const selectedPackage = findPackageById(packageId);
  const basicPackage = findPackageById('starter');
  
  if (!selectedPackage || !basicPackage) return 0;
  
  const basicCostForSameCredits = selectedPackage.totalCredits * basicPackage.pricePerCredit;
  const savings = basicCostForSameCredits - selectedPackage.price;
  
  return Math.max(0, savings);
};

/**
 * Obter recomendação de pacote baseado no uso
 */
export const getRecommendedPackage = (monthlyUsage: number): CreditPackage => {
  const recommendedCredits = monthlyUsage * 3; // 3 meses de uso
  
  // Encontrar o pacote mais adequado
  const suitablePackages = CREDIT_PACKAGES.filter(pkg => pkg.totalCredits >= recommendedCredits);
  
  if (suitablePackages.length === 0) {
    return CREDIT_PACKAGES[CREDIT_PACKAGES.length - 1]; // Maior pacote
  }
  
  return suitablePackages[0]; // Menor pacote adequado
};