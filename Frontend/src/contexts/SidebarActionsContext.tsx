import React, { createContext, useContext, useState } from 'react';

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

export const SidebarActionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewerActions, setViewerActions] = useState<SidebarContextType['viewerActions']>(null);

  return (
    <SidebarContext.Provider value={{ viewerActions, setViewerActions }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarActions = () => useContext(SidebarContext);
