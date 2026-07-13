import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { CreditProvider } from '@/contexts/CreditContext';
import { FileProvider } from '@/contexts/FileContext';
import { OperationProvider } from '@/contexts/OperationContext';
import { SidebarActionsProvider, useSidebarActions } from '@/contexts/SidebarActionsContext';

const NavbarShell = React.lazy(() => import('@/components/Navbar'));
const SidebarShell = React.lazy(() => import('@/components/Sidebar'));
const CreditNotificationShell = React.lazy(() => import('@/components/CreditNotification'));

const AuthenticatedAppChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { viewerActions } = useSidebarActions();
  const location = useLocation();
  const isViewerDocument = location.pathname.startsWith('/viewer-document');
  const isCadEditor = location.pathname.startsWith('/cad-editor');

  return (
    <div className={isCadEditor ? 'app-layout app-layout--fullscreen' : 'app-layout'}>
      {!isCadEditor && (
        <Suspense fallback={null}>
          <NavbarShell />
        </Suspense>
      )}
      <div className={isCadEditor ? 'app-content app-content--fullscreen' : 'app-content'}>
        {!isCadEditor && (
          <Suspense fallback={null}>
            <SidebarShell viewerActions={viewerActions || undefined} />
          </Suspense>
        )}
        <main className={isCadEditor ? 'main-content main-content--fullscreen' : (isViewerDocument ? 'main-content main-content--document' : 'main-content')}>
          {children}
        </main>
      </div>
      {!isCadEditor && (
        <Suspense fallback={null}>
          <CreditNotificationShell />
        </Suspense>
      )}
    </div>
  );
};

const AuthenticatedAppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SidebarActionsProvider>
    <ConfigProvider>
      <OperationProvider>
        <FileProvider>
          <CreditProvider>
            <AuthenticatedAppChrome>{children}</AuthenticatedAppChrome>
          </CreditProvider>
        </FileProvider>
      </OperationProvider>
    </ConfigProvider>
  </SidebarActionsProvider>
);

export default AuthenticatedAppShell;
