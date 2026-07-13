import { useCallback, useState } from 'react';
import api from '@/services/api';
import type {
  CorrectiveDraftOperation,
  CorrectiveHistoryCommand,
  CorrectiveHistoryStatus,
  CorrectiveLotInspectionView,
  CorrectiveSuggestionCommand,
  RestoredCorrectiveSnapshotView
} from '@/graphics-engine/shared/viewer-corrective';
import type { FileMetadata } from '@/types';
import type { DXFData } from '@/utils/dxfParser';
import type { Point2D } from '@/utils/geometry';
import { getFallbackPropertyId } from '@/utils/memorialDocument';
import {
  normalizeProcessingContextStatus,
  type ProcessingContextStatusDTO
} from '@/utils/processingContextStatus';
import type { CorrectiveTool, ViewerMode } from '@/utils/viewerCorrective';
import type { ConfirmedReferencePoint } from '@/graphics-engine/components/viewer-dxf';

const TECHNICAL_SUMMARY_STORAGE_PREFIX = 'technicalSummaryJson:';
const PROCESSING_CONTEXT_STATUS_STORAGE_PREFIX = 'processingContextStatus:';

interface TechnicalSummaryDocumentView {
  lots?: Array<unknown>;
}

interface PropertyLike {
  id?: string;
  propertyId?: string;
  registrationNumber?: string;
  name?: string;
}

export interface CorrectiveSnapshotState {
  dxfData: DXFData;
  referencePoints: ConfirmedReferencePoint[];
}

export interface CorrectiveSnapshotSaveInfo {
  snapshotId: string;
  generatedAt: string;
}

interface MemorialBaseSnapshotApiResponse {
  snapshotId?: string;
  fileId?: string;
  generatedAt?: string;
  memorialBase?: {
    technicalSummaryJson?: string;
    processingContextStatus?: ProcessingContextStatusDTO;
    correctiveSnapshot?: {
      dxfData?: DXFData;
      referencePoints?: ConfirmedReferencePoint[];
    };
  };
}

interface UseCorrectiveSnapshotsParams {
  selectedProperty: PropertyLike | null;
  activePropertyId?: string | null;
  propertyDetails?: PropertyLike | null;
  technicalSummaryJson: string;
  processingContextStatus: ProcessingContextStatusDTO | null;
  viewerMode: ViewerMode;
  activeCorrectiveTool: CorrectiveTool;
  selectedIssueId: string | null;
  selectedCorrectiveIssue: unknown;
  draftOperations: CorrectiveDraftOperation[];
  setDraftOperations: React.Dispatch<React.SetStateAction<CorrectiveDraftOperation[]>>;
  files: FileMetadata[];
  currentFileIndex: number;
  setCurrentFileIndex: (index: number) => void;
  setFile: (file: FileMetadata | null) => void;
  setTechnicalSummaryJson: (value: string) => void;
  setProcessingContextStatus: (value: ProcessingContextStatusDTO | null) => void;
  setGeneratedDocumentKind: (kind: 'memorial' | 'resumo-tecnico') => void;
  setViewerMode: (mode: ViewerMode) => void;
  getErrorMessage: (error: unknown, fallback: string) => string;
}

const extractCorrectivePolygonsFromSnapshotData = (snapshotData?: DXFData | null): Point2D[][] => {
  if (!snapshotData?.entities?.length) {
    return [];
  }

  return snapshotData.entities
    .filter((entity) => entity.layer === 'CORRETIVO_SNAPSHOT' && Array.isArray(entity.properties?.vertices))
    .map((entity) =>
      (entity.properties?.vertices || [])
        .map((vertex) => ({
          x: Number(vertex.x),
          y: Number(vertex.y)
        }))
        .filter((vertex) => Number.isFinite(vertex.x) && Number.isFinite(vertex.y))
    )
    .filter((polygon) => polygon.length >= 3);
};

const readEstimatedLotCount = (technicalSummaryJson: string): number | null => {
  try {
    const parsed = technicalSummaryJson ? JSON.parse(technicalSummaryJson) as TechnicalSummaryDocumentView : null;
    return Array.isArray(parsed?.lots) ? parsed.lots.length : null;
  } catch {
    return null;
  }
};

