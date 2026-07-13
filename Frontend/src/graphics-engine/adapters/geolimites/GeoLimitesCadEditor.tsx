import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useOperationContext } from '@/contexts/OperationContext';
import { useViewerPropertyDetails } from '@/hooks/useViewerPropertyDetails';
import { useAuth } from '@/auth/AuthContext';
import TechnicalSummaryPanel from '@/components/TechnicalSummaryPanel';
import CadEditorBase from '@/graphics-engine/pages/cad-editor/CadEditorBase';
import type { CadEditorHost } from '@/graphics-engine/pages/cad-editor/cadEditorHost';
import type { ConfirmedConfrontationText } from '@/graphics-engine/components/viewer-dxf/types';
import type { ConfirmedLotSelection } from '@/graphics-engine/components/viewer-dxf/types';
import type { ConfirmedReferencePoint } from '@/graphics-engine/components/viewer-dxf/types';
import GeoLimitesViewerDXF from '@/graphics-engine/adapters/geolimites/GeoLimitesViewerDXF';
import {
  GEO_LIMITES_CAD_LAYER_COLOR_CLASSES,
  GEO_LIMITES_CAD_LAYER_PLACEHOLDERS,
  GEO_LIMITES_CAD_LAYERS,
  GEO_LIMITES_CAD_MEASUREMENT_UNITS,
  GEO_LIMITES_CUSTOM_TEXT_TOOL_PRESET_ID,
  GEO_LIMITES_CUSTOM_TEXT_TOOL_PRESET_LABEL,
  GEO_LIMITES_TEXT_TOOL_PRESETS,
  loadGeoLimitesCadEditorSettings
} from '@/graphics-engine/adapters/geolimites/cadEditorContentConfig';
import {
  GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM,
  GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT,
  resolveGeoLimitesFunctionalLayerName
} from '@/graphics-engine/adapters/geolimites/functionalLayerUtils';
import { GEO_LIMITES_CAD_EDITOR_TEXTS } from '@/graphics-engine/adapters/geolimites/cadEditorHostTexts';
import { scanGeoLimitesCorrectiveIssues } from '@/graphics-engine/adapters/geolimites/scanGeoLimitesCorrectiveIssues';
import { useGeoLimitesCadEditorChrome } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorChrome';
import { useGeoLimitesCadEditorCommandController } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorCommandController';
import { useGeoLimitesCadEditorDocumentController } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorDocumentController';
import { useGeoLimitesCadEditorEntityActions } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorEntityActions';
import { useGeoLimitesCadEditorGuideController } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorGuideController';
import { useGeoLimitesCadEditorKeyboardShortcuts } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorKeyboardShortcuts';
import { useGeoLimitesCadEditorLayoutController } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorLayoutController';
import { useGeoLimitesCadEditorModifyController } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorModifyController';
import {
  useGeoLimitesCadEditorBoot,
  useGeoLimitesCadEditorPersistence
} from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorShell';
import { useGeoLimitesCadEditorStateSync } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorStateSync';
import { useGeoLimitesCadEditorTextToolController } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorTextToolController';
import { useGeoLimitesCadEditorToolController } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorToolController';
import { useGeoLimitesCadEditorUiActionController } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorUiActionController';
import { useGeoLimitesCadEditorViewerController } from '@/graphics-engine/adapters/geolimites/useGeoLimitesCadEditorViewerController';
import type { DXFData } from '@/graphics-engine/shared/dxf';
import type { FileMetadata } from '@/types';
import {
  buildGeoLimitesTechnicalSummaryEntities,
  collectGeoLimitesDetectedLotNumbers
} from '@/graphics-engine/adapters/geolimites/technicalSummaryPayload';
import {
  buildTechnicalSummaryRequest,
} from '@/utils/memorialPayload';
import {
  getFallbackPropertyId,
  normalizeMemorialText,
  type MemorialPropertyDataLike
} from '@/utils/memorialDocument';
import {
  buildCurrentTechnicalSummarySelectionValue,
  setAppliedTechnicalSummarySelection,
  setStoredTechnicalSummary
} from '@/utils/technicalSummaryStorage';
import { normalizeProcessingContextStatus } from '@/utils/processingContextStatus';

const TECHNICAL_SUMMARY_STORAGE_PREFIX = 'technicalSummaryJson:';
const DOCUMENT_SUMMARY_STORAGE_PREFIX = 'documentSummaryJson:';
const PROCESSING_CONTEXT_STATUS_STORAGE_PREFIX = 'processingContextStatus:';

