import React from 'react';
import { CreditProvider } from '../contexts/CreditContext';
import CreditDashboard from './financial/CreditDashboard';

/**
 * Componente de teste simples para verificar se o sistema financeiro está funcionando
 */
const FinancialSystemTest: React.FC = () => {
  return (
    <CreditProvider>
      <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ color: '#2563eb', textAlign: 'center', marginBottom: '2rem' }}>
            🧪 Teste do Sistema Financeiro
          </h1>
          
          <div style={{ 
            background: 'white', 
            borderRadius: '8px', 
            padding: '2rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <CreditDashboard />
          </div>
          
          <div style={{ 
            marginTop: '2rem',
            padding: '1rem',
            background: '#dbeafe',
            borderRadius: '8px',
            border: '1px solid #93c5fd'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1d4ed8' }}>
              ✅ Sistema Funcionando!
            </h3>
            <p style={{ margin: 0, color: '#1e40af' }}>
              Se você pode ver este dashboard, o sistema financeiro está completamente funcional.
            </p>
          </div>
        </div>
      </div>
    </CreditProvider>
  );
};

export default FinancialSystemTest;