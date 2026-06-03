import React from 'react';
import { useCreditContext } from '../../contexts/CreditContext';
import { formatCurrency, formatNumber, formatRelativeDate } from '../../utils/formatters';
import LoadingSpinner from './LoadingSpinner';

interface CreditDashboardProps {
  className?: string;
}

const CreditDashboard: React.FC<CreditDashboardProps> = ({ className = '' }) => {
  const { balance, statistics, transactions, loading, error } = useCreditContext();

  if (loading) {
    return <LoadingSpinner message="Carregando dashboard..." />;
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <span className="error-icon">❌</span>
        <p>Erro ao carregar dashboard: {error}</p>
      </div>
    );
  }

  // Calcular estatísticas rápidas
  const recentTransactions = transactions?.slice(0, 3) || [];
  const totalSpent = statistics?.totalSpent || 0;
  const totalPurchased = statistics?.totalPurchased || 0;
  const lastTransaction = transactions?.[0];

  const stats = [
    {
      title: 'Saldo Atual',
      value: formatNumber(balance?.totalCredits || 0),
      unit: 'créditos',
      icon: '💰',
      color: balance && balance.totalCredits > 10 ? '#16a34a' : balance && balance.totalCredits > 0 ? '#f59e0b' : '#dc2626'
    },
    {
      title: 'Total Gasto',
      value: formatCurrency(totalSpent),
      unit: '',
      icon: '💸',
      color: '#6b7280'
    },
    {
      title: 'Total Comprado',
      value: formatNumber(totalPurchased),
      unit: 'créditos',
      icon: '📈',
      color: '#2563eb'
    },
    {
      title: 'Última Atividade',
      value: lastTransaction ? formatRelativeDate(lastTransaction.createdAt) : 'Nenhuma',
      unit: '',
      icon: '🕒',
      color: '#7c3aed'
    }
  ];

  return (
    <div className={`credit-dashboard ${className}`}>
      {/* Aviso sobre conta individual */}
      <div className="individual-account-notice">
        <div className="notice-content">
          <span className="notice-icon">👤</span>
          <div className="notice-text">
            <strong>Conta Individual:</strong> Estes são seus créditos pessoais. 
            Cada usuário tem sua própria conta independente.
          </div>
        </div>
      </div>

      {/* Estatísticas principais */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-header">
              <span className="stat-icon">{stat.icon}</span>
              <h3 className="stat-title">{stat.title}</h3>
            </div>
            <div className="stat-content">
              <span className="stat-value" style={{ color: stat.color }}>
                {stat.value}
              </span>
              {stat.unit && (
                <span className="stat-unit">{stat.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Transações recentes */}
      {recentTransactions.length > 0 && (
        <div className="recent-transactions">
          <h4 className="section-title">Transações Recentes</h4>
          <div className="transactions-list">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-info">
                  <span className="transaction-type">
                    {transaction.type === 'PURCHASE' ? '💰' : '📄'}
                  </span>
                  <div className="transaction-details">
                    <span className="transaction-description">
                      {transaction.description}
                    </span>
                    <span className="transaction-date">
                      {formatRelativeDate(transaction.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="transaction-amount">
                  <span 
                    className={`amount ${transaction.type === 'PURCHASE' ? 'positive' : 'negative'}`}
                  >
                    {transaction.type === 'PURCHASE' ? '+' : '-'}{transaction.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas de saldo */}
      {balance && balance.totalCredits <= 5 && (
        <div className={`balance-alert ${balance.totalCredits === 0 ? 'critical' : 'warning'}`}>
          <span className="alert-icon">
            {balance.totalCredits === 0 ? '🚨' : '⚠️'}
          </span>
          <div className="alert-content">
            <h4 className="alert-title">
              {balance.totalCredits === 0 ? 'Sem Créditos!' : 'Saldo Baixo!'}
            </h4>
            <p className="alert-message">
              {balance.totalCredits === 0 
                ? 'Você precisa comprar créditos para continuar gerando memoriais.'
                : `Restam apenas ${balance.totalCredits} créditos. Considere fazer uma recarga.`
              }
            </p>
          </div>
          <button 
            className="alert-action"
            onClick={() => window.location.href = '/my-account?tab=3'}
          >
            Comprar Créditos
          </button>
        </div>
      )}

      <style>{`
        .credit-dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .stat-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .stat-icon {
          font-size: 1.5rem;
        }

        .stat-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-content {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
        }

        .stat-unit {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .recent-transactions {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 1rem 0;
        }

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .transaction-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .transaction-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .transaction-type {
          font-size: 1.25rem;
        }

        .transaction-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .transaction-description {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .transaction-date {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .transaction-amount {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .amount.positive {
          color: #16a34a;
        }

        .amount.negative {
          color: #dc2626;
        }

        .balance-alert {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          border-radius: 8px;
          border: 1px solid;
        }

        .balance-alert.warning {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-color: #f59e0b;
          color: #92400e;
        }

        .balance-alert.critical {
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          border-color: #dc2626;
          color: #dc2626;
        }

        .alert-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .alert-content {
          flex: 1;
        }

        .alert-title {
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
        }

        .alert-message {
          font-size: 0.875rem;
          margin: 0;
          opacity: 0.9;
        }

        .alert-action {
          background: currentColor;
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .alert-action:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .dashboard-error {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
        }

        .error-icon {
          font-size: 1.5rem;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 1rem;
          }

          .stat-value {
            font-size: 1.5rem;
          }

          .balance-alert {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .transaction-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CreditDashboard;