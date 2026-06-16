import React, { useState } from 'react';
import { CreditProvider } from '../../contexts/CreditContext';
import CreditDashboard from './CreditDashboard';
import CreditBalance from './CreditBalance';
import CreditPurchaseForm from './CreditPurchaseForm';
import CreditTransactions from './CreditTransactions';
import CreditValidation from '../CreditValidation';
import CreditNotification from '../CreditNotification';
import LoadingSpinner from './LoadingSpinner';

/**
 * Componente de teste para o sistema financeiro
 * Este componente permite testar todos os componentes financeiros isoladamente
 */
const FinancialTest: React.FC = () => {
  const [activeTest, setActiveTest] = useState<string>('dashboard');
  const [testCredits, setTestCredits] = useState(25);
  const noop = () => {};

  const tests = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'balance', name: 'Saldo', icon: '💰' },
    { id: 'purchase', name: 'Compra', icon: '🛒' },
    { id: 'transactions', name: 'Transações', icon: '📋' },
    { id: 'validation', name: 'Validação', icon: '✅' },
    { id: 'notification', name: 'Notificação', icon: '🔔' },
    { id: 'loading', name: 'Loading', icon: '⏳' }
  ];

  const renderTestComponent = () => {
    switch (activeTest) {
      case 'dashboard':
        return <CreditDashboard />;
      
      case 'balance':
        return (
          <CreditBalance
            balance={{
              userId: 'test-user',
              totalCredits: testCredits,
              lastUpdated: new Date().toISOString()
            }}
            onRefresh={noop}
            loading={false}
          />
        );
      
      case 'purchase':
        return (
          <CreditPurchaseForm
            currentBalance={testCredits}
            onPurchaseComplete={noop}
          />
        );
      
      case 'transactions':
        return (
          <CreditTransactions
            transactions={[
              {
                id: '1',
                type: 'PURCHASE',
                amount: 50,
                description: 'Compra de créditos - Pacote Profissional',
                createdAt: new Date().toISOString()
              },
              {
                id: '2',
                type: 'USE',
                amount: 5,
                description: 'Geração de memorial - Lote 123',
                createdAt: new Date(Date.now() - 86400000).toISOString()
              }
            ]}
            onRefresh={noop}
            loading={false}
          />
        );
      
      case 'validation':
        return (
          <div style={{ padding: '2rem' }}>
            <h3>Teste de Validação de Créditos</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label>
                Créditos necessários: 
                <input 
                  type="number" 
                  value={10} 
                  style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
                />
              </label>
            </div>
            <CreditValidation
              requiredCredits={10}
              lotCount={2}
              onValidationChange={noop}
              showDetails={true}
            />
          </div>
        );
      
      case 'notification':
        return (
          <div style={{ padding: '2rem', position: 'relative', height: '400px' }}>
            <h3>Teste de Notificações</h3>
            <p>As notificações aparecerão no canto superior direito.</p>
            <CreditNotification position="top-right" />
          </div>
        );
      
      case 'loading':
        return (
          <div style={{ padding: '2rem' }}>
            <h3>Teste de Loading Spinners</h3>
            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <h4>Small</h4>
                <LoadingSpinner size="small" message="Carregando..." />
              </div>
              <div>
                <h4>Medium</h4>
                <LoadingSpinner size="medium" message="Processando..." />
              </div>
              <div>
                <h4>Large</h4>
                <LoadingSpinner size="large" message="Aguarde..." />
              </div>
            </div>
          </div>
        );
      
      default:
        return <div>Teste não encontrado</div>;
    }
  };

  return (
    <CreditProvider>
      <div className="financial-test">
        <div className="test-header">
          <h1>🧪 Teste do Sistema Financeiro</h1>
          <div className="test-controls">
            <label>
              Créditos de teste: 
              <input 
                type="number" 
                value={testCredits}
                onChange={(e) => setTestCredits(Number(e.target.value))}
                style={{ marginLeft: '0.5rem', padding: '0.25rem', width: '80px' }}
              />
            </label>
          </div>
        </div>

        <div className="test-navigation">
          {tests.map((test) => (
            <button
              key={test.id}
              onClick={() => setActiveTest(test.id)}
              className={`test-tab ${activeTest === test.id ? 'active' : ''}`}
            >
              <span className="test-icon">{test.icon}</span>
              <span className="test-name">{test.name}</span>
            </button>
          ))}
        </div>

        <div className="test-content">
          {renderTestComponent()}
        </div>

        <style>{`
          .financial-test {
            min-height: 100vh;
            background: #f8fafc;
            padding: 1rem;
          }

          .test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .test-header h1 {
            margin: 0;
            color: #2563eb;
          }

          .test-controls label {
            font-weight: 600;
            color: #374151;
          }

          .test-navigation {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 2rem;
            padding: 0.5rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow-x: auto;
          }

          .test-tab {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
            border: none;
            background: transparent;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            font-weight: 500;
            color: #6b7280;
          }

          .test-tab:hover {
            background: #f3f4f6;
            color: #374151;
          }

          .test-tab.active {
            background: #2563eb;
            color: white;
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
          }

          .test-icon {
            font-size: 1.2rem;
          }

          .test-name {
            font-size: 0.9rem;
          }

          .test-content {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            min-height: 500px;
            overflow: hidden;
          }

          @media (max-width: 768px) {
            .test-header {
              flex-direction: column;
              gap: 1rem;
              text-align: center;
            }

            .test-navigation {
              flex-wrap: wrap;
            }

            .test-tab {
              flex: 1;
              min-width: 120px;
            }
          }
        `}</style>
      </div>
    </CreditProvider>
  );
};

export default FinancialTest;
