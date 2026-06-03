import React from 'react';
import { useAuth } from '@/auth/AuthContext';

const Navbar: React.FC = () => {
  const { user } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>GeoLimites Memorial</h1>
        </div>
        
        <div className="navbar-menu">
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