export const useCorrectiveSnapshots = ({
  selectedProperty,
  activePropertyId,
  propertyDetails,
  technicalSummaryJson,
  processingContextStatus,
  viewerMode,
  activeCorrectiveTool,
  selectedIssueId,
  selectedCorrectiveIssue,
  draftOperations,
  setDraftOperations,
  files,
  currentFileIndex,
  setCurrentFileIndex,
  setFile,
  setTechnicalSummaryJson,
  setProcessingContextStatus,
  setGeneratedDocumentKind,
  setViewerMode,
  getErrorMessage
}: UseCorrectiveSnapshotsParams) => {
  const [correctiveSnapshotsByFileId, setCorrectiveSnapshotsByFileId] = useState<Record<string, CorrectiveSnapshotState>>({});
  const [savedCorrectiveSnapshotsByFileId, setSavedCorrectiveSnapshotsByFileId] = useState<Record<string, CorrectiveSnapshotSaveInfo>>({});
  const [isSavingCorrectiveSnapshot, setIsSavingCorrectiveSnapshot] = useState(false);
  const [correctiveSnapshotSaveMessage, setCorrectiveSnapshotSaveMessage] = useState('');
  const [restoredCorrectiveSnapshotsByFileId, setRestoredCorrectiveSnapshotsByFileId] = useState<Record<string, RestoredCorrectiveSnapshotView>>({});
  const [correctiveHistoryStatusByFileId, setCorrectiveHistoryStatusByFileId] = useState<Record<string, CorrectiveHistoryStatus>>({});
  const [correctiveHistoryCommandsByFileId, setCorrectiveHistoryCommandsByFileId] = useState<Record<string, CorrectiveHistoryCommand>>({});
  const [correctiveSuggestionCommandsByFileId, setCorrectiveSuggestionCommandsByFileId] = useState<Record<string, CorrectiveSuggestionCommand>>({});
  const [correctiveLotInspectionByFileId, setCorrectiveLotInspectionByFileId] = useState<Record<string, CorrectiveLotInspectionView | null>>({});
  const [isLoadingCorrectiveSnapshot, setIsLoadingCorrectiveSnapshot] = useState(false);
  const [correctiveSnapshotLoadMessage, setCorrectiveSnapshotLoadMessage] = useState('');

  const resetCorrectiveSnapshotState = useCallback(() => {
    setCorrectiveSnapshotsByFileId({});
    setSavedCorrectiveSnapshotsByFileId({});
    setCorrectiveSnapshotSaveMessage('');
    setRestoredCorrectiveSnapshotsByFileId({});
    setCorrectiveHistoryStatusByFileId({});
    setCorrectiveHistoryCommandsByFileId({});
    setCorrectiveSuggestionCommandsByFileId({});
    setCorrectiveLotInspectionByFileId({});
    setCorrectiveSnapshotLoadMessage('');
  }, []);

  const registerCorrectiveSnapshot = useCallback((
    fileIdValue: string | undefined,
    snapshotData: DXFData,
    referencePoints: ConfirmedReferencePoint[]
  ) => {
    if (!fileIdValue) {
      return;
    }

    setCorrectiveSnapshotsByFileId((current) => {
      const existing = current[fileIdValue];
      if (existing?.dxfData === snapshotData && existing.referencePoints === referencePoints) {
        return current;
      }

      return {
        ...current,
        [fileIdValue]: {
          dxfData: snapshotData,
          referencePoints
        }
      };
    });
  }, []);

  const registerCorrectiveHistoryStatus = useCallback((
    fileIdValue: string | undefined,
    status: CorrectiveHistoryStatus
  ) => {
    if (!fileIdValue) {
      return;
    }

    setCorrectiveHistoryStatusByFileId((current) => {
      const existing = current[fileIdValue];
      if (
        existing?.canUndo === status.canUndo &&
        existing?.canRedo === status.canRedo &&
        existing?.revision === status.revision
      ) {
        return current;
      }

      return {
        ...current,
        [fileIdValue]: status
      };
    });

    setDraftOperations((current) => {
      let changed = false;
      const next = current.map((operation) => {
        if (operation.fileId !== fileIdValue || operation.revision === undefined) {
          return operation;
        }

        const nextStatus: CorrectiveDraftOperation['status'] = operation.revision <= status.revision ? 'draft' : 'undone';
        if (operation.status === nextStatus) {
          return operation;
        }

        changed = true;
        return {
          ...operation,
          status: nextStatus
        };
      });

      return changed ? next : current;
    });
  }, [setDraftOperations]);

  const dispatchCorrectiveHistoryCommand = useCallback((
    fileIdValue: string | undefined,
    command: 'undo' | 'redo'
  ) => {
    if (!fileIdValue) {
      return;
    }

    setCorrectiveHistoryCommandsByFileId((current) => {
      const existing = current[fileIdValue] || { undoToken: 0, redoToken: 0 };
      return {
        ...current,
        [fileIdValue]: {
          ...existing,
          undoToken: command === 'undo' ? existing.undoToken + 1 : existing.undoToken,
          redoToken: command === 'redo' ? existing.redoToken + 1 : existing.redoToken
        }
      };
    });
  }, []);

  const dispatchCorrectiveSuggestionCommand = useCallback((fileIdValue: string | undefined) => {
    if (!fileIdValue) {
      return;
    }

    setCorrectiveSuggestionCommandsByFileId((current) => {
      const existing = current[fileIdValue] || { applyToken: 0 };
      return {
        ...current,
        [fileIdValue]: {
          applyToken: existing.applyToken + 1
        }
      };
    });
  }, []);

  const registerCorrectiveLotInspection = useCallback((
    fileIdValue: string | undefined,
    inspection: CorrectiveLotInspectionView | null
  ) => {
    if (!fileIdValue) {
      return;
    }

    setCorrectiveLotInspectionByFileId((current) => {
      const existing = current[fileIdValue];
      if (JSON.stringify(existing) === JSON.stringify(inspection)) {
        return current;
      }

      return {
        ...current,
        [fileIdValue]: inspection
      };
    });
  }, []);

  const saveCorrectiveSnapshot = useCallback(async (
    currentFile: FileMetadata | null | undefined,
    currentCorrectiveSnapshot: CorrectiveSnapshotState | undefined
  ) => {
    if (!currentFile || !currentCorrectiveSnapshot?.dxfData) {
      setCorrectiveSnapshotSaveMessage('Snapshot corretivo indisponivel para o arquivo atual.');
      return;
    }

    const propertyId = activePropertyId || selectedProperty?.propertyId || selectedProperty?.id || getFallbackPropertyId();
    if (!propertyId) {
      setCorrectiveSnapshotSaveMessage('Selecione um imovel valido antes de salvar o snapshot corretivo.');
      return;
    }

    try {
      setIsSavingCorrectiveSnapshot(true);
      setCorrectiveSnapshotSaveMessage('');

      const response = await api.post('/memorial/corrective-snapshots', {
        propertyId,
        fileId: currentFile.id,
        fileName: currentFile.originalName,
        projectName:
          propertyDetails?.name ||
          selectedProperty?.name ||
          propertyDetails?.registrationNumber ||
          selectedProperty?.registrationNumber ||
          'Editor Corretivo',
        estimatedLotCount: readEstimatedLotCount(technicalSummaryJson),
        georeferenced: currentCorrectiveSnapshot.referencePoints.length > 0,
        coordinateSource: currentCorrectiveSnapshot.referencePoints.length > 0 ? 'VIEWER_REFERENCE_POINTS' : 'DXF_LOCAL',
        technicalSummaryJson,
        processingContextStatus,
        correctiveSnapshot: {
          dxfData: currentCorrectiveSnapshot.dxfData,
          referencePoints: currentCorrectiveSnapshot.referencePoints
        },
        metadata: {
          viewerMode,
          activeCorrectiveTool,
          selectedIssueId,
          selectedIssue: selectedCorrectiveIssue,
          draftOperations
        }
      });

      const snapshotId = String(response.data?.snapshotId || '');
      const generatedAt = String(response.data?.generatedAt || new Date().toISOString());

      if (currentFile.id && snapshotId) {
        setSavedCorrectiveSnapshotsByFileId((current) => ({
          ...current,
          [currentFile.id]: {
            snapshotId,
            generatedAt
          }
        }));
      }

      setCorrectiveSnapshotSaveMessage('Snapshot corretivo salvo com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar snapshot corretivo:', error);
      setCorrectiveSnapshotSaveMessage(getErrorMessage(error, 'Erro ao salvar snapshot corretivo.'));
    } finally {
      setIsSavingCorrectiveSnapshot(false);
    }
  }, [
    activeCorrectiveTool,
    activePropertyId,
    draftOperations,
    getErrorMessage,
    propertyDetails,
    selectedCorrectiveIssue,
    selectedIssueId,
    selectedProperty,
    technicalSummaryJson,
    processingContextStatus,
    viewerMode
  ]);

  const loadLatestCorrectiveSnapshot = useCallback(async (requestedFile?: FileMetadata | null) => {
    const propertyId = activePropertyId || selectedProperty?.propertyId || selectedProperty?.id || getFallbackPropertyId();
    if (!propertyId) {
      setCorrectiveSnapshotLoadMessage('Selecione um imovel valido antes de reabrir um snapshot corretivo.');
      return;
    }

    try {
      setIsLoadingCorrectiveSnapshot(true);
      setCorrectiveSnapshotLoadMessage('');

      const response = await api.get<MemorialBaseSnapshotApiResponse>(`/properties/${propertyId}/memorial-base/latest-corrective`);
      const snapshot = response.data;
      const snapshotFileId = snapshot.fileId;
      const snapshotData = snapshot.memorialBase?.correctiveSnapshot?.dxfData;
      const snapshotReferencePoints = snapshot.memorialBase?.correctiveSnapshot?.referencePoints || [];
      const restoredPolygons = extractCorrectivePolygonsFromSnapshotData(snapshotData);

      if (!snapshotFileId) {
        setCorrectiveSnapshotLoadMessage('O snapshot corretivo salvo nao informa o arquivo de origem.');
        return;
      }

      const targetFile = files.find((item) => item.id === snapshotFileId) || (requestedFile?.id === snapshotFileId ? requestedFile : null);
      if (!targetFile) {
        setCorrectiveSnapshotLoadMessage('O ultimo snapshot corretivo pertence a um arquivo que nao esta carregado nesta sessao.');
        return;
      }

      if (!snapshotData || restoredPolygons.length === 0) {
        setCorrectiveSnapshotLoadMessage('O snapshot corretivo salvo nao possui geometria suficiente para reabrir.');
        return;
      }

      const targetIndex = files.findIndex((item) => item.id === targetFile.id);
      if (targetIndex >= 0 && targetIndex !== currentFileIndex) {
        setCurrentFileIndex(targetIndex);
        setFile(files[targetIndex]);
      }

      const normalizedProcessingContextStatus = normalizeProcessingContextStatus(
        snapshot.memorialBase?.processingContextStatus
      );

      registerCorrectiveSnapshot(targetFile.id, snapshotData, snapshotReferencePoints);
      setRestoredCorrectiveSnapshotsByFileId((current) => ({
        ...current,
        [targetFile.id]: {
          snapshotId: snapshot.snapshotId || `snapshot-${targetFile.id}`,
          appliedAt: new Date().toISOString(),
          polygons: restoredPolygons,
          processingContextStatus: normalizedProcessingContextStatus
        }
      }));
      setSavedCorrectiveSnapshotsByFileId((current) => ({
        ...current,
        [targetFile.id]: {
          snapshotId: snapshot.snapshotId || '',
          generatedAt: snapshot.generatedAt || new Date().toISOString()
        }
      }));

      if (snapshot.memorialBase?.technicalSummaryJson) {
        setTechnicalSummaryJson(snapshot.memorialBase.technicalSummaryJson);
        if (targetFile.id) {
          localStorage.setItem(
            `${TECHNICAL_SUMMARY_STORAGE_PREFIX}${targetFile.id}`,
            snapshot.memorialBase.technicalSummaryJson
          );
          if (normalizedProcessingContextStatus) {
            localStorage.setItem(
              `${PROCESSING_CONTEXT_STATUS_STORAGE_PREFIX}${targetFile.id}`,
              JSON.stringify(normalizedProcessingContextStatus)
            );
          } else {
            localStorage.removeItem(`${PROCESSING_CONTEXT_STATUS_STORAGE_PREFIX}${targetFile.id}`);
          }
        }
        setProcessingContextStatus(normalizedProcessingContextStatus);
        setGeneratedDocumentKind('resumo-tecnico');
      }

      setViewerMode('correct');
      setCorrectiveSnapshotLoadMessage('Snapshot corretivo reaberto com sucesso.');
    } catch (error) {
      console.error('Erro ao reabrir snapshot corretivo:', error);
      setCorrectiveSnapshotLoadMessage(getErrorMessage(error, 'Erro ao reabrir snapshot corretivo.'));
    } finally {
      setIsLoadingCorrectiveSnapshot(false);
    }
  }, [
    activePropertyId,
    currentFileIndex,
    files,
    getErrorMessage,
    registerCorrectiveSnapshot,
    selectedProperty,
    setCurrentFileIndex,
    setFile,
    setProcessingContextStatus,
    setGeneratedDocumentKind,
    setTechnicalSummaryJson,
    setViewerMode
  ]);

  return {
    correctiveSnapshotsByFileId,
    savedCorrectiveSnapshotsByFileId,
    isSavingCorrectiveSnapshot,
    correctiveSnapshotSaveMessage,
    restoredCorrectiveSnapshotsByFileId,
    correctiveHistoryStatusByFileId,
    correctiveHistoryCommandsByFileId,
    correctiveSuggestionCommandsByFileId,
    correctiveLotInspectionByFileId,
    isLoadingCorrectiveSnapshot,
    correctiveSnapshotLoadMessage,
    resetCorrectiveSnapshotState,
    registerCorrectiveSnapshot,
    registerCorrectiveHistoryStatus,
    dispatchCorrectiveHistoryCommand,
    dispatchCorrectiveSuggestionCommand,
    registerCorrectiveLotInspection,
    saveCorrectiveSnapshot,
    loadLatestCorrectiveSnapshot
  };
};
