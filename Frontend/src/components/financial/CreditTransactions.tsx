import React, { useState, useEffect } from 'react';
import creditService from '../../services/creditService';
import type { 
  CreditTransaction, 
  CreditTransactionFilter 
} from '../../types/credit';

interface CreditTransactionsProps {
  transactions: CreditTransaction[];
  onRefresh: () => void;
  loading: boolean;
}

const CreditTransactions: React.FC<CreditTransactionsProps> = ({ 
  transactions, 
  onRefresh, 
  loading 
}) => {
  const [filter, setFilter] = useState<CreditTransactionFilter>({
    type: 'ALL',
    limit: 50
  });
  const [filteredTransactions, setFilteredTransactions] = useState<CreditTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...transactions];

    // Filtrar por tipo
    if (filter.type && filter.type !== 'ALL') {
      filtered = filtered.filter(t => t.type === filter.type);
    }

    // Filtrar por data
    if (filter.startDate) {
      filtered = filtered.filter(t => 
        new Date(t.createdAt) >= new Date(filter.startDate!)
      );
    }

    if (filter.endDate) {
      filtered = filtered.filter(t => 
        new Date(t.createdAt) <= new Date(filter.endDate!)
      );
    }

    // Limitar quantidade
    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    // Ordenar por data (mais recentes primeiro)
    filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setFilteredTransactions(filtered);
  }, [transactions, filter]);

  // Atualizar filtro
  const updateFilter = (updates: Partial<CreditTransactionFilter>) => {
    setFilter(prev => ({ ...prev, ...updates }));
  };

  // Refresh manual
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Calcular estatísticas
  const calculateStats = () => {
    const purchases = filteredTransactions.filter(t => t.type === 'PURCHASE');
    const uses = filteredTransactions.filter(t => t.type === 'USE');

    return {
      totalPurchased: purchases.reduce((sum, t) => sum + t.amount, 0),
      totalUsed: uses.reduce((sum, t) => sum + t.amount, 0),
      purchaseCount: purchases.length,
      useCount: uses.length
    };
  };

  const stats = calculateStats();

  if (loading && transactions.length === 0) {
    return (
      <div className="transactions-loading">
        <div className="loading-spinner">⏳</div>
        <p>Carregando transações...</p>
      </div>
    );
  }

  return (
    <div className="credit-transactions-container">
      {/* Header */}
      <div className="transactions-header">
        <div className="header-title">
          <h2>📊 Minhas Transações</h2>
          <button 
            className={`refresh-button ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Atualizar transações"
          >
            🔄
          </button>
        </div>
        
        {/* Estatísticas Rápidas */}
        <div className="quick-stats">
          <div className="stat-item purchase">
            <span className="stat-icon">💰</span>
            <div className="stat-content">
              <span className="stat-value">{stats.totalPurchased}</span>
              <span className="stat-label">Créditos Comprados</span>
            </div>
          </div>
          <div className="stat-item use">
            <span className="stat-icon">📤</span>
            <div className="stat-content">
              <span className="stat-value">{stats.totalUsed}</span>
              <span className="stat-label">Créditos Usados</span>
            </div>
          </div>
          <div className="stat-item balance">
            <span className="stat-icon">⚖️</span>
            <div className="stat-content">
              <span className="stat-value">{stats.totalPurchased - stats.totalUsed}</span>
              <span className="stat-label">Saldo Líquido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="transactions-filters">
        <div className="filter-group">
          <label htmlFor="typeFilter">Tipo:</label>
          <select
            id="typeFilter"
            value={filter.type}
            onChange={(e) => updateFilter({ 
              type: e.target.value as CreditTransactionFilter['type'] 
            })}
          >
            <option value="ALL">Todas</option>
            <option value="PURCHASE">Compras</option>
            <option value="USE">Usos</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="startDate">Data Inicial:</label>
          <input
            type="date"
            id="startDate"
            value={filter.startDate || ''}
            onChange={(e) => updateFilter({ startDate: e.target.value || undefined })}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="endDate">Data Final:</label>
          <input
            type="date"
            id="endDate"
            value={filter.endDate || ''}
            onChange={(e) => updateFilter({ endDate: e.target.value || undefined })}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="limitFilter">Limite:</label>
          <select
            id="limitFilter"
            value={filter.limit}
            onChange={(e) => updateFilter({ 
              limit: parseInt(e.target.value) || undefined 
            })}
          >
            <option value="25">25 registros</option>
            <option value="50">50 registros</option>
            <option value="100">100 registros</option>
            <option value="">Todos</option>
          </select>
        </div>

        <button 
          className="filter-clear"
          onClick={() => setFilter({ type: 'ALL', limit: 50 })}
        >
          🗑️ Limpar Filtros
        </button>
      </div>

      {/* Lista de Transações */}
      <div className="transactions-content">
        {filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>Nenhuma transação encontrada</h3>
            <p>
              {transactions.length === 0 
                ? 'Você ainda não possui transações em sua conta pessoal.'
                : 'Nenhuma transação corresponde aos filtros aplicados.'
              }
            </p>
            {transactions.length === 0 && (
              <button 
                className="btn-primary"
                onClick={() => {
                  const event = new CustomEvent('navigateToTab', { detail: { tab: 1 } });
                  window.dispatchEvent(event);
                }}
              >
                🛒 Comprar Créditos
              </button>
            )}
          </div>
        ) : (
          <div className="transactions-list">
            {filteredTransactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className={`transaction-card ${transaction.type.toLowerCase()}`}
              >
                <div className="transaction-header">
                  <div className="transaction-type">
                    <span className="type-icon">
                      {creditService.getTransactionIcon(transaction.type)}
                    </span>
                    <span className="type-text">
                      {transaction.type === 'PURCHASE' ? 'Compra' : 'Uso'}
                    </span>
                  </div>
                  <div className="transaction-date">
                    {creditService.formatDate(transaction.createdAt)}
                  </div>
                </div>

                <div className="transaction-content">
                  <div className="transaction-amount">
                    <span 
                      className="amount-value"
                      style={{ color: creditService.getTransactionColor(transaction.type) }}
                    >
                      {transaction.type === 'PURCHASE' ? '+' : '-'}{transaction.amount}
                    </span>
                    <span className="amount-unit">créditos</span>
                  </div>

                  <div className="transaction-description">
                    {transaction.description}
                  </div>
                </div>

                <div className="transaction-id">
                  <span className="id-label">ID:</span>
                  <span className="id-value">{transaction.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginação/Carregamento */}
      {filteredTransactions.length > 0 && filter.limit && filteredTransactions.length >= filter.limit && (
        <div className="transactions-pagination">
          <p className="pagination-info">
            Mostrando {filteredTransactions.length} de {transactions.length} transações
          </p>
          <button 
            className="load-more-btn"
            onClick={() => updateFilter({ limit: (filter.limit || 50) + 25 })}
          >
            📄 Carregar Mais
          </button>
        </div>
      )}

      {/* Resumo dos Filtros Aplicados */}
      {(filter.type !== 'ALL' || filter.startDate || filter.endDate) && (
        <div className="applied-filters">
          <h4>🔍 Filtros Aplicados:</h4>
          <div className="filter-tags">
            {filter.type !== 'ALL' && (
              <span className="filter-tag">
                Tipo: {filter.type === 'PURCHASE' ? 'Compras' : 'Usos'}
              </span>
            )}
            {filter.startDate && (
              <span className="filter-tag">
                A partir de: {new Date(filter.startDate).toLocaleDateString('pt-BR')}
              </span>
            )}
            {filter.endDate && (
              <span className="filter-tag">
                Até: {new Date(filter.endDate).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditTransactions;