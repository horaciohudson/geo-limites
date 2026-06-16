import { useState, useEffect, useCallback } from 'react';
import creditService from '../services/creditService';
import type { 
  CreditBalance, 
  CreditTransaction, 
  CreditPurchaseResponse,
  CreditStatistics 
} from '../types/credit';

interface ErrorLike {
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }

  return fallback;
};

/**
 * Hook personalizado para gerenciar créditos
 */
export const useCredits = () => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [purchases, setPurchases] = useState<CreditPurchaseResponse[]>([]);
  const [statistics, setStatistics] = useState<CreditStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar saldo
  const loadBalance = useCallback(async () => {
    try {
      const balanceData = await creditService.getBalance();
      setBalance(balanceData);
      return balanceData;
    } catch (error: unknown) {
      console.error('❌ Erro ao carregar saldo:', error);
      throw error;
    }
  }, []);

  // Carregar transações
  const loadTransactions = useCallback(async () => {
    try {
      const transactionsData = await creditService.getTransactions();
      setTransactions(transactionsData);
      return transactionsData;
    } catch (error: unknown) {
      console.error('❌ Erro ao carregar transações:', error);
      throw error;
    }
  }, []);

  // Carregar compras
  const loadPurchases = useCallback(async () => {
    try {
      const purchasesData = await creditService.getPurchases();
      setPurchases(purchasesData);
      return purchasesData;
    } catch (error: unknown) {
      console.error('❌ Erro ao carregar compras:', error);
      throw error;
    }
  }, []);

  // Carregar estatísticas
  const loadStatistics = useCallback(async () => {
    try {
      const statisticsData = await creditService.getStatistics();
      setStatistics(statisticsData);
      return statisticsData;
    } catch (error: unknown) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      throw error;
    }
  }, []);

  // Carregar todos os dados
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadBalance(),
        loadTransactions(),
        loadPurchases(),
        loadStatistics()
      ]);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Erro ao carregar dados'));
    } finally {
      setLoading(false);
    }
  }, [loadBalance, loadTransactions, loadPurchases, loadStatistics]);

  // Atualizar dados
  const refresh = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  // Verificar se tem créditos suficientes
  const hasEnoughCredits = useCallback((requiredCredits: number): boolean => {
    return (balance?.totalCredits || 0) >= requiredCredits;
  }, [balance]);

  // Calcular créditos necessários
  const calculateRequiredCredits = useCallback((lotCount: number): number => {
    return creditService.calculateRequiredCredits(lotCount);
  }, []);

  // Inicializar dados
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    // Estados
    balance,
    transactions,
    purchases,
    statistics,
    loading,
    error,
    
    // Ações
    refresh,
    loadBalance,
    loadTransactions,
    loadPurchases,
    loadStatistics,
    
    // Utilitários
    hasEnoughCredits,
    calculateRequiredCredits,
    
    // Informações derivadas
    currentBalance: balance?.totalCredits || 0,
    hasCredits: (balance?.totalCredits || 0) > 0,
    isLowBalance: (balance?.totalCredits || 0) < 5,
    isCriticalBalance: (balance?.totalCredits || 0) === 0
  };
};

export default useCredits;
