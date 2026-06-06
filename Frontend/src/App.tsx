import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { CreditProvider } from './contexts/CreditContext';
import PrivateRoute from '@/routes/PrivateRoute';
import { Navbar, Sidebar } from '@/components';
import CreditNotification from './components/CreditNotification';
import { Login, Register, VerifyEmail, ResendVerification, Files, Viewer, Report, MemorialStandards, Memorial, ManageStandards, ConfigureTemplates, PropertyRegister, MyAccount, AdminSettings } from '@/pages';
import UploadExample from '@/pages/UploadExample';
import TestViewer from '@/pages/TestViewer';
import { useAuth } from '@/auth/AuthContext';
import { TOKEN_STORAGE_KEY } from '@/auth/session';
import { FileProvider } from '@/contexts/FileContext'; // ✅ Import do novo contexto
import { ConfigProvider } from '@/contexts/ConfigContext'; // ✅ Import do contexto de configuração
import { openHelpPage } from '@/utils/helpLinks';
import './styles/App.css';

// Context para ações do Sidebar
interface SidebarContextType {
  viewerActions: {
    onDownload?: () => void;
    onGenerateMemorial?: () => void;
    onDownloadMemorial?: () => void;
    onBack?: () => void;
    isGeneratingMemorial?: boolean;
    hasMemorial?: boolean;
    hasDxfData?: boolean;
    currentFileId?: string;
  } | null;
  setViewerActions: (actions: SidebarContextType['viewerActions']) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  viewerActions: null,
  setViewerActions: () => {}
});

export const useSidebarActions = () => useContext(SidebarContext);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [viewerActions, setViewerActions] = useState<SidebarContextType['viewerActions']>(null);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SidebarContext.Provider value={{ viewerActions, setViewerActions }}>
      {/* ✅ Envolve tudo no ConfigProvider, FileProvider e CreditProvider */}
      <ConfigProvider>
        <FileProvider>
          <CreditProvider>
          <div className="app-layout">
            <Navbar />
            <div className="app-content">
              <Sidebar viewerActions={viewerActions || undefined} />
              <main className="main-content">{children}</main>
            </div>
            <CreditNotification />
          </div>
          </CreditProvider>
        </FileProvider>
      </ConfigProvider>
    </SidebarContext.Provider>
  );
};

const App: React.FC = () => {
  // Função para limpar dados do localStorage (exceto token e dados essenciais)
  const clearAppData = () => {
    try {
      // Lista de chaves que devem ser mantidas (tokens + dados de sessão importantes)
      const keysToKeep = [
        TOKEN_STORAGE_KEY,
        'selectedFiles', 'selectedMemorialNorms', 'selectedTemplate', 'createdTemplates',
        'memorialPro_templatesFolder' // ✅ Manter configuração de pasta de templates
      ];
      
      // Padrões de chaves que devem ser mantidas
      const patternsToKeep = [
        'incomplete_property_', // ✅ Manter cadastros de propriedades incompletos
        'property_',            // ✅ Manter dados de propriedades
      ];
      
      // Obter todas as chaves do localStorage
      const allKeys = Object.keys(localStorage);
      
      // Remover apenas chaves temporárias/cache, mantendo dados de sessão
      const removedKeys: string[] = [];
      const keptKeys: string[] = [];
      
      allKeys.forEach(key => {
        const shouldKeep = keysToKeep.includes(key) || 
                          patternsToKeep.some(pattern => key.startsWith(pattern));
        
        if (!shouldKeep) {
          localStorage.removeItem(key);
          removedKeys.push(key);
        } else {
          keptKeys.push(key);
        }
      });
      
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  };

  // Configurar limpeza apenas no fechamento real da aplicação
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Limpar apenas no fechamento real da aba/navegador
      clearAppData();
    };

    // Adicionar listener para beforeunload (fechamento da aba/navegador)
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup quando o componente for desmontado
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // NÃO limpar dados no desmonte do componente durante navegação normal
    };
  }, []);

  useEffect(() => {
    const handleHelpShortcut = (event: KeyboardEvent) => {
      if (event.key !== 'F1') {
        return;
      }

      event.preventDefault();
      openHelpPage(window.location.pathname);
    };

    window.addEventListener('keydown', handleHelpShortcut);

    return () => {
      window.removeEventListener('keydown', handleHelpShortcut);
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/resend-verification" element={<ResendVerification />} />

            {/* Rotas protegidas */}
            <Route
              path="/properties"
              element={
                <PrivateRoute>
                  <PropertyRegister />
                </PrivateRoute>
              }
            />
            <Route
              path="/files"
              element={
                <PrivateRoute>
                  <Files />
                </PrivateRoute>
              }
            />
            <Route
              path="/viewer"
              element={
                <PrivateRoute>
                  <Viewer />
                </PrivateRoute>
              }
            />
            <Route
              path="/test-viewer"
              element={
                <PrivateRoute>
                  <TestViewer />
                </PrivateRoute>
              }
            />
            <Route
              path="/report"
              element={
                <PrivateRoute>
                  <Report />
                </PrivateRoute>
              }
            />
            <Route
              path="/standards"
              element={
                <PrivateRoute>
                  <MemorialStandards />
                </PrivateRoute>
              }
            />
            <Route
              path="/memorial"
              element={
                <PrivateRoute>
                  <Memorial />
                </PrivateRoute>
              }
            />
            <Route
              path="/manage-standards"
              element={
                <PrivateRoute>
                  <ManageStandards />
                </PrivateRoute>
              }
            />
            <Route
              path="/configure-templates"
              element={
                <PrivateRoute>
                  <ConfigureTemplates />
                </PrivateRoute>
              }
            />
            <Route
              path="/upload-example"
              element={
                <PrivateRoute>
                  <UploadExample />
                </PrivateRoute>
              }
            />
            <Route
              path="/my-account"
              element={
                <PrivateRoute>
                  <MyAccount />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <AdminSettings />
                </PrivateRoute>
              }
            />
            {/* Rota de compatibilidade - redirecionar /financial para /my-account */}
            <Route
              path="/financial"
              element={<Navigate to="/my-account" replace />}
            />

            {/* Redirecionamentos */}
            <Route path="/" element={<Navigate to="/properties" replace />} />
            <Route path="*" element={<Navigate to="/properties" replace />} />
          </Routes>
        </AppLayout>
      </Router>
    </AuthProvider>
  );
};

export default App;
