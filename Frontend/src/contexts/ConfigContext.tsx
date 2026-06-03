// src/contexts/ConfigContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ConfigContextType {
  templatesFolder: string | null;
  setTemplatesFolder: (folder: string) => void;
  isTemplatesFolderConfigured: boolean;
  clearTemplatesFolder: () => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const CONFIG_KEYS = {
  TEMPLATES_FOLDER: 'memorialPro_templatesFolder'
} as const;

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [templatesFolder, setTemplatesFolderState] = useState<string | null>(null);

  // Carrega configuração da pasta de templates do localStorage na inicialização
  useEffect(() => {
    try {
      const savedFolder = localStorage.getItem(CONFIG_KEYS.TEMPLATES_FOLDER);

      if (savedFolder) {
        setTemplatesFolderState(savedFolder);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configuração de pasta de templates:', error);
    }
  }, []);

  const setTemplatesFolder = (folder: string) => {
    try {
      // Manter o caminho original sem normalização para preservar o formato do Windows
      const cleanFolder = folder.trim();
      
      setTemplatesFolderState(cleanFolder);
      localStorage.setItem(CONFIG_KEYS.TEMPLATES_FOLDER, cleanFolder);
    } catch (error) {
      console.error('❌ Erro ao salvar configuração de pasta de templates:', error);
      throw new Error('Erro ao salvar configuração da pasta de templates');
    }
  };

  const clearTemplatesFolder = () => {
    try {
      setTemplatesFolderState(null);
      localStorage.removeItem(CONFIG_KEYS.TEMPLATES_FOLDER);
    } catch (error) {
      console.error('❌ Erro ao limpar configuração de pasta de templates:', error);
    }
  };

  const isTemplatesFolderConfigured = templatesFolder !== null && templatesFolder.trim() !== '';

  return (
    <ConfigContext.Provider value={{
      templatesFolder,
      setTemplatesFolder,
      isTemplatesFolderConfigured,
      clearTemplatesFolder
    }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig deve ser usado dentro de ConfigProvider');
  }
  return context;
};
