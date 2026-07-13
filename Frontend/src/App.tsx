import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import PrivateRoute from '@/routes/PrivateRoute';
import { useAuth } from '@/auth/AuthContext';
import { TOKEN_STORAGE_KEY } from '@/auth/session';
import { desktopApi } from '@/services/desktopApi';
import { openHelpPage } from '@/utils/helpLinks';
import { LAST_DESKTOP_FILE_DIALOG_DIRECTORY_STORAGE_KEY } from '@/utils/desktopFileDialogState';
import './styles/App.css';

const LoginPage = React.lazy(() => import('@/pages/Login'));
const RegisterPage = React.lazy(() => import('@/pages/Register'));
const VerifyEmailPage = React.lazy(() => import('@/pages/VerifyEmail'));
const ResendVerificationPage = React.lazy(() => import('@/pages/ResendVerification'));
const CadEditorPage = React.lazy(() => import('@/graphics-engine/adapters/geolimites/GeoLimitesCadEditor'));
const ViewerPage = React.lazy(() => import('@/pages/Viewer'));
const ViewerDocumentPage = React.lazy(() => import('@/pages/ViewerDocument'));
const TestViewerPage = React.lazy(() => import('@/pages/TestViewer'));
const ReportPage = React.lazy(() => import('@/pages/Report'));
const MemorialStandardsPage = React.lazy(() => import('@/pages/MemorialStandards'));
const MemorialPage = React.lazy(() => import('@/pages/Memorial'));
const ConfigureTemplatesPage = React.lazy(() => import('@/pages/ConfigureTemplates'));
const PropertyRegisterPage = React.lazy(() => import('@/pages/PropertyRegister'));
const PropertiesPresentationPage = React.lazy(() => import('@/pages/PropertiesPresentation'));
const MyAccountPage = React.lazy(() => import('@/pages/MyAccount'));
const AdminSettingsPage = React.lazy(() => import('@/pages/AdminSettings'));
const AuthenticatedAppShell = React.lazy(() => import('@/layouts/AuthenticatedAppShell'));

const RouteFallback: React.FC<{ label?: string }> = ({ label = 'Carregando pagina...' }) => (
  <div className="page-loading-state">{label}</div>
);

const RouterComponent = desktopApi.hasBridge() ? HashRouter : BrowserRouter;

const getCurrentAppPath = () => {
  if (!desktopApi.hasBridge()) {
    return window.location.pathname;
  }

  const normalizedHash = window.location.hash.replace(/^#/, '');
  if (!normalizedHash) {
    return '/';
  }

  const [pathSegment] = normalizedHash.split('?');
  return pathSegment.startsWith('/') ? pathSegment : `/${pathSegment}`;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={<RouteFallback label="Carregando ambiente..." />}>
      <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
    </Suspense>
  );
};

const App: React.FC = () => {
  // Função para limpar dados do localStorage (exceto token e dados essenciais)
  const clearAppData = () => {
    try {
      // Lista de chaves que devem ser mantidas (tokens + dados de sessão importantes)
      const keysToKeep = [
        TOKEN_STORAGE_KEY,
        'selectedFiles', 'selectedMemorialNorms', 'selectedTemplate', 'createdMemorialStandards',
        'selectedPropertyForMemorial',
        'selectedFilesByProperty',
        'selectedMemorialNormsByProperty', 'selectedTemplateByProperty', 'memorialSelectionDraftByProperty',
        'viewerSelectionState',
        'memorialPro_templatesFolder', // âœ… Manter configuraÃ§Ã£o de pasta de templates
        LAST_DESKTOP_FILE_DIALOG_DIRECTORY_STORAGE_KEY
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
      if (getCurrentAppPath().startsWith('/viewer-document')) {
        return;
      }
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
      const isF1 = event.key === 'F1' || event.code === 'F1' || event.keyCode === 112
      const isHelpShortcut = isF1 && event.shiftKey
      if (!isHelpShortcut) {
        return;
      }

      if (event.repeat) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if ('stopImmediatePropagation' in event) {
        event.stopImmediatePropagation();
      }
      openHelpPage(getCurrentAppPath());
    };

    window.addEventListener('keydown', handleHelpShortcut, true);

    return () => {
      window.removeEventListener('keydown', handleHelpShortcut, true);
    };
  }, []);

  return (
    <AuthProvider>
      <RouterComponent>
        <AppLayout>
          <Routes>
            {/* Rotas públicas */}
            <Route
              path="/login"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <LoginPage />
                </Suspense>
              }
            />
            <Route
              path="/register"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <RegisterPage />
                </Suspense>
              }
            />
            <Route
              path="/verify-email"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <VerifyEmailPage />
                </Suspense>
              }
            />
            <Route
              path="/resend-verification"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <ResendVerificationPage />
                </Suspense>
              }
            />

            {/* Rotas protegidas */}
            <Route
              path="/properties"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <PropertiesPresentationPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/properties/cadastro"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <PropertyRegisterPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/files"
              element={
                <PrivateRoute>
                  <Navigate to="/cad-editor" replace />
                </PrivateRoute>
              }
            />
            <Route
              path="/viewer"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <ViewerPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/viewer-document"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <ViewerDocumentPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/cad-editor"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback label="Carregando editor..." />}>
                    <CadEditorPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/test-viewer"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <TestViewerPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/report"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <ReportPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/standards"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <MemorialStandardsPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/memorial"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <MemorialPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/manage-standards"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <ConfigureTemplatesPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/configure-templates"
              element={
                <PrivateRoute>
                  <Navigate to="/manage-standards" replace />
                </PrivateRoute>
              }
            />
            <Route
              path="/my-account"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <MyAccountPage />
                  </Suspense>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <AdminSettingsPage />
                  </Suspense>
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
      </RouterComponent>
    </AuthProvider>
  );
};

export default App;
