import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useFileContext } from '@/contexts/FileContext';
import { useAuth } from '@/auth/AuthContext';
import { getStoredToken } from '@/auth/session';
import type { DXFEntity } from '@/utils/dxfParser';
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

interface ParsedNormSelection {
  id?: string;
}

interface ParsedDxfResponse {
  entities?: DXFEntity[];
}

const Sidebar: React.FC<SidebarProps> = ({ viewerActions }) => {
  const navigate = useNavigate();
  const { selectedFiles, getDXFData } = useFileContext();
  const { user, logout } = useAuth();
  const canAccessAdmin = user?.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN') ?? false;
  
  // Estados para validação do memorial
  const [hasSelectedNorms, setHasSelectedNorms] = useState(false);
  const [hasSelectedTemplate, setHasSelectedTemplate] = useState(false);

  // Verifica se há normas selecionadas no localStorage
  useEffect(() => {
    const checkSelectedNorms = () => {
      try {
        const savedNorms = localStorage.getItem('selectedMemorialNorms');
        if (savedNorms) {
          const norms = JSON.parse(savedNorms) as ParsedNormSelection[];
          setHasSelectedNorms(norms.length > 0);
        } else {
          setHasSelectedNorms(false);
        }
      } catch (error) {
        console.error('Erro ao verificar normas selecionadas:', error);
        setHasSelectedNorms(false);
      }
    };

    checkSelectedNorms();
    // Verifica periodicamente se as normas mudaram
    const interval = setInterval(checkSelectedNorms, 2000); // Aumentado para 2s para evitar loops
    return () => clearInterval(interval);
  }, []);

  // Verifica se há template selecionado no localStorage
  useEffect(() => {
    const checkSelectedTemplate = () => {
      try {
        const savedTemplate = localStorage.getItem('selectedTemplate');
        setHasSelectedTemplate(!!savedTemplate);
      } catch (error) {
        console.error('Erro ao verificar template selecionado:', error);
        setHasSelectedTemplate(false);
      }
    };

    checkSelectedTemplate();
    // Verifica periodicamente se o template mudou
    const interval = setInterval(checkSelectedTemplate, 2000); // Aumentado para 2s para evitar loops
    return () => clearInterval(interval);
  }, []);

  // Função para validar se pode gerar memorial
  const canGenerateMemorial = () => {
    const hasFiles = selectedFiles.length > 0;
    // Verificar se há dados DXF: se estamos no viewer E há dados, ou se há arquivos selecionados
    const hasDxfData = (viewerActions?.hasDxfData) || (selectedFiles.length > 0);
    
    return hasFiles && hasDxfData && hasSelectedNorms && hasSelectedTemplate;
  };

  // Função para obter mensagem de validação
  const getValidationMessage = () => {
    if (selectedFiles.length === 0) {
      return 'Selecione pelo menos um arquivo DXF/DWG';
    }
    
    // Verificar dados DXF: aceitar se há arquivos selecionados OU se estamos no viewer com dados
    const hasDxfData = (viewerActions?.hasDxfData) || (selectedFiles.length > 0);
    if (!hasDxfData) {
      return 'Dados DXF não carregados. Acesse o visualizador primeiro.';
    }
    
    if (!hasSelectedNorms) {
      return 'Selecione pelo menos uma norma ABNT';
    }
    
    if (!hasSelectedTemplate) {
      return 'Selecione um template';
    }
    
    return '';
  };

  // Função para lidar com clique no botão gerar memorial
  const handleGenerateMemorial = async () => {
    // Verificar se está gerando memorial
    if (viewerActions?.isGeneratingMemorial) {
      alert('Memorial já está sendo gerado. Aguarde a conclusão.');
      return;
    }

    // Verificar todas as condições necessárias
    if (!canGenerateMemorial()) {
      const message = getValidationMessage();
      alert(`Não é possível gerar o memorial.\n\n${message}\n\nPor favor, complete os requisitos necessários antes de gerar o memorial.`);
      return;
    }

    // Se estamos no viewer e a função está disponível, usar ela
    if (viewerActions?.onGenerateMemorial) {
      viewerActions.onGenerateMemorial();
      return;
    }

    // Caso contrário, implementar geração independente
    await generateMemorialIndependent();
  };



  // Função para gerar memorial independente do viewer
  const generateMemorialIndependent = async () => {
    if (selectedFiles.length === 0) {
      alert('Nenhum arquivo selecionado para gerar memorial.');
      return;
    }

    try {
      // Obter normas e template selecionados
      // Coletar dados DXF de todos os arquivos selecionados
      const allDxfData: DXFEntity[] = [];
      
      for (const file of selectedFiles) {
        const contextData = getDXFData(file.id);
        if (contextData && contextData.dxfData) {
          allDxfData.push(...(contextData.dxfData.entities || []));
        } else {
          try {
            // Carregar dados DXF diretamente do servidor
            const response = await fetch(`/api/dxf/${file.id}/parse`, {
              headers: {
                'Authorization': `Bearer ${getStoredToken() || ''}`
              }
            });
            
            if (response.ok) {
              const dxfData = await response.json() as ParsedDxfResponse;
              allDxfData.push(...(dxfData.entities || []));
            } else {
              console.error('❌ Erro ao carregar DXF do servidor:', response.status);
            }
          } catch (error) {
            console.error('❌ Erro ao carregar dados DXF:', error);
          }
        }
      }

      if (allDxfData.length === 0) {
        alert('Nenhum dado DXF válido encontrado nos arquivos selecionados.\n\nTente uma das opções:\n1. Visualize os arquivos primeiro no Viewer\n2. Verifique se os arquivos são válidos\n3. Tente novamente em alguns segundos');
        return;
      }

      // Preparar dados para o memorial
      const fileNames = selectedFiles.map(f => f.originalName).join(', ');
      const projectName = fileNames.replace(/\.[^/.]+$/g, ''); // Remove extensões
      
      // Navegar para a página de memorial - ela vai carregar os dados DXF
      const params = new URLSearchParams({
        fileIds: selectedFiles.map(f => f.id).join(','),
        projectName: projectName,
        projectDescription: `Memorial descritivo gerado para: ${fileNames}`
      });

      navigate(`/memorial?${params.toString()}`);

    } catch (error) {
      console.error('❌ Erro ao gerar memorial:', error);
      alert('Erro ao gerar memorial. Tente novamente.');
    }
  };
  
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

  const canGenerateNow = canGenerateMemorial();

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.sidebarNav}>
        {/* CRIAR MEMORIAL */}
        <div className={styles.sidebarActions}>
          <div className={styles.sidebarSectionTitle}>📋 Fluxo Operacional</div>
          <ul className={styles.sidebarMenu}>
            <li>
              <NavLink
                to="/properties"
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
                to="/files"
                className={({ isActive }) =>
                  `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.sidebarIcon}>📁</span>
                <span className={styles.sidebarLabel}>
                  Arquivos Tecnicos
                  {selectedFiles.length > 0 && (
                    <span className={styles.sidebarCountBadge}>
                      {selectedFiles.length}
                    </span>
                  )}
                </span>
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
                <span className={styles.sidebarLabel}>Normas Aplicadas</span>
              </NavLink>
            </li>

            <li>
              <button
                className={styles.sidebarActionBtn}
                onClick={handleViewFile}
                title="Visualizar arquivo selecionado"
              >
                <span className={styles.sidebarIcon}>👁️</span>
                <span className={styles.sidebarLabel}>Visualizador</span>
              </button>
            </li>

            <li>
              <button
                className={`${styles.sidebarActionBtn} ${!canGenerateNow ? styles.sidebarActionBtnMuted : ''}`}
                onClick={handleGenerateMemorial}
                disabled={viewerActions?.isGeneratingMemorial}
                title="Gerar memorial descritivo automatizado"
              >
                <span className={styles.sidebarIcon}>✨</span>
                <span className={styles.sidebarLabel}>
                  {viewerActions?.isGeneratingMemorial ? 'Gerando...' : 'Gerar Memorial'}
                </span>
              </button>
            </li>

          </ul>
        </div>

        {/* CONFIGURAÇÕES */}
        <div className={styles.sidebarActions}>
          <div className={styles.sidebarSectionTitle}>⚙️ Preparacao Tecnica</div>
          <ul className={styles.sidebarMenu}>
            <li>
              <NavLink
                to="/manage-standards"
                className={({ isActive }) =>
                  `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.sidebarIcon}>⚙️</span>
                <span className={styles.sidebarLabel}>Normas Tecnicas</span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/upload-example"
                className={({ isActive }) =>
                  `${styles.sidebarActionBtn} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.sidebarIcon}>📤</span>
                <span className={styles.sidebarLabel}>Importacao de Exemplo</span>
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
                <span className={styles.sidebarLabel}>Templates</span>
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