const buildTechnicalSummaryStorageKey = (fileId: string): string => `${TECHNICAL_SUMMARY_STORAGE_PREFIX}${fileId}`;
const buildDocumentSummaryStorageKey = (fileId: string): string => `${DOCUMENT_SUMMARY_STORAGE_PREFIX}${fileId}`;
const buildProcessingContextStatusStorageKey = (fileId: string): string => `${PROCESSING_CONTEXT_STATUS_STORAGE_PREFIX}${fileId}`;
import type { PropertyLandmarkView } from '@/graphics-engine/shared/viewer-corrective';
import cadSystemSettingsService, { normalizeCadSystemSettings } from '@/services/cadSystemSettings';
import type { CadEditorSettings } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

interface GeoLimitesPropertyDetailsView extends MemorialPropertyDataLike {
  landmarks?: PropertyLandmarkView[];
}

const buildCadEditorFileMetadata = (fileName: string): FileMetadata => {
  const normalizedName = fileName.trim() || 'desenho-editado.dxf';
  const extension = normalizedName.split('.').pop()?.toLowerCase() || 'dxf';
  const now = new Date().toISOString();
  return {
    id: `cad-editor:${normalizedName}`,
    originalName: normalizedName,
    storedName: normalizedName,
    extension,
    contentType: 'application/dxf',
    sizeBytes: 0,
    createdAt: now,
    updatedAt: now
  };
};

