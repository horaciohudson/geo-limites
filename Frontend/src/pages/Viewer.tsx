import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import CorrectivePanel from '@/components/CorrectivePanel';
import DocumentProcessingOverlay from '@/components/DocumentProcessingOverlay';
import ErrorBoundary from '@/components/ErrorBoundary';
import GeneratedDocumentPanel from '@/components/GeneratedDocumentPanel';
import Loading from '@/components/Loading';
import { GeoLimitesViewerDXF } from '@/graphics-engine/adapters/geolimites';
import { scanGeoLimitesCorrectiveIssues } from '@/graphics-engine/adapters/geolimites/scanGeoLimitesCorrectiveIssues';
import type { CorrectiveDraftOperation, PropertyLandmarkView } from '@/graphics-engine/shared/viewer-corrective';
import ViewerHeader from '@/components/ViewerHeader';
import ViewerMultiFileLayout from '@/components/ViewerMultiFileLayout';
import ViewerSingleFileLayout from '@/components/ViewerSingleFileLayout';
import { useSidebarActions } from '@/contexts/SidebarActionsContext';
import { useFileContext } from '@/contexts/FileContext';
import { useOperationContext } from '@/contexts/OperationContext';
import {
  persistViewerDocumentRequest,
  useViewerDocumentRequestBootstrap,
  type ViewerDocumentRequest
} from '@/hooks/useViewerDocumentRequest';
import type { ConfirmedLotSelection, ConfirmedReferencePoint } from '@/graphics-engine/components/viewer-dxf';
import { useViewerFileSelection } from '@/hooks/useViewerFileSelection';
import { useViewerPropertyDetails } from '@/hooks/useViewerPropertyDetails';
import {
  useCorrectiveSnapshots
} from '@/hooks/useCorrectiveSnapshots';
import { useDocumentGenerationActions } from '@/hooks/useDocumentGenerationActions';
import { useDocumentGenerationState } from '@/hooks/useDocumentGenerationState';
import type { AsyncPropertyData } from '@/services/polling-memorial';
import {
  copyGeneratedDocumentText,
  downloadTechnicalFile,
  exportGeneratedDocumentPdf
} from '@/utils/documentExport';
import type { DXFData } from '@/utils/dxfParser';
import type { MemorialPropertyDataLike } from '@/utils/memorialDocument';
import { getStoredTechnicalSummary } from '@/utils/technicalSummaryStorage';
import {
  getProcessingContextStatusLabels,
  normalizeProcessingContextStatus,
  resolveTechnicalSummaryProcessingContext
} from '@/utils/processingContextStatus';
import {
  formatIssueCodeLabel,
  parseTechnicalSummaryIssues,
  type CorrectiveTool,
  type ViewerMode
} from '@/utils/viewerCorrective';

const TECHNICAL_SUMMARY_STORAGE_PREFIX = 'technicalSummaryJson:';
const PROCESSING_CONTEXT_STATUS_STORAGE_PREFIX = 'processingContextStatus:';

const readStoredProcessingContextStatus = (fileId?: string | null) => {
  if (!fileId) {
    return null;
  }

  try {
    const rawValue = localStorage.getItem(`${PROCESSING_CONTEXT_STATUS_STORAGE_PREFIX}${fileId}`);
    return rawValue ? normalizeProcessingContextStatus(JSON.parse(rawValue) as unknown) : null;
  } catch {
    return null;
  }
};

interface PropertyLinkedFileRef {
  id?: string;
  originalName?: string;
  fileName?: string;
  contentType?: string;
  primaryForProperty?: boolean;
}

interface StoredPropertySelection extends AsyncPropertyData {
  id?: string;
  propertyId?: string;
  dxfFiles?: PropertyLinkedFileRef[];
}

interface PropertyDetailsView extends StoredPropertySelection {
  landmarks?: PropertyLandmarkView[];
}

interface ErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface ViewerProps {
  documentOnly?: boolean;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const errorLike = error as ErrorLike;
    return errorLike.response?.data?.message || errorLike.message || fallback;
  }

  return fallback;
};

