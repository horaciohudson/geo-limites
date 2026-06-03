import React, { useState, useEffect } from 'react';
import creditService from '../../services/creditService';
import type { 
  CreditPurchaseResponse, 
  CreditPurchaseFilter 
} from '../../types/credit';

interface CreditPurchasesProps {
  purchases: CreditPurchaseResponse[];
  onRefresh: () => void;
  onStatusUpdate: () => void;
  loading: boolean;
}

type PurchaseStatus = CreditPurchaseResponse['status'];

const CreditPurchases: React.FC<CreditPurchasesProps> = ({ 
  purchases, 
  onRefresh, 
  onStatusUpdate,
  loading 
}) => {
  const [filter, setFilter] = useState<CreditPurchaseFilter>({
    status: 'ALL',
    limit: 25
  });
  const [filteredPurchases, setFilteredPurchases] = useState<CreditPurchaseResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [processingPurchase, setProcessingPurchase] = useState<string | null>(null);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...purchases];

    // Filtrar por status
    if (filter.status && filter.status !== 'ALL') {
      filtered = filtered.filter(p => p.status === filter.status);
    }

    // Filtrar por data
    if (filter.startDate) {
      filtered = filtered.filter(p => 
        new Date(p.createdAt) >= new Date(filter.startDate!)
      );
    }

    if (filter.endDate) {
      filtered = filtered.filter(p => 
        new Date(p.createdAt) <= new Date(filter.endDate!)
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

    setFilteredPurchases(filtered);
  }, [purchases, filter]);

  // Atualizar filtro
  const updateFilter = (updates: Partial<CreditPurchaseFilter>) => {
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

  // Simular confirmação de pagamento (para desenvolvimento)
  const handleConfirmPayment = async (purchaseId: string) => {
    setProcessingPurchase(purchaseId);
    try {
      await creditService.confirmPurchase(purchaseId);
      onStatusUpdate();
    } catch (error) {
      console.error('❌ Erro ao confirmar pagamento:', error);
      alert('Erro ao confirmar pagamento. Tente novamente.');
    } finally {
      setProcessingPurchase(null);
    }
  };

  // Simular falha de pagamento (para desenvolvimento)
  const handleFailPayment = async (purchaseId: string) => {
    setProcessingPurchase(purchaseId);
    try {
      await creditService.failPurchase(purchaseId);
      onStatusUpdate();
    } catch (error) {
      console.error('❌ Erro ao marcar como falha:', error);
      alert('Erro ao processar falha. Tente novamente.');
    } finally {
      setProcessingPurchase(null);
    }
  };

  // Calcular estatísticas
  const calculateStats = () => {
    const pending = filteredPurchases.filter(p => p.status === 'PENDING');
    const paid = filteredPurchases.filter(p => p.status === 'PAID');
    const failed = filteredPurchases.filter(p => p.status === 'FAILED');

    return {
      totalAmount: paid.reduce((sum, p) => sum + p.amountReais, 0),
      totalCredits: paid.reduce((sum, p) => sum + p.creditsPurchased, 0),
      pendingCount: pending.length,
      paidCount: paid.length,
      failedCount: failed.length
    };
  };

  const stats = calculateStats();
  const selectedStatus: PurchaseStatus | undefined =
    filter.status && filter.status !== 'ALL' ? filter.status : undefined;

  if (loading && purchases.length === 0) {
    return (
      <div className="purchases-loading">
        <div className="loading-spinner">⏳</div>
        <p>Carregando compras...</p>
      </div>
    );
  }

  return (
    <div className="credit-purchases-container">
      {/* Header */}
      <div className="purchases-header">
        <div className="header-title">
          <h2>🧾 Minhas Compras</h2>
          <button 
            className={`refresh-button ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Atualizar compras"
          >
            🔄
          </button>
        </div>
        
        {/* Estatísticas Rápidas */}
        <div className="quick-stats">
          <div className="stat-item paid">
            <span className="stat-icon">✅</span>
            <div className="stat-content">
              <span className="stat-value">{stats.paidCount}</span>
              <span className="stat-label">Pagas</span>
            </div>
          </div>
          <div className="stat-item pending">
            <span className="stat-icon">⏳</span>
            <div className="stat-content">
              <span className="stat-value">{stats.pendingCount}</span>
              <span className="stat-label">Pendentes</span>
            </div>
          </div>
          <div className="stat-item failed">
            <span className="stat-icon">❌</span>
            <div className="stat-content">
              <span className="stat-value">{stats.failedCount}</span>
              <span className="stat-label">Falharam</span>
            </div>
          </div>
          <div className="stat-item total">
            <span className="stat-icon">💰</span>
            <div className="stat-content">
              <span className="stat-value">{creditService.formatCurrency(stats.totalAmount)}</span>
              <span className="stat-label">Total Gasto</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="purchases-filters">
        <div className="filter-group">
          <label htmlFor="statusFilter">Status:</label>
          <select
            id="statusFilter"
            value={filter.status}
            onChange={(e) => updateFilter({ 
              status: e.target.value as CreditPurchaseFilter['status'] 
            })}
          >
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendentes</option>
            <option value="PAID">Pagos</option>
            <option value="FAILED">Falharam</option>
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
            <option value="10">10 registros</option>
            <option value="25">25 registros</option>
            <option value="50">50 registros</option>
            <option value="">Todos</option>
          </select>
        </div>

        <button 
          className="filter-clear"
          onClick={() => setFilter({ status: 'ALL', limit: 25 })}
        >
          🗑️ Limpar Filtros
        </button>
      </div>

      {/* Lista de Compras */}
      <div className="purchases-content">
        {filteredPurchases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <h3>Nenhuma compra encontrada</h3>
            <p>
              {purchases.length === 0 
                ? 'Você ainda não fez nenhuma compra para sua conta pessoal.'
                : 'Nenhuma compra corresponde aos filtros aplicados.'
              }
            </p>
            {purchases.length === 0 && (
              <button 
                className="btn-primary"
                onClick={() => {
                  const event = new CustomEvent('navigateToTab', { detail: { tab: 1 } });
                  window.dispatchEvent(event);
                }}
              >
                🛒 Fazer Primeira Compra
              </button>
            )}
          </div>
        ) : (
          <div className="purchases-list">
            {filteredPurchases.map((purchase) => (
              <div 
                key={purchase.id} 
                className={`purchase-card ${purchase.status.toLowerCase()}`}
              >
                <div className="purchase-header">
                  <div className="purchase-status">
                    <span 
                      className="status-icon"
                      style={{ color: creditService.getPurchaseStatusColor(purchase.status) }}
                    >
                      {creditService.getPurchaseStatusIcon(purchase.status)}
                    </span>
                    <span className="status-text">
                      {creditService.getPurchaseStatusText(purchase.status)}
                    </span>
                  </div>
                  <div className="purchase-date">
                    {creditService.formatDate(purchase.createdAt)}
                  </div>
                </div>

                <div className="purchase-content">
                  <div className="purchase-details">
                    <div className="detail-row">
                      <span className="detail-label">Créditos:</span>
                      <span className="detail-value">{purchase.creditsPurchased}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Valor:</span>
                      <span className="detail-value">
                        {creditService.formatCurrency(purchase.amountReais)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Provedor:</span>
                      <span className="detail-value">{purchase.paymentProvider}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Preço/Crédito:</span>
                      <span className="detail-value">
                        {creditService.formatCurrency(purchase.amountReais / purchase.creditsPurchased)}
                      </span>
                    </div>
                  </div>

                  {purchase.message && (
                    <div className="purchase-message">
                      {purchase.message}
                    </div>
                  )}
                </div>

                <div className="purchase-footer">
                  <div className="purchase-id">
                    <span className="id-label">ID:</span>
                    <span className="id-value">{purchase.id}</span>
                  </div>

                  {/* Ações para desenvolvimento */}
                  {purchase.status === 'PENDING' && (
                    <div className="purchase-actions">
                      <button
                        className="action-btn confirm"
                        onClick={() => handleConfirmPayment(purchase.id)}
                        disabled={processingPurchase === purchase.id}
                        title="Simular confirmação de pagamento"
                      >
                        {processingPurchase === purchase.id ? '⏳' : '✅'} Confirmar
                      </button>
                      <button
                        className="action-btn fail"
                        onClick={() => handleFailPayment(purchase.id)}
                        disabled={processingPurchase === purchase.id}
                        title="Simular falha de pagamento"
                      >
                        {processingPurchase === purchase.id ? '⏳' : '❌'} Falhar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginação */}
      {filteredPurchases.length > 0 && filter.limit && filteredPurchases.length >= filter.limit && (
        <div className="purchases-pagination">
          <p className="pagination-info">
            Mostrando {filteredPurchases.length} de {purchases.length} compras
          </p>
          <button 
            className="load-more-btn"
            onClick={() => updateFilter({ limit: (filter.limit || 25) + 10 })}
          >
            📄 Carregar Mais
          </button>
        </div>
      )}

      {/* Resumo dos Filtros Aplicados */}
      {(filter.status !== 'ALL' || filter.startDate || filter.endDate) && (
        <div className="applied-filters">
          <h4>🔍 Filtros Aplicados:</h4>
          <div className="filter-tags">
            {selectedStatus && (
              <span className="filter-tag">
                Status: {creditService.getPurchaseStatusText(selectedStatus)}
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

      {/* Aviso para Desenvolvimento */}
      {filteredPurchases.some(p => p.status === 'PENDING') && (
        <div className="dev-notice">
          <div className="notice-content">
            <span className="notice-icon">🔧</span>
            <div className="notice-text">
              <strong>Modo Desenvolvimento:</strong> Use os botões "Confirmar" e "Falhar" 
              para simular o processamento de pagamentos pendentes.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditPurchases;