const GeoLimitesCadEditor: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedProperty, activePropertyId } = useOperationContext();
  const { propertyDetails } = useViewerPropertyDetails({
    activePropertyId,
    selectedProperty: selectedProperty as GeoLimitesPropertyDetailsView | null
  });
  const fallbackSystemSettings = useMemo(() => loadGeoLimitesCadEditorSettings(), []);
  const [initialSystemSettings, setInitialSystemSettings] = useState<CadEditorSettings>(fallbackSystemSettings);
  const [isSystemSettingsReady, setIsSystemSettingsReady] = useState(false);
  const canManageSystemSettings = useMemo(
    () => user?.roles?.some((role) => role.name === 'ROLE_ADMIN' || role.name === 'ADMIN') ?? false,
    [user]
  );

  useEffect(() => {
    let isMounted = true;

    const loadSystemSettings = async () => {
      try {
        const response = await cadSystemSettingsService.getSettings();
        if (!isMounted) {
          return;
        }
        setInitialSystemSettings(normalizeCadSystemSettings(response, GEO_LIMITES_CAD_MEASUREMENT_UNITS, fallbackSystemSettings));
      } catch (error) {
        console.error('Nao foi possivel carregar as configuracoes sistemicas do CAD. Usando default padrao do frontend.', error);
      } finally {
        if (isMounted) {
          setIsSystemSettingsReady(true);
        }
      }
    };

    void loadSystemSettings();

    return () => {
      isMounted = false;
    };
  }, [fallbackSystemSettings]);

  const saveSystemSettings = useCallback(async (settings: CadEditorSettings) => {
    const response = await cadSystemSettingsService.updateSettings(settings);
    const normalized = normalizeCadSystemSettings(response, GEO_LIMITES_CAD_MEASUREMENT_UNITS, fallbackSystemSettings);
    setInitialSystemSettings(normalized);
    return normalized;
  }, [fallbackSystemSettings]);

  const generateTechnicalSummary = useMemo(() => async (params: {
    dxfData: DXFData | null | undefined;
    fileName: string;
    selectedLotNumbers?: number[];
    selectedLotSelections?: ConfirmedLotSelection[];
    manualReviewLotNumbers?: number[];
    selectedConfrontationTexts?: ConfirmedConfrontationText[];
    referencePoints?: ConfirmedReferencePoint[];
  }) => {
    const {
      dxfData,
      fileName,
      selectedLotNumbers = [],
      selectedLotSelections = [],
      manualReviewLotNumbers = [],
      selectedConfrontationTexts = [],
      referencePoints = []
    } = params;
    if (!dxfData) {
      throw new Error('Nenhum desenho disponivel para gerar o resumo tecnico.');
    }

    const currentFile = buildCadEditorFileMetadata(fileName);
    const propertyData = (propertyDetails as MemorialPropertyDataLike | null) || null;
    const normalizedSelectedLotSelections = selectedLotSelections
      .filter((selection) => Number.isInteger(selection.lotNumber) && (selection.lotNumber as number) > 0 && selection.polygon.length >= 3)
      .map((selection) => ({
        lotNumber: selection.lotNumber as number,
        polygon: selection.polygon
      }));
    const detectedLotNumbersFromDrawing = collectGeoLimitesDetectedLotNumbers(dxfData);
    const isPartialSummary = selectedLotNumbers.length > 0;
    const replacementLotNumbers = normalizedSelectedLotSelections.map((selection) => selection.lotNumber);
    const scopedDetectedLotNumbers = isPartialSummary
      ? (selectedLotNumbers.length > 0 ? selectedLotNumbers : replacementLotNumbers)
      : detectedLotNumbersFromDrawing;
    const summaryRequest = {
      ...buildTechnicalSummaryRequest({
        currentFile,
        propertyData,
        sourceDxfData: dxfData,
        activePropertyId
      }),
      lotCount: scopedDetectedLotNumbers.length > 0
        ? scopedDetectedLotNumbers.length
        : detectedLotNumbersFromDrawing.length || undefined,
      detectedLotNumbers: scopedDetectedLotNumbers.length > 0
        ? scopedDetectedLotNumbers
        : detectedLotNumbersFromDrawing,
      selectedLotNumbers,
      partialReplacementLotNumbers: replacementLotNumbers,
      manualReviewLotNumbers,
      entities: buildGeoLimitesTechnicalSummaryEntities(dxfData, {
        selectedLotShapes: normalizedSelectedLotSelections
      }),
      selectedReferencePoints: referencePoints.map((referencePoint) => ({
        label: referencePoint.label,
        x: referencePoint.x,
        y: referencePoint.y,
        georeferencedX: referencePoint.georeferencedX,
        georeferencedY: referencePoint.georeferencedY
      })),
      selectedConfrontationTexts: selectedConfrontationTexts.map((selectedText) => ({
        text: selectedText.text,
        x: selectedText.x,
        y: selectedText.y,
        layer: selectedText.layer,
        entityType: selectedText.entityType,
        inferredDirection: selectedText.inferredDirection,
        selectionMode: selectedText.selectionMode,
        segmentStartX: selectedText.segmentStartPoint?.x,
        segmentStartY: selectedText.segmentStartPoint?.y,
        segmentEndX: selectedText.segmentEndPoint?.x,
        segmentEndY: selectedText.segmentEndPoint?.y
      }))
    };

    // #region debug-point C:summary-request
    void fetch('http://127.0.0.1:7777/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: 'mixed-partial-lot-shift',
        runId: 'pre-fix',
        hypothesisId: 'C',
        location: 'GeoLimitesCadEditor.tsx:generateTechnicalSummary',
        msg: '[DEBUG] Generated technical summary request payload',
        data: {
          fileName,
          selectedLotNumbers,
          manualReviewLotNumbers,
          replacementLotNumbers,
          detectedLotNumbersFromDrawing,
          scopedDetectedLotNumbers,
          entityCount: Array.isArray(summaryRequest.entities) ? summaryRequest.entities.length : null,
          selectedLotSelections: normalizedSelectedLotSelections.map((selection) => ({
            lotNumber: selection.lotNumber,
            polygonPointCount: selection.polygon.length,
            firstPoint: selection.polygon[0] ?? null,
            lastPoint: selection.polygon[selection.polygon.length - 1] ?? null
          }))
        },
        ts: Date.now()
      })
    }).catch(() => undefined);
    // #endregion

    if (!summaryRequest.propertyId) {
      summaryRequest.propertyId = getFallbackPropertyId();
    }

    const response = await api.post('/memorial/generate-summary', summaryRequest);
    const summaryJson = typeof response.data?.technicalSummaryJson === 'string'
      ? response.data.technicalSummaryJson
      : '';
    const documentSummaryJson = typeof response.data?.documentSummaryJson === 'string'
      ? response.data.documentSummaryJson
      : '';
    const processingContextStatus = normalizeProcessingContextStatus(response.data?.processingContextStatus);
    const summaryText = normalizeMemorialText(
      response.data?.memorialText || 'Resumo tecnico gerado com sucesso, mas sem detalhes tecnicos.'
    );

    if (!summaryJson.trim()) {
      throw new Error('O backend retornou um resumo tecnico vazio. O resultado anterior foi preservado para evitar reutilizar um resumo antigo.');
    }

    localStorage.setItem(buildTechnicalSummaryStorageKey(currentFile.id), summaryJson);
    localStorage.setItem(buildDocumentSummaryStorageKey(currentFile.id), documentSummaryJson);
    if (processingContextStatus) {
      localStorage.setItem(
        buildProcessingContextStatusStorageKey(currentFile.id),
        JSON.stringify(processingContextStatus)
      );
    } else {
      localStorage.removeItem(buildProcessingContextStatusStorageKey(currentFile.id));
    }

    setStoredTechnicalSummary({
      summaryJson,
      documentSummaryJson,
      processingContextStatus: processingContextStatus || undefined,
      summaryText,
      analyzedFile: currentFile.originalName,
      generatedAt: new Date().toISOString(),
      source: 'cad-editor',
      sourceFileId: currentFile.id
    }, activePropertyId);
    setAppliedTechnicalSummarySelection(
      buildCurrentTechnicalSummarySelectionValue(currentFile.id),
      activePropertyId
    );

    return {
      summaryJson,
      documentSummaryJson,
      summaryText,
      analyzedFileName: currentFile.originalName,
      processingContextStatus
    };
  }, [activePropertyId, propertyDetails]);

  const host = useMemo<CadEditorHost>(() => ({
    ViewerComponent: GeoLimitesViewerDXF,
    TechnicalSummaryPanelComponent: TechnicalSummaryPanel,
    baseLayers: GEO_LIMITES_CAD_LAYERS,
    layerColorClasses: GEO_LIMITES_CAD_LAYER_COLOR_CLASSES,
    layerPlaceholderIds: GEO_LIMITES_CAD_LAYER_PLACEHOLDERS,
    propertyLandmarks: propertyDetails?.landmarks,
    defaultActiveLayerName: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM,
    defaultAnnotationLayerName: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT,
    defaultTextAnnotationLayerName: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT,
    resolveFunctionalLayerName: resolveGeoLimitesFunctionalLayerName,
    scanCorrectiveIssues: scanGeoLimitesCorrectiveIssues,
    generateTechnicalSummary,
    openStandardsAndTemplates: () => navigate('/standards'),
    saveSystemSettings,
    canManageSystemSettings,
    measurementUnitOptions: GEO_LIMITES_CAD_MEASUREMENT_UNITS,
    textToolPresets: GEO_LIMITES_TEXT_TOOL_PRESETS,
    customTextToolPresetId: GEO_LIMITES_CUSTOM_TEXT_TOOL_PRESET_ID,
    customTextToolPresetLabel: GEO_LIMITES_CUSTOM_TEXT_TOOL_PRESET_LABEL,
    texts: {
      initialEditorNotice: GEO_LIMITES_CAD_EDITOR_TEXTS.initialEditorNotice,
      textPlacementPointNotice: GEO_LIMITES_CAD_EDITOR_TEXTS.textPlacementPointNotice,
      clearSelectedEntitiesByContextMenuNotice: 'Selecao de entidades limpa pelo menu contextual.'
    },
    useBoot: () => useGeoLimitesCadEditorBoot({ initialSystemSettings }),
    usePersistence: useGeoLimitesCadEditorPersistence,
    useCadEditorChrome: useGeoLimitesCadEditorChrome,
    useCadEditorCommandController: useGeoLimitesCadEditorCommandController,
    useCadEditorDocumentController: useGeoLimitesCadEditorDocumentController,
    useCadEditorEntityActions: useGeoLimitesCadEditorEntityActions,
    useCadEditorGuideController: useGeoLimitesCadEditorGuideController,
    useCadEditorKeyboardShortcuts: useGeoLimitesCadEditorKeyboardShortcuts,
    useCadEditorLayoutController: useGeoLimitesCadEditorLayoutController,
    useCadEditorModifyController: useGeoLimitesCadEditorModifyController,
    useCadEditorStateSync: useGeoLimitesCadEditorStateSync,
    useCadEditorTextToolController: useGeoLimitesCadEditorTextToolController,
    useCadEditorToolController: useGeoLimitesCadEditorToolController,
    useCadEditorUiActionController: useGeoLimitesCadEditorUiActionController,
    useCadEditorViewerController: useGeoLimitesCadEditorViewerController
  }), [
    canManageSystemSettings,
    generateTechnicalSummary,
    initialSystemSettings,
    navigate,
    propertyDetails?.landmarks,
    saveSystemSettings
  ]);

  if (!isSystemSettingsReady) {
    return <div className="page-loading-state">Carregando configuracoes do sistema...</div>;
  }

  return <CadEditorBase host={host} />;
};

export default GeoLimitesCadEditor;