const Viewer: React.FC<ViewerProps> = ({ documentOnly = false }) => {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId');
  const fileIds = searchParams.get('fileIds');
  const shouldGenerateMemorial = searchParams.get('generateMemorial') === 'true';
  const requestedDocumentKind = searchParams.get('documentKind') === 'resumo-tecnico' ? 'resumo-tecnico' : 'memorial';
  const documentRequestKey = searchParams.get('requestKey');

  const { setViewerActions } = useSidebarActions();
  const { selectedFiles, setSelectedFiles } = useFileContext();
  const { selectedProperty, activePropertyId, setSelectedProperty } = useOperationContext();
  const [dxfData, setDxfData] = useState<DXFData | null>(null);
  const {
    file,
    setFile,
    files,
    currentFileIndex,
    setCurrentFileIndex,
    isLoading,
    error
  } = useViewerFileSelection({
    fileId,
    fileIds,
    selectedFiles,
    selectedProperty: selectedProperty as StoredPropertySelection | null,
    setSelectedFiles,
    setSelectedProperty: (property) => setSelectedProperty(property),
    getErrorMessage
  });
  const { propertyDetails } = useViewerPropertyDetails({
    activePropertyId,
    selectedProperty: selectedProperty as PropertyDetailsView | null
  });
  const {
    memorial,
    technicalSummaryJson,
    processingContextStatus,
    setTechnicalSummaryJson,
    setProcessingContextStatus,
    generatedDocumentKind,
    setGeneratedDocumentKind,
    isGeneratingMemorial,
    memorialError,
    setMemorialError,
    memorialTimeElapsed,
    generationProgress,
    memorialCurrentStep,
    beginGeneration,
    updateGeneration,
    completeGeneration,
    failGeneration
  } = useDocumentGenerationState();
  const [viewerMode, setViewerMode] = useState<ViewerMode>('view');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [draftOperations, setDraftOperations] = useState<CorrectiveDraftOperation[]>([]);
  const [activeCorrectiveTool, setActiveCorrectiveTool] = useState<CorrectiveTool>('inspect');
  const [correctiveIssueSource, setCorrectiveIssueSource] = useState<'summary' | 'scan' | null>(null);
  const [manualScanRevision, setManualScanRevision] = useState(0);

  const currentViewedFile = files[currentFileIndex] || file;
  const technicalSummaryIssues = useMemo(
    () => parseTechnicalSummaryIssues(technicalSummaryJson),
    [technicalSummaryJson]
  );
  const scanSourceDxfData = dxfData;
  const scannedCorrectiveIssues = useMemo(
    () => (
      manualScanRevision > 0
        ? scanGeoLimitesCorrectiveIssues(scanSourceDxfData)
        : []
    ),
    [manualScanRevision, scanSourceDxfData]
  );
  const effectiveCorrectiveIssueSource = useMemo<'summary' | 'scan' | null>(() => {
    if (correctiveIssueSource === 'scan' && manualScanRevision > 0) {
      return 'scan';
    }
    if (correctiveIssueSource === 'summary' && technicalSummaryIssues.length > 0) {
      return 'summary';
    }
    if (manualScanRevision > 0) {
      return 'scan';
    }
    if (technicalSummaryIssues.length > 0) {
      return 'summary';
    }
    return null;
  }, [correctiveIssueSource, manualScanRevision, technicalSummaryIssues.length]);
  const correctiveIssues = useMemo(
    () => (effectiveCorrectiveIssueSource === 'scan' ? scannedCorrectiveIssues : technicalSummaryIssues),
    [effectiveCorrectiveIssueSource, scannedCorrectiveIssues, technicalSummaryIssues]
  );
  const correctiveIssuesSourceLabel = effectiveCorrectiveIssueSource === 'scan'
    ? 'scan do arquivo'
    : 'resumo tecnico';
  const selectedCorrectiveIssue = useMemo(
    () => correctiveIssues.find((issue) => issue.id === selectedIssueId) || null,
    [correctiveIssues, selectedIssueId]
  );
  const correctiveFocusLotNumber = selectedCorrectiveIssue?.lotNumber ?? null;
  const hasCorrectiveMode = effectiveCorrectiveIssueSource === 'scan'
    ? Boolean(scanSourceDxfData)
    : (generatedDocumentKind === 'resumo-tecnico' && technicalSummaryIssues.length > 0);
  const currentCorrectiveFileId = currentViewedFile?.id;
  const currentDraftOperations = useMemo(
    () => draftOperations.filter((operation) => !currentCorrectiveFileId || operation.fileId === currentCorrectiveFileId),
    [draftOperations, currentCorrectiveFileId]
  );
  const latestAppliedSuggestion = useMemo(
    () => [...currentDraftOperations]
      .reverse()
      .find((operation) =>
        operation.status === 'draft' &&
        operation.label.toLowerCase().includes('aplicar sugestao automatica')
      ) || null,
    [currentDraftOperations]
  );
  const latestAppliedSuggestionLotNumber = useMemo(() => {
    if (!latestAppliedSuggestion) {
      return null;
    }

    const lotMatch = latestAppliedSuggestion.label.match(/lote\s+(\d+)/i);
    if (!lotMatch) {
      return null;
    }

    const parsedLotNumber = Number(lotMatch[1]);
    return Number.isFinite(parsedLotNumber) ? parsedLotNumber : null;
  }, [latestAppliedSuggestion]);
  const isFocusedSuggestionRecentlyApplied = useMemo(() => {
    if (!latestAppliedSuggestionLotNumber || !selectedCorrectiveIssue) {
      return false;
    }

    return latestAppliedSuggestionLotNumber === selectedCorrectiveIssue.lotNumber;
  }, [latestAppliedSuggestionLotNumber, selectedCorrectiveIssue]);
  const {
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
  } = useCorrectiveSnapshots({
    selectedProperty: selectedProperty as StoredPropertySelection | null,
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
  });
  const currentCorrectiveSuggestionCommand = currentCorrectiveFileId
    ? correctiveSuggestionCommandsByFileId[currentCorrectiveFileId]
    : undefined;
  const currentCorrectiveSnapshot = currentCorrectiveFileId
    ? correctiveSnapshotsByFileId[currentCorrectiveFileId]
    : undefined;
  const savedCorrectiveSnapshot = currentCorrectiveFileId
    ? savedCorrectiveSnapshotsByFileId[currentCorrectiveFileId]
    : undefined;
  const restoredCorrectiveSnapshot = currentCorrectiveFileId
    ? restoredCorrectiveSnapshotsByFileId[currentCorrectiveFileId]
    : undefined;
  const correctiveHistoryStatus = currentCorrectiveFileId
    ? correctiveHistoryStatusByFileId[currentCorrectiveFileId]
    : undefined;
  const correctiveLotInspection = currentCorrectiveFileId
    ? correctiveLotInspectionByFileId[currentCorrectiveFileId]
    : undefined;
  const activeFileName = currentViewedFile?.originalName || 'Nao informado';
  const processingFileName = currentViewedFile?.originalName || 'Arquivo atual';

  useEffect(() => {
    setCorrectiveIssueSource(null);
    setManualScanRevision(0);
  }, [currentViewedFile?.id]);

  useEffect(() => {
    const currentFileId = currentViewedFile?.id;
    if (!currentFileId) {
      return;
    }

    const storedSummary = localStorage.getItem(`${TECHNICAL_SUMMARY_STORAGE_PREFIX}${currentFileId}`);
    if (!storedSummary || storedSummary.trim().length === 0) {
      return;
    }

    const normalizedStoredStatus = readStoredProcessingContextStatus(currentFileId);
    const storedRecord = getStoredTechnicalSummary(activePropertyId);
    const fallbackStoredStatus = storedRecord?.sourceFileId === currentFileId
      ? normalizeProcessingContextStatus(storedRecord.processingContextStatus)
      : null;
    const nextStatus = normalizedStoredStatus || fallbackStoredStatus;
    const sameStatus = JSON.stringify(processingContextStatus || null) === JSON.stringify(nextStatus || null);

    if (storedSummary === technicalSummaryJson && generatedDocumentKind === 'resumo-tecnico' && sameStatus) {
      return;
    }

    setTechnicalSummaryJson(storedSummary);
    setProcessingContextStatus(nextStatus);
    setGeneratedDocumentKind('resumo-tecnico');
  }, [activePropertyId, currentViewedFile?.id, generatedDocumentKind, processingContextStatus, setGeneratedDocumentKind, setProcessingContextStatus, setTechnicalSummaryJson, technicalSummaryJson]);

  useEffect(() => {
    if (technicalSummaryIssues.length > 0 && correctiveIssueSource === null) {
      setCorrectiveIssueSource('summary');
    }
  }, [correctiveIssueSource, technicalSummaryIssues.length]);

  useEffect(() => {
    const currentFileId = currentViewedFile?.id;
    if (!currentFileId) {
      return;
    }

    const watchedKey = `${TECHNICAL_SUMMARY_STORAGE_PREFIX}${currentFileId}`;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== watchedKey) {
        return;
      }

      const nextValue = typeof event.newValue === 'string' ? event.newValue : '';
      if (!nextValue.trim()) {
        return;
      }

      setTechnicalSummaryJson(nextValue);
      setProcessingContextStatus(readStoredProcessingContextStatus(currentFileId));
      setGeneratedDocumentKind('resumo-tecnico');
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentViewedFile?.id, setGeneratedDocumentKind, setProcessingContextStatus, setTechnicalSummaryJson]);

  useEffect(() => {
    if (!hasCorrectiveMode) {
      setViewerMode('view');
      setSelectedIssueId(null);
      setDraftOperations([]);
      setActiveCorrectiveTool('inspect');
      resetCorrectiveSnapshotState();
      return;
    }

    if (!selectedIssueId || !correctiveIssues.some((issue) => issue.id === selectedIssueId)) {
      setSelectedIssueId(correctiveIssues[0]?.id || null);
    }
  }, [hasCorrectiveMode, correctiveIssues, selectedIssueId, resetCorrectiveSnapshotState]);

  useEffect(() => {
    if (!documentOnly && shouldGenerateMemorial && file && dxfData && !isGeneratingMemorial) {
      generateMemorial();
    }
  }, [documentOnly, shouldGenerateMemorial, file, dxfData]); // Removida dependência isGeneratingMemorial para evitar loop

  const downloadFile = useCallback(async () => {
    const currentFile = currentViewedFile || file;
    if (!currentFile?.id) return;
    try {
      await downloadTechnicalFile(currentFile);
    } catch (err) {
      console.error('Erro ao baixar arquivo:', err);
    }
  }, [currentViewedFile, file]);

  const handleDXFDataLoaded = (data: DXFData) => {
    setDxfData(data);
  };

  const openDocumentPage = useCallback((request: ViewerDocumentRequest) => {
    const fallbackFile = request.sourceFile || currentViewedFile || file;
    if (!fallbackFile?.id) {
      setMemorialError('Arquivo de origem nao disponivel para abrir a pagina do documento.');
      return;
    }

    const requestKey = persistViewerDocumentRequest(request);
    const nextUrl = `${window.location.origin}/viewer-document?fileId=${encodeURIComponent(fallbackFile.id)}&documentKind=${encodeURIComponent(request.kind)}&requestKey=${encodeURIComponent(requestKey)}`;
    window.open(nextUrl, '_blank');
  }, [currentViewedFile, file]);

  const openMemorialDocumentPage = useCallback((
    sourceFile: typeof currentViewedFile,
    selections?: ConfirmedLotSelection[],
    referencePoints?: ConfirmedReferencePoint[]
  ) => {
    openDocumentPage({
      kind: 'memorial',
      sourceFile,
      selections,
      referencePoints,
      createdAt: new Date().toISOString()
    });
  }, [openDocumentPage]);

  const openTechnicalSummaryDocumentPage = useCallback((
    sourceFile: typeof currentViewedFile,
    sourceDxfData?: DXFData | null,
    referencePoints?: ConfirmedReferencePoint[]
  ) => {
    openDocumentPage({
      kind: 'resumo-tecnico',
      sourceFile,
      sourceDxfData,
      referencePoints,
      createdAt: new Date().toISOString()
    });
  }, [openDocumentPage]);

  const {
    handlePolygonConfirmed,
    generateMemorial,
    generateTechnicalSummary
  } = useDocumentGenerationActions({
    file,
    files,
    currentFileIndex,
    dxfData,
    selectedProperty: selectedProperty as MemorialPropertyDataLike | null,
    activePropertyId,
    setCurrentFileIndex,
    setMemorialError,
    beginGeneration,
    updateGeneration,
    completeGeneration,
    failGeneration,
    getErrorMessage
  });

  useViewerDocumentRequestBootstrap({
    enabled: documentOnly,
    requestKey: documentRequestKey,
    currentFile: currentViewedFile,
    currentDxfData: dxfData,
    isGenerating: isGeneratingMemorial,
    onGenerateTechnicalSummary: generateTechnicalSummary,
    onHandlePolygonConfirmed: handlePolygonConfirmed,
    onGenerateMemorial: generateMemorial
  });

  const downloadMemorial = useCallback(async () => {
    const currentFile = currentViewedFile || file;
    if (!memorial || !currentFile) return;
    await exportGeneratedDocumentPdf({
      content: memorial,
      currentFile,
      generatedDocumentKind
    });
  }, [currentViewedFile, file, generatedDocumentKind, memorial]);

  useEffect(() => {
    return () => {
      setViewerActions(null);
    };
  }, [setViewerActions]);

  // Configurar ações do sidebar
  useEffect(() => {
    if (!documentOnly && file) {
      setViewerActions({
        onDownload: downloadFile,
        onGenerateMemorial: () => openDocumentPage({
          kind: 'memorial',
          sourceFile: currentViewedFile || file,
          sourceDxfData: dxfData,
          createdAt: new Date().toISOString()
        }),
        onDownloadMemorial: downloadMemorial,
        onBack: () => window.history.back(),
        isGeneratingMemorial,
        hasMemorial: !!memorial,
        hasDxfData: !!dxfData,
        currentFileId: file.id
      });
    }
  }, [documentOnly, file, currentViewedFile, isGeneratingMemorial, memorial, dxfData, downloadFile, downloadMemorial, openDocumentPage, setViewerActions]); // Dependências específicas

  const registerCorrectiveDraftOperation = (operation: CorrectiveDraftOperation) => {
    setDraftOperations((current) => {
      if (current.some((item) => item.id === operation.id)) {
        return current;
      }
      return [...current, operation];
    });
  };

  const removeCorrectiveDraftOperation = (operationId: string) => {
    setDraftOperations((current) => current.filter((operation) => operation.id !== operationId));
  };

  const clearCorrectiveDraftOperations = (fileIdValue?: string) => {
    if (!fileIdValue) {
      setDraftOperations([]);
      return;
    }

    setDraftOperations((current) => current.filter((operation) => operation.fileId !== fileIdValue));
  };

  const handlePrepareCorrectiveDraft = () => {
    if (!selectedCorrectiveIssue) {
      return;
    }

    registerCorrectiveDraftOperation({
      id: `draft-${selectedCorrectiveIssue.id}`,
      label: `Preparar correcao para o Lote ${selectedCorrectiveIssue.lotNumber} (${formatIssueCodeLabel(selectedCorrectiveIssue.code)})`,
      status: 'draft',
      fileId: currentViewedFile?.id
    });
  };

  const handleRevalidateCorrectiveSummary = () => {
    openTechnicalSummaryDocumentPage(
      currentViewedFile,
      currentCorrectiveSnapshot?.dxfData || dxfData,
      currentCorrectiveSnapshot?.referencePoints || []
    );
  };

  const handleSelectViewMode = useCallback(() => {
    setViewerMode('view');
  }, []);

  const handleSelectCorrectiveMode = useCallback(() => {
    if (hasCorrectiveMode) {
      setViewerMode('correct');
    }
  }, [hasCorrectiveMode]);

  const handleScanErrors = useCallback(() => {
    if (!scanSourceDxfData) {
      return;
    }

    setManualScanRevision((current) => current + 1);
    setCorrectiveIssueSource('scan');
    setViewerMode('correct');
  }, [scanSourceDxfData]);

  const handleReopenLatestSnapshot = useCallback(() => {
    void loadLatestCorrectiveSnapshot(currentViewedFile);
  }, [currentViewedFile, loadLatestCorrectiveSnapshot]);

  const handleClearCorrectiveFocus = useCallback(() => {
    setDraftOperations([]);
    setSelectedIssueId(correctiveIssues[0]?.id || null);
  }, [correctiveIssues]);

  const handleApplyCorrectiveSuggestion = useCallback(() => {
    if (correctiveLotInspection) {
      setActiveCorrectiveTool(correctiveLotInspection.suggestedTool);
    }
    dispatchCorrectiveSuggestionCommand(currentViewedFile?.id);
  }, [correctiveLotInspection, currentViewedFile?.id, dispatchCorrectiveSuggestionCommand]);

  const handleUndoCorrective = useCallback(() => {
    dispatchCorrectiveHistoryCommand(currentViewedFile?.id, 'undo');
  }, [currentViewedFile?.id, dispatchCorrectiveHistoryCommand]);

  const handleRedoCorrective = useCallback(() => {
    dispatchCorrectiveHistoryCommand(currentViewedFile?.id, 'redo');
  }, [currentViewedFile?.id, dispatchCorrectiveHistoryCommand]);

  const handleClearCurrentDraft = useCallback(() => {
    clearCorrectiveDraftOperations(currentViewedFile?.id);
  }, [currentViewedFile?.id]);

  const handleSaveCurrentCorrectiveSnapshot = useCallback(() => {
    void saveCorrectiveSnapshot(currentViewedFile, currentCorrectiveSnapshot);
  }, [currentViewedFile, currentCorrectiveSnapshot, saveCorrectiveSnapshot]);

  const renderMultiFileViewer = useCallback((fileItem: typeof files[number], index: number) => (
                  <GeoLimitesViewerDXF
      key={fileItem.id}
      fileId={fileItem.id}
      className="drawing-viewer"
      onDXFDataLoaded={index === currentFileIndex ? handleDXFDataLoaded : undefined}
      interactive={true}
      onPolygonConfirmed={({ selections, referencePoints }) => openMemorialDocumentPage(
        fileItem,
        selections,
        referencePoints || []
      )}
      onGenerateTechnicalSummary={({ viewerData, referencePoints }) => openTechnicalSummaryDocumentPage(
        fileItem,
        viewerData,
        referencePoints || []
      )}
      isGeneratingTechnicalSummary={isGeneratingMemorial}
      propertyLandmarks={propertyDetails?.landmarks}
      viewerMode={viewerMode}
      correctiveFocusLotNumber={index === currentFileIndex ? correctiveFocusLotNumber : null}
      recentlyCorrectedLotNumber={index === currentFileIndex ? latestAppliedSuggestionLotNumber : null}
      activeCorrectiveTool={activeCorrectiveTool}
      onRegisterCorrectiveDraftOperation={registerCorrectiveDraftOperation}
      correctiveSnapshotFileId={fileItem.id}
      onCorrectiveSnapshotChanged={registerCorrectiveSnapshot}
      correctiveHistoryCommand={correctiveHistoryCommandsByFileId[fileItem.id]}
      correctiveSuggestionCommand={correctiveSuggestionCommandsByFileId[fileItem.id]}
      onCorrectiveHistoryStatusChange={registerCorrectiveHistoryStatus}
      correctiveIssues={index === currentFileIndex ? correctiveIssues : []}
      onCorrectiveLotInspectionChange={registerCorrectiveLotInspection}
      restoredCorrectiveSnapshot={restoredCorrectiveSnapshotsByFileId[fileItem.id] || null}
    />
  ), [
    activeCorrectiveTool,
    correctiveFocusLotNumber,
    correctiveHistoryCommandsByFileId,
    correctiveIssues,
    correctiveSuggestionCommandsByFileId,
    currentFileIndex,
    isGeneratingMemorial,
    openMemorialDocumentPage,
    openTechnicalSummaryDocumentPage,
    propertyDetails?.landmarks,
    registerCorrectiveDraftOperation,
    registerCorrectiveHistoryStatus,
    registerCorrectiveLotInspection,
    registerCorrectiveSnapshot,
    restoredCorrectiveSnapshotsByFileId,
    viewerMode
  ]);

  const getMultiFileStatusBadge = useCallback((fileItem: typeof files[number]) => {
    const restoredSnapshot = restoredCorrectiveSnapshotsByFileId[fileItem.id];
    const processingContextStatus = restoredSnapshot?.processingContextStatus;
    if (!processingContextStatus) {
      return null;
    }

    const assessment = resolveTechnicalSummaryProcessingContext('', processingContextStatus);
    const labels = getProcessingContextStatusLabels(assessment.status);

    return {
      label: labels.listBadge,
      title: assessment.detail,
      status: assessment.status
    };
  }, [restoredCorrectiveSnapshotsByFileId]);

  const singleViewerNode = useMemo(() => (
    <GeoLimitesViewerDXF
      key={files[currentFileIndex]?.id || fileId || 'no-file'}
      fileId={files[currentFileIndex]?.id || fileId || undefined}
      className="main-viewer"
      onDXFDataLoaded={handleDXFDataLoaded}
      interactive={true}
      onPolygonConfirmed={({ selections, referencePoints }) => openMemorialDocumentPage(
        files[currentFileIndex] || file,
        selections,
        referencePoints || []
      )}
      onGenerateTechnicalSummary={({ viewerData, referencePoints }) => openTechnicalSummaryDocumentPage(
        files[currentFileIndex] || file,
        viewerData,
        referencePoints || []
      )}
      isGeneratingTechnicalSummary={isGeneratingMemorial}
      propertyLandmarks={propertyDetails?.landmarks}
      viewerMode={viewerMode}
      correctiveFocusLotNumber={correctiveFocusLotNumber}
      recentlyCorrectedLotNumber={latestAppliedSuggestionLotNumber}
      activeCorrectiveTool={activeCorrectiveTool}
      onRegisterCorrectiveDraftOperation={registerCorrectiveDraftOperation}
      correctiveSnapshotFileId={(files[currentFileIndex] || file)?.id}
      onCorrectiveSnapshotChanged={registerCorrectiveSnapshot}
      correctiveHistoryCommand={correctiveHistoryCommandsByFileId[(files[currentFileIndex] || file)?.id || '']}
      correctiveSuggestionCommand={currentCorrectiveSuggestionCommand}
      onCorrectiveHistoryStatusChange={registerCorrectiveHistoryStatus}
      correctiveIssues={correctiveIssues}
      onCorrectiveLotInspectionChange={registerCorrectiveLotInspection}
      restoredCorrectiveSnapshot={restoredCorrectiveSnapshotsByFileId[(files[currentFileIndex] || file)?.id || ''] || null}
    />
  ), [
    activeCorrectiveTool,
    correctiveFocusLotNumber,
    correctiveHistoryCommandsByFileId,
    correctiveIssues,
    currentCorrectiveSuggestionCommand,
    currentFileIndex,
    file,
    fileId,
    files,
    isGeneratingMemorial,
    latestAppliedSuggestionLotNumber,
    openMemorialDocumentPage,
    openTechnicalSummaryDocumentPage,
    propertyDetails?.landmarks,
    registerCorrectiveDraftOperation,
    registerCorrectiveHistoryStatus,
    registerCorrectiveLotInspection,
    registerCorrectiveSnapshot,
    restoredCorrectiveSnapshotsByFileId,
    viewerMode
  ]);

  const correctivePanelNode = useMemo(() => {
    if (viewerMode !== 'correct') {
      return undefined;
    }

    return (
      <CorrectivePanel
        hasCorrectiveMode={hasCorrectiveMode}
        correctiveIssuesSourceLabel={correctiveIssuesSourceLabel}
        correctiveIssues={correctiveIssues}
        selectedIssueId={selectedIssueId}
        selectedCorrectiveIssue={selectedCorrectiveIssue}
        activeCorrectiveTool={activeCorrectiveTool}
        currentCorrectiveSnapshot={currentCorrectiveSnapshot}
        currentDraftOperations={currentDraftOperations}
        latestAppliedSuggestion={latestAppliedSuggestion}
        isFocusedSuggestionRecentlyApplied={isFocusedSuggestionRecentlyApplied}
        currentDxfDataAvailable={Boolean(dxfData)}
        savedCorrectiveSnapshot={savedCorrectiveSnapshot}
        restoredCorrectiveSnapshot={restoredCorrectiveSnapshot}
        correctiveHistoryStatus={correctiveHistoryStatus}
        correctiveLotInspection={correctiveLotInspection}
        correctiveSnapshotSaveMessage={correctiveSnapshotSaveMessage}
        correctiveSnapshotLoadMessage={correctiveSnapshotLoadMessage}
        isGeneratingMemorial={isGeneratingMemorial}
        isLoadingCorrectiveSnapshot={isLoadingCorrectiveSnapshot}
        isSavingCorrectiveSnapshot={isSavingCorrectiveSnapshot}
        onSelectIssue={setSelectedIssueId}
        onClearFocus={handleClearCorrectiveFocus}
        onSetActiveCorrectiveTool={setActiveCorrectiveTool}
        onApplySuggestion={handleApplyCorrectiveSuggestion}
        onUndo={handleUndoCorrective}
        onRedo={handleRedoCorrective}
        onPrepareDraft={handlePrepareCorrectiveDraft}
        onRemoveDraftOperation={removeCorrectiveDraftOperation}
        onClearDraft={handleClearCurrentDraft}
        onReopenSnapshot={handleReopenLatestSnapshot}
        onSaveSnapshot={handleSaveCurrentCorrectiveSnapshot}
        onRevalidateSummary={handleRevalidateCorrectiveSummary}
      />
    );
  }, [
    activeCorrectiveTool,
    correctiveHistoryStatus,
    correctiveIssues,
    isFocusedSuggestionRecentlyApplied,
    latestAppliedSuggestionLotNumber,
    correctiveLotInspection,
    correctiveSnapshotLoadMessage,
    correctiveSnapshotSaveMessage,
    currentCorrectiveSnapshot,
    currentDraftOperations,
    dxfData,
    handleApplyCorrectiveSuggestion,
    handleClearCorrectiveFocus,
    handleClearCurrentDraft,
    handlePrepareCorrectiveDraft,
    handleRedoCorrective,
    handleReopenLatestSnapshot,
    handleRevalidateCorrectiveSummary,
    handleSaveCurrentCorrectiveSnapshot,
    handleScanErrors,
    handleUndoCorrective,
    hasCorrectiveMode,
    isGeneratingMemorial,
    isLoadingCorrectiveSnapshot,
    isSavingCorrectiveSnapshot,
    latestAppliedSuggestion,
    removeCorrectiveDraftOperation,
    restoredCorrectiveSnapshot,
    savedCorrectiveSnapshot,
    correctiveIssuesSourceLabel,
    selectedCorrectiveIssue,
    selectedIssueId,
    viewerMode
  ]);

  if (isLoading) {
    return (
      <div className="viewer-page">
        <Loading size="large" text="Carregando arquivo..." />
      </div>
    );
  }

  if (error || (!file && files.length === 0)) {
    return (
      <div className="viewer-page">
        <div className="viewer-error">
          <h2>Erro</h2>
          <p>{error || 'Arquivo não encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={
      <div className="viewer-page">
        <div className="viewer-error">
          <h2>🚨 Erro no Memorial</h2>
          <p>Ocorreu um erro ao carregar o ambiente do memorial.</p>
          <button onClick={() => window.location.reload()}>🔄 Recarregar</button>
        </div>
      </div>
    }>
      <div className="viewer-page">
        {isGeneratingMemorial && (
          <DocumentProcessingOverlay
            generatedDocumentKind={generatedDocumentKind}
            currentFileName={processingFileName}
            memorialCurrentStep={memorialCurrentStep}
            memorialTimeElapsed={memorialTimeElapsed}
            generationProgress={generationProgress}
          />
        )}

        {!documentOnly && (
          <ViewerHeader
            viewerMode={viewerMode}
            activeFileName={activeFileName}
            hasCorrectiveMode={hasCorrectiveMode}
            canScanErrors={Boolean(scanSourceDxfData)}
            correctiveIssuesSourceLabel={correctiveIssuesSourceLabel}
            correctiveIssueCount={correctiveIssues.length}
            isLoadingCorrectiveSnapshot={isLoadingCorrectiveSnapshot}
            correctiveSnapshotLoadMessage={correctiveSnapshotLoadMessage}
            restoredCorrectiveSnapshot={restoredCorrectiveSnapshot}
            onSelectViewMode={handleSelectViewMode}
            onSelectCorrectiveMode={handleSelectCorrectiveMode}
            onScanErrors={handleScanErrors}
            onReopenLatestSnapshot={handleReopenLatestSnapshot}
          />
        )}

        {!documentOnly && (files.length > 1 ? (
          <ViewerMultiFileLayout
            files={files}
            renderViewer={renderMultiFileViewer}
            getFileStatusBadge={getMultiFileStatusBadge}
          />
        ) : (
          <ViewerSingleFileLayout
            viewerNode={singleViewerNode}
            correctivePanelNode={correctivePanelNode}
          />
        ))}

        {memorialError && (
          <div className="memorial-error">
            <p>Erro: {memorialError}</p>
          </div>
        )}

        {documentOnly && (
          <GeneratedDocumentPanel
            generatedDocumentKind={generatedDocumentKind}
            requestedDocumentKind={requestedDocumentKind}
            memorial={memorial}
            technicalSummaryJson={technicalSummaryJson}
            processingContextStatus={processingContextStatus}
            isGenerating={isGeneratingMemorial}
            memorialError={memorialError}
            onDownloadMemorial={generatedDocumentKind !== 'resumo-tecnico' ? downloadMemorial : undefined}
            onCopyMemorial={generatedDocumentKind !== 'resumo-tecnico' ? () => copyGeneratedDocumentText(memorial) : undefined}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Viewer
