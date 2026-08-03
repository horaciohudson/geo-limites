import React, { useState } from 'react';
import UserAreaXConta from './UserAreaXConta';
import UserAreaXPerfil from './UserAreaXPerfil';
import UserAreaXOperacoes from './UserAreaXOperacoes';
import UserAreaXCriarUsuario from './UserAreaXCriarUsuario';
import { useAuth } from '@/auth/AuthContext';
import { canManageTenantUsers } from '@/utils/roles';
import '../styles/MyAccount.css';

const UserAreaX: React.FC = () => {
  const { user } = useAuth();
  const canShowCreateUserTab = canManageTenantUsers(user);
  const [activeMainTab, setActiveMainTab] = useState<'conta' | 'perfil' | 'operacoes' | 'usuarios'>('conta');

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
          {canShowCreateUserTab && (
            <button
              className={`account-main-tab ${activeMainTab === 'usuarios' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('usuarios')}
            >
              Equipe
            </button>
          )}
        </div>
      </div>

      <div className="account-content" style={{ minHeight: '400px', padding: 0 }}>
        {activeMainTab === 'conta' && <UserAreaXConta />}
        {activeMainTab === 'perfil' && <UserAreaXPerfil />}
        {activeMainTab === 'operacoes' && <UserAreaXOperacoes />}
        {activeMainTab === 'usuarios' && <UserAreaXCriarUsuario />}
      </div>
    </div>
  );
};

export default UserAreaX;
