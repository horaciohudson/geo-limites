import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useLocation } from 'react-router-dom';
import { getHelpUrlForPath } from '@/utils/helpLinks';

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
          <a
            className="help-link-btn"
            href={getHelpUrlForPath(location.pathname)}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir manual do sistema"
          >
            Ajuda
          </a>
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
