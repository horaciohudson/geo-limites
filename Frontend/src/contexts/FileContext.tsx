// src/context/FileContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { FileMetadata } from '@/types/files';
import type { DXFData } from '@/utils/dxfParser';

// Estrutura para armazenar dados DXF em memória
interface DXFFileData {
  metadata: FileMetadata;
  dxfData: DXFData | null;
  content: string | null;
  isLoaded: boolean;
  loadedAt: Date;
}

interface FileContextType {
  selectedFiles: FileMetadata[];
  setSelectedFiles: (files: FileMetadata[]) => void;
  addToSelection: (file: FileMetadata) => void;
  removeFromSelection: (file: FileMetadata) => void;
  toggleFileSelection: (file: FileMetadata, ctrlPressed: boolean) => void;
  clearAllSelections: () => void;
  isFileSelected: (file: FileMetadata) => boolean;
  
  // Novos métodos para dados DXF em memória
  dxfFiles: Map<string, DXFFileData>;
  setDXFData: (fileId: string, metadata: FileMetadata, dxfData: DXFData, content: string) => void;
  getDXFData: (fileId: string) => DXFFileData | null;
  clearDXFData: (fileId?: string) => void;
  isFileLoaded: (fileId: string) => boolean;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>([]);
  const [dxfFiles, setDxfFiles] = useState<Map<string, DXFFileData>>(new Map());

  // Carrega os arquivos do localStorage na inicialização
  useEffect(() => {
    const validateStoredFiles = async () => {
      try {
        const savedMultiple = localStorage.getItem('selectedFiles');
        
        if (savedMultiple) {
          const parsedFiles = JSON.parse(savedMultiple);

          // LIMPAR DUPLICATAS AO CARREGAR DO LOCALSTORAGE
          const uniqueFiles = parsedFiles.filter((file: FileMetadata, index: number, self: FileMetadata[]) => 
            index === self.findIndex(f => f.id === file.id)
          );

          if (uniqueFiles.length !== parsedFiles.length) {
            // Salvar arquivos únicos de volta no localStorage
            localStorage.setItem('selectedFiles', JSON.stringify(uniqueFiles));
          }
          
          // Para desenvolvimento, não validar no backend se estiver indisponível
          // Apenas carregar os arquivos únicos salvos localmente
          setSelectedFiles(uniqueFiles);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar arquivos do localStorage:', error);
        localStorage.removeItem('selectedFiles');
      }
    };

    validateStoredFiles();
  }, []);

  const handleSetSelectedFiles = (files: FileMetadata[]) => {
    // REMOVER DUPLICATAS ANTES DE SALVAR
    const uniqueFiles = files.filter((file, index, self) => 
      index === self.findIndex(f => f.id === file.id)
    );

    setSelectedFiles(uniqueFiles);
    
    // Salva no localStorage apenas os metadados únicos (não o conteúdo DXF)
    try {
      localStorage.setItem('selectedFiles', JSON.stringify(uniqueFiles));
    } catch (error) {
      console.error('❌ Erro ao salvar arquivos múltiplos no localStorage:', error);
    }
  };

  const addToSelection = (file: FileMetadata) => {
    const newSelection = [...selectedFiles];
    if (!newSelection.find(f => f.id === file.id)) {
      newSelection.push(file);
      handleSetSelectedFiles(newSelection);
    }
  };

  const removeFromSelection = (file: FileMetadata) => {
    const newSelection = selectedFiles.filter(f => f.id !== file.id);
    handleSetSelectedFiles(newSelection);
  };

  const toggleFileSelection = (file: FileMetadata, ctrlPressed: boolean) => {
    if (ctrlPressed) {
      // Seleção múltipla com Ctrl - comportamento de toggle
      if (isFileSelected(file)) {
        removeFromSelection(file);
      } else {
        addToSelection(file);
      }
    } else {
      // Clique simples - apenas adiciona (sem toggle para Memorial)
      if (!isFileSelected(file)) {
        addToSelection(file);
      }
    }
  };

  const clearAllSelections = () => {
    setSelectedFiles([]);
    localStorage.removeItem('selectedFiles');
  };

  const isFileSelected = (file: FileMetadata): boolean => {
    return selectedFiles.some(f => f.id === file.id);
  };

  // Novos métodos para gerenciar dados DXF em memória
  const setDXFData = (fileId: string, metadata: FileMetadata, dxfData: DXFData, content: string) => {
    setDxfFiles(prev => {
      const newMap = new Map(prev);
      newMap.set(fileId, {
        metadata,
        dxfData,
        content,
        isLoaded: true,
        loadedAt: new Date()
      });
      return newMap;
    });
  };

  const getDXFData = (fileId: string): DXFFileData | null => {
    const data = dxfFiles.get(fileId);
    return data || null;
  };

  const clearDXFData = (fileId?: string) => {
    if (fileId) {
      setDxfFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileId);
        return newMap;
      });
    } else {
      setDxfFiles(new Map());
    }
  };

  const isFileLoaded = (fileId: string): boolean => {
    const data = dxfFiles.get(fileId);
    return data?.isLoaded || false;
  };

  return (
    <FileContext.Provider value={{ 
      selectedFiles,
      setSelectedFiles: handleSetSelectedFiles,
      addToSelection,
      removeFromSelection,
      toggleFileSelection,
      clearAllSelections,
      isFileSelected,
      dxfFiles,
      setDXFData,
      getDXFData,
      clearDXFData,
      isFileLoaded
    }}>
      {children}
    </FileContext.Provider>
  );
};

export const useFileContext = (): FileContextType => {
  const ctx = useContext(FileContext);
  if (!ctx) throw new Error('useFileContext deve ser usado dentro de FileProvider');
  return ctx;
};
