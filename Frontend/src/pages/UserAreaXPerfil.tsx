import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import UserProfile from '../components/account/UserProfile';

const UserAreaXPerfil: React.FC = () => {
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDataUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="account-content" style={{ padding: '2rem', minHeight: '400px' }}>
      <div className="account-section-intro">
        <div>
          <span className="account-section-eyebrow">Cadastro</span>
          <h2>Perfil</h2>
        </div>
        <span className="account-section-badge">Aba de Perfil</span>
      </div>
      <div className="tab-content" key={refreshTrigger}>
        <UserProfile user={user} onUpdate={handleDataUpdate} />
      </div>
    </div>
  );
};

export default UserAreaXPerfil;
