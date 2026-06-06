import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useLocation } from 'react-router-dom';
import { openHelpPage } from '@/utils/helpLinks';

const Navbar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>GeoLimites Memorial</h1>
        </div>
        
        <div className="navbar-menu">
          <button
            type="button"
            className="help-link-btn"
            onClick={() => openHelpPage(location.pathname)}
            title="Abrir manual do sistema"
          >
            Ajuda
          </button>
          {user && (
            <div className="navbar-user">
              <span className="user-name">
                Usuario: {user.fullName || 'Nao informado'}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
