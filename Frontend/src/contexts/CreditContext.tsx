import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useCredits } from '../hooks/useCredits';
import type { 
  CreditBalance, 
  CreditTransaction, 
  CreditPurchaseResponse,
  CreditStatistics 
} from '../types/credit';

interface CreditContextType {
  // Estados
  balance: CreditBalance | null;
  transactions: CreditTransaction[];
  purchases: CreditPurchaseResponse[];
  statistics: CreditStatistics | null;
  loading: boolean;
  error: string | null;
  
  // Ações
  refresh: () => void;
  loadBalance: () => Promise<CreditBalance>;
  loadTransactions: () => Promise<CreditTransaction[]>;
  loadPurchases: () => Promise<CreditPurchaseResponse[]>;
  loadStatistics: () => Promise<CreditStatistics>;
  
  // Utilitários
  hasEnoughCredits: (requiredCredits: number) => boolean;
  calculateRequiredCredits: (lotCount: number) => number;
  
  // Informações derivadas
  currentBalance: number;
  hasCredits: boolean;
  isLowBalance: boolean;
  isCriticalBalance: boolean;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

interface CreditProviderProps {
  children: ReactNode;
}

export const CreditProvider = ({ children }: CreditProviderProps) => {
  const creditData = useCredits();

  return (
    <CreditContext.Provider value={creditData}>
      {children}
    </CreditContext.Provider>
  );
};

export const useCreditContext = (): CreditContextType => {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCreditContext must be used within a CreditProvider');
  }
  return context;
};

export default CreditContext;
