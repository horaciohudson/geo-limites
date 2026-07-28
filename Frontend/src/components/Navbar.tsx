import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useLocation } from 'react-router-dom';
import { getHelpUrlForPath } from '@/utils/helpLinks';
import { desktopApi } from '@/services/desktopApi';
import { DESKTOP_SETUP_DOWNLOAD_URL } from '@/utils/desktopRelease';

const Navbar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const runtimeModeLabel = desktopApi.hasBridge() ? 'Modo Desktop' : 'Modo Web';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>GeoLimites Memorial</h1>
        </div>
        
        <div className="navbar-menu">
          <div className={`navbar-runtime-badge ${desktopApi.hasBridge() ? 'is-desktop' : 'is-web'}`}>
            {runtimeModeLabel}
          </div>
          {!desktopApi.hasBridge() && (
            <a
              className="desktop-download-btn"
              href={DESKTOP_SETUP_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Baixar o instalador do GeoLimites Desktop"
            >
              Baixar Instalador
            </a>
          )}
          {user && (
            <div className="navbar-user">
              <span className="user-name">
                Usuario: {user.fullName || 'Nao informado'}
              </span>
            </div>
          )}
          <a
            className="help-link-btn"
            href={getHelpUrlForPath(location.pathname)}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir manual do sistema"
          >
            Ajuda
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
