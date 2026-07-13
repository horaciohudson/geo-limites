// src/context/FileContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { FileMetadata } from '@/types/files';
import type { DXFData } from '@/utils/dxfParser';
import { useOperationContext } from '@/contexts/OperationContext';
import {
  SELECTED_FILES_BY_PROPERTY_STORAGE_KEY,
  SELECTED_FILES_STORAGE_KEY,
  readJsonStorage,
  readScopedStorageMap,
  writeScopedStorageMap
} from '@/utils/operationContext';

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

const dedupeFiles = (files: FileMetadata[]): FileMetadata[] =>
  files.filter((file, index, self) =>
    index === self.findIndex((candidate) => candidate.id === file.id)
  );

const readPropertySelections = (): Record<string, FileMetadata[]> => {
  return readScopedStorageMap<FileMetadata[]>(SELECTED_FILES_BY_PROPERTY_STORAGE_KEY);
};

const writePropertySelections = (nextSelections: Record<string, FileMetadata[]>) => {
  writeScopedStorageMap(SELECTED_FILES_BY_PROPERTY_STORAGE_KEY, nextSelections);
};

const getStoredSelectionForProperty = (activePropertyId: string | null): FileMetadata[] => {
  const propertySelections = readPropertySelections();

  if (activePropertyId && Array.isArray(propertySelections[activePropertyId])) {
    return dedupeFiles(propertySelections[activePropertyId]);
  }

  try {
    const savedMultiple = readJsonStorage<FileMetadata[]>(SELECTED_FILES_STORAGE_KEY);
    if (!savedMultiple) {
      return [];
    }

    return dedupeFiles(savedMultiple);
  } catch {
    return [];
  }
};

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activePropertyId } = useOperationContext();
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>([]);
  const [dxfFiles, setDxfFiles] = useState<Map<string, DXFFileData>>(new Map());

  useEffect(() => {
    try {
      const restoredSelection = getStoredSelectionForProperty(activePropertyId);
      localStorage.setItem(SELECTED_FILES_STORAGE_KEY, JSON.stringify(restoredSelection));
      setSelectedFiles(restoredSelection);
    } catch (error) {
      console.error('❌ Erro ao carregar arquivos do localStorage:', error);
      localStorage.removeItem(SELECTED_FILES_STORAGE_KEY);
      setSelectedFiles([]);
    }
  }, [activePropertyId]);

  const handleSetSelectedFiles = (files: FileMetadata[]) => {
    const uniqueFiles = dedupeFiles(files);

    setSelectedFiles(uniqueFiles);
    
    try {
      localStorage.setItem(SELECTED_FILES_STORAGE_KEY, JSON.stringify(uniqueFiles));

      if (activePropertyId) {
        const propertySelections = readPropertySelections();
        if (uniqueFiles.length > 0) {
          propertySelections[activePropertyId] = uniqueFiles;
        } else {
          delete propertySelections[activePropertyId];
        }
        writePropertySelections(propertySelections);
      }
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
    localStorage.removeItem(SELECTED_FILES_STORAGE_KEY);

    if (activePropertyId) {
      const propertySelections = readPropertySelections();
      delete propertySelections[activePropertyId];
      writePropertySelections(propertySelections);
    }
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
