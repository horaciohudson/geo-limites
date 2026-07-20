import React, { useState } from 'react';
import UserAreaXConta from './UserAreaXConta';
import UserAreaXPerfil from './UserAreaXPerfil';
import UserAreaXOperacoes from './UserAreaXOperacoes';
import '../styles/MyAccount.css';

const UserAreaX: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'conta' | 'perfil' | 'operacoes'>('conta');

  return (
    <div className="account-container" style={{ padding: '2rem' }}>
      
      {/* Nome ÁREA DO USUÁRIO acima das abas */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: 0, textTransform: 'uppercase' }}>
          ÁREA DO USUÁRIO
        </h1>
      </div>

      <div className="account-tabs account-tabs-x">
        <div className="account-main-tabs">
          <button
            className={`account-main-tab ${activeMainTab === 'conta' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('conta')}
          >
            Conta
          </button>
          <button
            className={`account-main-tab ${activeMainTab === 'perfil' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('perfil')}
          >
            Perfil
          </button>
          <button
            className={`account-main-tab ${activeMainTab === 'operacoes' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('operacoes')}
          >
            Operações
          </button>
        </div>
      </div>

      <div className="account-content" style={{ minHeight: '400px', padding: 0 }}>
        {activeMainTab === 'conta' && <UserAreaXConta />}
        {activeMainTab === 'perfil' && <UserAreaXPerfil />}
        {activeMainTab === 'operacoes' && <UserAreaXOperacoes />}
      </div>
    </div>
  );
};

export default UserAreaX;

