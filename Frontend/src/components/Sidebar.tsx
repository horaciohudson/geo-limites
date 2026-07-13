import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useFileContext } from '@/contexts/FileContext';
import { useOperationContext } from '@/contexts/OperationContext';
import { useAuth } from '@/auth/AuthContext';
import { useTenantOperationalAccess } from '@/hooks/useTenantOperationalAccess';
import styles from '../styles/Sidebar.module.css';

interface StoredPropertySelection {
  id?: string;
  propertyId?: string;
  name?: string;
  registrationNumber?: string;
  dxfFiles?: Array<{
    id?: string;
    originalName?: string;
    fileName?: string;
    primaryForProperty?: boolean;
  }>;
}

interface ViewerActions {
  onGenerateMemorial?: () => void;
  hasDxfData?: boolean;
  isGeneratingMemorial?: boolean;
  currentFileId?: string;
}

interface SidebarProps {
  viewerActions?: ViewerActions;
}

const Sidebar: React.FC<SidebarProps> = ({ viewerActions: _viewerActions }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedFiles } = useFileContext();
  const { selectedProperty } = useOperationContext();
  const { user, logout } = useAuth();
  const { isRestricted, restrictionMessage } = useTenantOperationalAccess();
  const canAccessAdmin = user?.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN') ?? false;

  const getStoredLinkedDxfCount = (): number => {
    try {
      const parsed = selectedProperty as StoredPropertySelection | null;
      return Array.isArray(parsed?.dxfFiles) ? parsed!.dxfFiles!.filter((file) => file?.id).length : 0;
    } catch {
      return 0;
    }
  };

  const handleViewFile = () => {
    navigate('/memorial');
  };

  const handleOpenCadEditor = () => {
    navigate('/cad-editor');
  };

  const isViewerActive = location.pathname === '/memorial';
  const isCadEditorActive = location.pathname === '/cad-editor';

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.sidebarNav}>
        <div className={styles.sidebarActions}>
          <div className={styles.sidebarSectionTitle}>Operacao</div>
          <ul className={styles.sidebarMenu}>
            <li>
              <button
                className={`${styles.sidebarActionBtn} ${isCadEditorActive ? styles.active : ''}`}
                onClick={handleOpenCadEditor}
                title="Abrir o Editor CAD"
              >
                <span className={styles.sidebarIcon}>✏️</span>
                <span className={styles.sidebarLabel}>Editor CAD</span>
              </button>
            </li>

            <li>
              <NavLink
                to="/properties"
                end
                className={({ isActive }) =>
                  `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.sidebarIcon}>🏠</span>
                <span className={styles.sidebarLabel}>Imoveis</span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/standards"
                className={({ isActive }) =>
                  `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.sidebarIcon}>📋</span>
                <span className={styles.sidebarLabel}>Configurar Memorial</span>
              </NavLink>
            </li>

            <li>
              <button
                className={`${styles.sidebarActionBtn} ${isViewerActive ? styles.active : ''}`}
                onClick={handleViewFile}
                title="Abrir Memorial"
              >
                <span className={styles.sidebarIcon}>👁️</span>
                <span className={styles.sidebarLabel}>
                  Memorial
                  {selectedFiles.length === 0 && getStoredLinkedDxfCount() > 0 && (
                    <span className={styles.sidebarCountBadge}>
                      {getStoredLinkedDxfCount()}
                    </span>
                  )}
                </span>
              </button>
            </li>
          </ul>
        </div>

        <div className={styles.sidebarActions}>
          <div className={styles.sidebarSectionTitle}>Preparacao</div>
          <ul className={styles.sidebarMenu}>
            <li>
              {isRestricted ? (
                <button
                  type="button"
                  className={styles.sidebarActionBtn}
                  disabled
                  title={restrictionMessage}
                >
                  <span className={styles.sidebarIcon}>➕</span>
                  <span className={styles.sidebarLabel}>Cadastrar Imovel</span>
                </button>
              ) : (
                <NavLink
                  to="/properties/cadastro"
                  className={({ isActive }) =>
                    `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                  }
                >
                  <span className={styles.sidebarIcon}>➕</span>
                  <span className={styles.sidebarLabel}>Cadastrar Imovel</span>
                </NavLink>
              )}
            </li>



          </ul>
        </div>

        <div className={styles.sidebarActions}>
          <div className={styles.sidebarSectionTitle}>Configuracao</div>
          <ul className={styles.sidebarMenu}>
            <li>
              <NavLink
                to="/manage-standards"
                className={({ isActive }) =>
                  `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.sidebarIcon}>⚙️</span>
                <span className={styles.sidebarLabel}>Normas e Exemplos</span>
              </NavLink>
            </li>
          </ul>
        </div>

        {/* MINHA CONTA - Para todos os usuários */}
        <div className={styles.sidebarActions}>
          <div className={styles.sidebarSectionTitle}>👤 Conta e Acesso</div>
          <ul className={styles.sidebarMenu}>
            <li>
              <NavLink
                to="/my-account"
                className={({ isActive }) =>
                  `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.sidebarIcon}>👤</span>
                <span className={styles.sidebarLabel}>Conta</span>
              </NavLink>
            </li>
            <li>
              {canAccessAdmin ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                  }
                >
                  <span className={styles.sidebarIcon}>🛠️</span>
                  <span className={styles.sidebarLabel}>Administracao</span>
                </NavLink>
              ) : (
                <button
                  type="button"
                  className={styles.sidebarActionBtn}
                  disabled
                  title="Disponivel apenas para operador administrador"
                >
                  <span className={styles.sidebarIcon}>🛠️</span>
                  <span className={styles.sidebarLabel}>Administracao</span>
                </button>
              )}
            </li>
            <li>
              <button
                type="button"
                className={styles.sidebarActionBtn}
                onClick={() => logout()}
                title="Encerrar sessao"
              >
                <span className={styles.sidebarIcon}>🚪</span>
                <span className={styles.sidebarLabel}>Sair</span>
              </button>
            </li>
          </ul>
        </div>

      </nav>
    </aside>
  );
};

export default Sidebar;
