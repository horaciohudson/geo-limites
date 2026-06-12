import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useFileContext } from '@/contexts/FileContext';
import { useAuth } from '@/auth/AuthContext';
import { useTenantOperationalAccess } from '@/hooks/useTenantOperationalAccess';
import styles from '../styles/Sidebar.module.css';

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
  const { user, logout } = useAuth();
  const { isRestricted, restrictionMessage } = useTenantOperationalAccess();
  const canAccessAdmin = user?.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN') ?? false;

  const handleViewFile = () => {
    if (selectedFiles.length > 1) {
      // Múltiplos arquivos selecionados - navegar com IDs múltiplos
      const fileIds = selectedFiles.map(f => f.id).join(',');
      navigate(`/viewer?fileIds=${fileIds}`);
    } else if (selectedFiles.length === 1) {
      // Um arquivo selecionado
      navigate(`/viewer?fileId=${selectedFiles[0].id}`);
    } else {
      alert('Selecione um ou mais arquivos na lista antes de visualizar.');
    }
  };

  const isViewerActive = location.pathname === '/viewer';

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.sidebarNav}>
        <div className={styles.sidebarActions}>
          <div className={styles.sidebarSectionHeader}>
            <span className={styles.sidebarSectionHeaderTitle}>Operacao</span>
          </div>
          <ul className={styles.sidebarMenu}>
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
                <span className={styles.sidebarLabel}>Normas do Memorial</span>
              </NavLink>
            </li>

            <li>
              {isRestricted ? (
                <button
                  type="button"
                  className={styles.sidebarActionBtn}
                  disabled
                  title={restrictionMessage}
                >
                  <span className={styles.sidebarIcon}>📁</span>
                  <span className={styles.sidebarLabel}>Arquivos DXF</span>
                </button>
              ) : (
                <NavLink
                  to="/files"
                  className={({ isActive }) =>
                    `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                  }
                >
                  <span className={styles.sidebarIcon}>📁</span>
                  <span className={styles.sidebarLabel}>
                    Arquivos DXF
                    {selectedFiles.length > 0 && (
                      <span className={styles.sidebarCountBadge}>
                        {selectedFiles.length}
                      </span>
                    )}
                  </span>
                </NavLink>
              )}
            </li>

            <li>
              <button
                className={`${styles.sidebarActionBtn} ${isViewerActive ? styles.active : ''}`}
                onClick={handleViewFile}
                title="Visualizar arquivo selecionado"
              >
                <span className={styles.sidebarIcon}>👁️</span>
                <span className={styles.sidebarLabel}>Visualizador</span>
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
                <span className={styles.sidebarLabel}>Normas e Templates Base</span>
              </NavLink>
            </li>



            <li>
              <NavLink
                to="/configure-templates"
                className={({ isActive }) =>
                  `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.sidebarIcon}>📁</span>
                <span className={styles.sidebarLabel}>Pasta de Templates</span>
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
