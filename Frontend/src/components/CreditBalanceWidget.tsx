import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import creditService from '../services/creditService';
import type { CreditBalance } from '../types/credit';

interface CreditBalanceWidgetProps {
  className?: string;
  showDetails?: boolean;
}

interface ErrorLike {
  message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorLike).message || fallback;
  }

  return fallback;
};

const CreditBalanceWidget: React.FC<CreditBalanceWidgetProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar saldo
  useEffect(() => {
    if (user) {
      loadBalance();
      // Atualizar a cada 30 segundos
      const interval = setInterval(loadBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadBalance = async () => {
    try {
      setError(null);
      const balanceData = await creditService.getBalance();
      setBalance(balanceData);
    } catch (error: unknown) {
      console.error('❌ Erro ao carregar saldo:', error);
      setError(getErrorMessage(error, 'Erro ao carregar saldo.'));
    } finally {
      setLoading(false);
    }
  };

  const getBalanceColor = () => {
    if (!balance) return '#6b7280';
    
    const credits = balance.totalCredits;
    if (credits >= 20) return '#16a34a'; // Verde
    if (credits >= 5) return '#d97706';  // Amarelo
    return '#dc2626'; // Vermelho
  };

  const getBalanceIcon = () => {
    if (!balance) return '💰';
    
    const credits = balance.totalCredits;
    if (credits >= 20) return '💰';
    if (credits >= 5) return '⚠️';
    if (credits > 0) return '🚨';
    return '⛔';
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className={`credit-balance-widget loading ${className}`}>
        <span className="widget-icon">⏳</span>
        <span className="widget-text">Carregando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`credit-balance-widget error ${className}`}>
        <span className="widget-icon">❌</span>
        <span className="widget-text">Erro</span>
      </div>
    );
  }

  return (
    <div 
      className={`credit-balance-widget ${className}`}
      style={{ color: getBalanceColor() }}
      title={`Meu saldo: ${balance?.totalCredits || 0} créditos`}
      onClick={() => window.location.href = '/my-account'}
    >
      <span className="widget-icon">{getBalanceIcon()}</span>
      <div className="widget-content">
        <span className="widget-value">{balance?.totalCredits || 0}</span>
        {showDetails && (
          <span className="widget-label">créditos</span>
        )}
      </div>
      
      <style>{`
        .credit-balance-widget {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .credit-balance-widget:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }
        
        .credit-balance-widget.loading,
        .credit-balance-widget.error {
          opacity: 0.7;
          cursor: default;
        }
        
        .widget-icon {
          font-size: 1.2rem;
        }
        
        .widget-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .widget-value {
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1;
        }
        
        .widget-label {
          font-size: 0.75rem;
          opacity: 0.8;
          line-height: 1;
        }
        
        .widget-text {
          font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
          .credit-balance-widget {
            padding: 0.4rem 0.8rem;
          }
          
          .widget-icon {
            font-size: 1rem;
          }
          
          .widget-value {
            font-size: 1rem;
          }
          
          .widget-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default CreditBalanceWidget;
