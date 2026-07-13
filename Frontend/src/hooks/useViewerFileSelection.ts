import { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import type { FileMetadata } from '@/types';

interface PropertyLinkedFileRefLike {
  id?: string;
  primaryForProperty?: boolean;
}

export interface ViewerFileSelectionProperty {
  id?: string;
  propertyId?: string;
  dxfFiles?: PropertyLinkedFileRefLike[];
}

interface StoredViewerSelectionState {
  fileIds: string[];
  currentFileIndex: number;
}

interface UseViewerFileSelectionParams<TProperty extends ViewerFileSelectionProperty> {
  fileId: string | null;
  fileIds: string | null;
  selectedFiles: FileMetadata[];
  selectedProperty: TProperty | null;
  setSelectedFiles: (files: FileMetadata[]) => void;
  setSelectedProperty: (property: TProperty) => void;
  getErrorMessage: (error: unknown, fallback: string) => string;
}

const VIEWER_SELECTION_STORAGE_KEY = 'viewerSelectionState';

const haveSameFileIds = (left: FileMetadata[], right: FileMetadata[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((file, index) => file.id === right[index]?.id);
};

const getLinkedPropertyFileIds = (property: ViewerFileSelectionProperty | null): string[] => {
  if (!property?.dxfFiles || property.dxfFiles.length === 0) {
    return [];
  }

  return property.dxfFiles
    .slice()
    .sort((left, right) => Number(Boolean(right.primaryForProperty)) - Number(Boolean(left.primaryForProperty)))
    .map((file) => file.id)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
};

const resolvePreferredPropertyFiles = async <TProperty extends ViewerFileSelectionProperty>(
  selectedProperty: TProperty | null,
  persistSelectedProperty: (property: TProperty) => void
): Promise<FileMetadata[]> => {
  if (!selectedProperty) {
    return [];
  }

  let linkedFileIds = getLinkedPropertyFileIds(selectedProperty);
  if (linkedFileIds.length === 0) {
    const propertyId = selectedProperty.propertyId || selectedProperty.id;
    if (!propertyId) {
      return [];
    }

    try {
      const response = await api.get(`/properties/${propertyId}/details`);
      const refreshedProperty = response.data as TProperty;
      persistSelectedProperty({
        ...selectedProperty,
        ...refreshedProperty,
        id: propertyId,
        propertyId
      });
      linkedFileIds = getLinkedPropertyFileIds(refreshedProperty);
    } catch (error) {
      console.error('Erro ao buscar arquivos tecnicos da propriedade ativa:', error);
      return [];
    }
  }

  if (linkedFileIds.length === 0) {
    return [];
  }

  const fileResponses = await Promise.all(linkedFileIds.map((id) => api.get(`/dxf/${id}`)));
  return fileResponses.map((response) => response.data as FileMetadata);
};

const normalizeStoredSelectedFiles = () => {
  const localStorageFiles = localStorage.getItem('selectedFiles');
  if (!localStorageFiles) {
    return;
  }

  try {
    const parsedLocalFiles = JSON.parse(localStorageFiles) as FileMetadata[];
    const allIds = parsedLocalFiles.map((file) => file.id);
    const uniqueIds = [...new Set(allIds)];

    if (allIds.length !== uniqueIds.length) {
      const uniqueFiles = parsedLocalFiles.filter((file, index, self) =>
        index === self.findIndex((candidate) => candidate.id === file.id)
      );

      localStorage.setItem('selectedFiles', JSON.stringify(uniqueFiles));
    }
  } catch (error) {
    console.error('Erro ao normalizar selectedFiles no localStorage:', error);
  }
};

const getStoredViewerSelectionState = (): StoredViewerSelectionState | null => {
  try {
    const rawValue = localStorage.getItem(VIEWER_SELECTION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as StoredViewerSelectionState;
    if (!Array.isArray(parsed.fileIds) || parsed.fileIds.length === 0) {
      return null;
    }

    return {
      fileIds: parsed.fileIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
      currentFileIndex: Number.isFinite(parsed.currentFileIndex) ? parsed.currentFileIndex : 0
    };
  } catch (error) {
    console.error('Erro ao ler selecao persistida do viewer:', error);
    localStorage.removeItem(VIEWER_SELECTION_STORAGE_KEY);
    return null;
  }
};

export const useViewerFileSelection = <TProperty extends ViewerFileSelectionProperty>({
  fileId,
  fileIds,
  selectedFiles,
  selectedProperty,
  setSelectedFiles,
  setSelectedProperty,
  getErrorMessage
}: UseViewerFileSelectionParams<TProperty>) => {
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedFilesKey = useMemo(
    () => selectedFiles.map((selectedFile) => selectedFile.id).join('|'),
    [selectedFiles]
  );

  useEffect(() => {
    let isMounted = true;

    const loadFiles = async () => {
      try {
        setIsLoading(true);
        setError('');
        normalizeStoredSelectedFiles();

        const storedViewerSelection = getStoredViewerSelectionState();
        const preferredPropertyFiles = (!fileId && !fileIds && selectedFiles.length === 0)
          ? await resolvePreferredPropertyFiles(selectedProperty, setSelectedProperty)
          : [];
        const effectiveFileIds = fileIds || (
          !fileId && selectedFiles.length === 0
            ? (
                preferredPropertyFiles.length > 0
                  ? preferredPropertyFiles.map((item) => item.id).join(',')
                  : storedViewerSelection?.fileIds.join(',')
              )
            : null
        );
        const effectiveFileId = fileId || ((!effectiveFileIds && selectedFiles.length === 1) ? selectedFiles[0]?.id : null);
        const preferredIndex = storedViewerSelection?.currentFileIndex ?? 0;

        if (!effectiveFileId && !effectiveFileIds && selectedFiles.length === 0) {
          if (!isMounted) {
            return;
          }

          setFile(null);
          setFiles([]);
          setError('Nenhum arquivo tecnico foi selecionado ou vinculado ao imovel ativo.');
          return;
        }

        if (effectiveFileIds) {
          const ids = effectiveFileIds.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
          const finalIds = [...new Set(ids)];
          const contextFiles = selectedFiles.filter((selectedFile) => finalIds.includes(selectedFile.id));
          const uniqueContextFiles = contextFiles.filter((contextFile, index, self) =>
            index === self.findIndex((candidate) => candidate.id === contextFile.id)
          );

          if (uniqueContextFiles.length > 0) {
            if (!isMounted) {
              return;
            }

            const safeIndex = Math.min(Math.max(preferredIndex, 0), uniqueContextFiles.length - 1);
            setFiles(uniqueContextFiles);
            setFile(uniqueContextFiles[safeIndex]);
            setCurrentFileIndex(safeIndex);
            return;
          }

          const responses = await Promise.all(finalIds.map((id) => api.get(`/dxf/${id}`)));
          if (!isMounted) {
            return;
          }

          const loadedFiles = responses.map((response) => response.data as FileMetadata);
          if (!haveSameFileIds(selectedFiles, loadedFiles)) {
            setSelectedFiles(loadedFiles);
          }

          const safeIndex = Math.min(Math.max(preferredIndex, 0), loadedFiles.length - 1);
          setFiles(loadedFiles);
          setFile(loadedFiles[safeIndex]);
          setCurrentFileIndex(safeIndex);
          return;
        }

        if (!effectiveFileId) {
          return;
        }

        const contextFile = selectedFiles.find((selectedFile) => selectedFile.id === effectiveFileId);
        if (contextFile) {
          if (!isMounted) {
            return;
          }

          setFile(contextFile);
          setFiles([contextFile]);
          setCurrentFileIndex(0);
          return;
        }

        const response = await api.get(`/dxf/${effectiveFileId}`);
        if (!isMounted) {
          return;
        }

        const loadedFile = response.data as FileMetadata;
        setFile(loadedFile);
        setFiles([loadedFile]);
        setCurrentFileIndex(0);
        if (!haveSameFileIds(selectedFiles, [loadedFile])) {
          setSelectedFiles([loadedFile]);
        }
      } catch (loadError) {
        console.error('Erro ao carregar arquivo:', loadError);
        if (isMounted) {
          setError(getErrorMessage(loadError, 'Erro ao carregar arquivo'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadFiles();

    return () => {
      isMounted = false;
    };
  }, [fileId, fileIds, getErrorMessage, selectedFiles, selectedFilesKey, selectedProperty, setSelectedFiles, setSelectedProperty]);

  useEffect(() => {
    const effectiveFiles = files.length > 0 ? files : (file ? [file] : []);
    if (effectiveFiles.length === 0) {
      return;
    }

    const safeIndex = Math.min(Math.max(currentFileIndex, 0), effectiveFiles.length - 1);
    localStorage.setItem(
      VIEWER_SELECTION_STORAGE_KEY,
      JSON.stringify({
        fileIds: effectiveFiles.map((item) => item.id),
        currentFileIndex: safeIndex
      })
    );
  }, [currentFileIndex, file, files]);

  return {
    file,
    setFile,
    files,
    currentFileIndex,
    setCurrentFileIndex,
    isLoading,
    error
  };
};
