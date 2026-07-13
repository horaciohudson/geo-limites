import { useCallback } from 'react';
import type { ConfirmedLotSelection, ConfirmedReferencePoint } from '@/graphics-engine/components/viewer-dxf';
import api from '@/services/api';
import aiService from '@/services/aiService';
import { inferPrimaryGeoLimitesLotCount } from '@/graphics-engine/adapters/geolimites/geoLimitesLotTextUtils';
import {
  buildGeoLimitesTechnicalSummaryEntities,
  collectGeoLimitesDetectedLotNumbers
} from '@/graphics-engine/adapters/geolimites/technicalSummaryPayload';
import type { FileMetadata } from '@/types';
import type { DXFData } from '@/utils/dxfParser';
import {
  buildInteractiveMemorial,
  ensureLotMemorialHeader,
  extractMemorialTextFromResponse,
  getFallbackPropertyId,
  isValidLotMemorial,
  normalizeMemorialText,
  resolveMemorialProjectName,
  sanitizeLotBody,
  sendSelectionDebug,
  splitLotMemorialParts,
  type MemorialPropertyDataLike
} from '@/utils/memorialDocument';
import {
  buildBaseMemorialRequest,
  buildTechnicalSummaryRequest,
  type BaseMemorialRequest
} from '@/utils/memorialPayload';
import {
  MEMORIAL_SELECTION_DRAFT_BY_PROPERTY_KEY,
  SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY,
  SELECTED_TEMPLATE_BY_PROPERTY_KEY,
  getPropertyScopedValue,
  readScopedStorageMap
} from '@/utils/operationContext';
import { getTechnicalSummaryExampleJson } from '@/utils/technicalSummaryExamples';
import {
  normalizeProcessingContextStatus,
  resolveTechnicalSummaryProcessingContext,
  type ProcessingContextStatusDTO
} from '@/utils/processingContextStatus';
import {
  buildCurrentTechnicalSummarySelectionValue,
  getAppliedTechnicalSummarySelection,
  parseAppliedTechnicalSummarySelection,
  getStoredTechnicalSummary,
  setAppliedTechnicalSummarySelection,
  setStoredTechnicalSummary
} from '@/utils/technicalSummaryStorage';

interface UseDocumentGenerationActionsParams {
  file: FileMetadata | null;
  files: FileMetadata[];
  currentFileIndex: number;
  dxfData: DXFData | null;
  selectedProperty: MemorialPropertyDataLike | null;
  activePropertyId?: string | null;
  setCurrentFileIndex: (index: number) => void;
  setMemorialError: (message: string) => void;
  beginGeneration: (kind: 'memorial' | 'resumo-tecnico', initialStep: string) => void;
  updateGeneration: (params: { progress?: number; step?: string }) => void;
  completeGeneration: (params: {
    memorial: string;
    technicalSummaryJson?: string;
    processingContextStatus?: ProcessingContextStatusDTO;
    step: string;
  }) => void;
  failGeneration: (message: string, step?: string) => void;
  getErrorMessage: (error: unknown, fallback: string) => string;
}

const TECHNICAL_SUMMARY_STORAGE_PREFIX = 'technicalSummaryJson:';
const DOCUMENT_SUMMARY_STORAGE_PREFIX = 'documentSummaryJson:';
const PROCESSING_CONTEXT_STATUS_STORAGE_PREFIX = 'processingContextStatus:';

const buildTechnicalSummaryStorageKey = (fileId: string): string => `${TECHNICAL_SUMMARY_STORAGE_PREFIX}${fileId}`;
const buildDocumentSummaryStorageKey = (fileId: string): string => `${DOCUMENT_SUMMARY_STORAGE_PREFIX}${fileId}`;
const buildProcessingContextStatusStorageKey = (fileId: string): string => `${PROCESSING_CONTEXT_STATUS_STORAGE_PREFIX}${fileId}`;

const readFileScopedTechnicalSummaryJson = (fileId?: string | null): string | null => {
  if (!fileId) {
    return null;
  }

  const storedValue = localStorage.getItem(buildTechnicalSummaryStorageKey(fileId));
  return storedValue && storedValue.trim() ? storedValue : null;
};

const readFileScopedDocumentSummaryJson = (fileId?: string | null): string | null => {
  if (!fileId) {
    return null;
  }

  const storedValue = localStorage.getItem(buildDocumentSummaryStorageKey(fileId));
  return storedValue && storedValue.trim() ? storedValue : null;
};

const pickStandardIdFromNormCollection = (value: unknown): string | null => {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const firstItem = value[0] as unknown;
  if (typeof firstItem === 'string' && firstItem.trim()) {
    return firstItem.trim();
  }

  if (firstItem && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
    const normRecord = firstItem as { id?: unknown };
    if (typeof normRecord.id === 'string' && normRecord.id.trim()) {
      return normRecord.id.trim();
    }
  }

  return null;
};

const pickStandardIdFromDraft = (value: unknown): string | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const draftRecord = value as { selectedStandards?: unknown };
  return pickStandardIdFromNormCollection(draftRecord.selectedStandards);
};

interface StoredTemplateSelection {
  template_id?: string;
  backendTemplateId?: string;
  name?: string;
}

interface AppliedTemplateSelection {
  templateName: string | null;
  templateBackendId: string | null;
}

const parseStoredTemplateSelection = (value: unknown): StoredTemplateSelection | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string' && value.trim()) {
    return { template_id: value.trim() };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as StoredTemplateSelection;
  const templateId = typeof record.template_id === 'string' && record.template_id.trim()
    ? record.template_id.trim()
    : typeof record.name === 'string' && record.name.trim()
      ? record.name.trim()
      : '';
  const backendTemplateId = typeof record.backendTemplateId === 'string' && record.backendTemplateId.trim()
    ? record.backendTemplateId.trim()
    : '';

  if (!templateId && !backendTemplateId) {
    return null;
  }

  return {
    ...record,
    template_id: templateId || undefined,
    backendTemplateId: backendTemplateId || undefined
  };
};

export const useDocumentGenerationActions = ({
  file,
  files,
  currentFileIndex,
  dxfData,
  selectedProperty,
  activePropertyId,
  setCurrentFileIndex,
  setMemorialError,
  beginGeneration,
  updateGeneration,
  completeGeneration,
  failGeneration,
  getErrorMessage
}: UseDocumentGenerationActionsParams) => {
  const resolveSelectedStandardId = useCallback((): string | null => {
    const candidatePropertyIds = [
      activePropertyId,
      selectedProperty?.propertyId,
      selectedProperty?.id
    ].filter((value, index, self): value is string => typeof value === 'string' && value.trim().length > 0 && self.indexOf(value) === index);

    for (const propertyId of candidatePropertyIds) {
      const scopedNorms = getPropertyScopedValue<unknown>(SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY, propertyId);
      const scopedStandardId = pickStandardIdFromNormCollection(scopedNorms);
      if (scopedStandardId) {
        return scopedStandardId;
      }

      const scopedDraft = getPropertyScopedValue<unknown>(MEMORIAL_SELECTION_DRAFT_BY_PROPERTY_KEY, propertyId);
      const draftStandardId = pickStandardIdFromDraft(scopedDraft);
      if (draftStandardId) {
        return draftStandardId;
      }
    }

    const globalDraftStandardId = pickStandardIdFromDraft((() => {
      try {
        const rawValue = localStorage.getItem('memorialSelectionDraft');
        return rawValue ? JSON.parse(rawValue) as unknown : null;
      } catch (error) {
        console.error('Erro ao ler rascunho global do memorial:', error);
        return null;
      }
    })());
    if (globalDraftStandardId) {
      return globalDraftStandardId;
    }

    try {
      const savedNorms = localStorage.getItem('selectedMemorialNorms');
      if (savedNorms) {
        const parsedNorms = JSON.parse(savedNorms) as unknown;
        const localStorageStandardId = pickStandardIdFromNormCollection(parsedNorms);
        if (localStorageStandardId) {
          return localStorageStandardId;
        }
      }
    } catch (error) {
      console.error('Erro ao ler normas salvas para o documento:', error);
    }

    const scopedNormsMap = readScopedStorageMap<unknown>(SELECTED_MEMORIAL_NORMS_BY_PROPERTY_KEY);
    for (const normCollection of Object.values(scopedNormsMap)) {
      const scopedStandardId = pickStandardIdFromNormCollection(normCollection);
      if (scopedStandardId) {
        return scopedStandardId;
      }
    }

    const scopedDraftMap = readScopedStorageMap<unknown>(MEMORIAL_SELECTION_DRAFT_BY_PROPERTY_KEY);
    for (const draftValue of Object.values(scopedDraftMap)) {
      const draftStandardId = pickStandardIdFromDraft(draftValue);
      if (draftStandardId) {
        return draftStandardId;
      }
    }

    return null;
  }, [activePropertyId, selectedProperty?.id, selectedProperty?.propertyId]);

  const resolveSelectedTemplate = useCallback((): AppliedTemplateSelection => {
    const candidatePropertyIds = [
      activePropertyId,
      selectedProperty?.propertyId,
      selectedProperty?.id
    ].filter((value, index, self): value is string => typeof value === 'string' && value.trim().length > 0 && self.indexOf(value) === index);

    for (const propertyId of candidatePropertyIds) {
      const scopedTemplate = parseStoredTemplateSelection(
        getPropertyScopedValue<unknown>(SELECTED_TEMPLATE_BY_PROPERTY_KEY, propertyId)
      );
      if (scopedTemplate?.template_id || scopedTemplate?.backendTemplateId) {
        return {
          templateName: scopedTemplate.template_id || null,
          templateBackendId: scopedTemplate.backendTemplateId || null
        };
      }
    }

    try {
      const rawTemplate = localStorage.getItem('selectedTemplate');
      const localTemplate = parseStoredTemplateSelection(
        rawTemplate ? JSON.parse(rawTemplate) as unknown : null
      );
      if (localTemplate?.template_id || localTemplate?.backendTemplateId) {
        return {
          templateName: localTemplate.template_id || null,
          templateBackendId: localTemplate.backendTemplateId || null
        };
      }
    } catch (error) {
      console.error('Erro ao ler template aplicado para o memorial:', error);
    }

    return {
      templateName: null,
      templateBackendId: null
    };
  }, [activePropertyId, selectedProperty?.id, selectedProperty?.propertyId]);

  const resolveAppliedTechnicalSummaryJson = useCallback(async (preferredFileId?: string | null): Promise<string | null> => {
    const currentResolvedFileId = preferredFileId || files[currentFileIndex]?.id || file?.id || null;
    const fileScopedSummaryJson = readFileScopedTechnicalSummaryJson(currentResolvedFileId);
    let missingExplicitCurrentSelection = false;
    const globalStoredSummary = getStoredTechnicalSummary();

    const candidatePropertyIds = [
      activePropertyId,
      selectedProperty?.propertyId,
      selectedProperty?.id
    ].filter((value, index, self): value is string => typeof value === 'string' && value.trim().length > 0 && self.indexOf(value) === index);
    const appliedSelectionEntries = candidatePropertyIds.map((propertyId) => ({
      propertyId,
      storedCurrentSummary: getStoredTechnicalSummary(propertyId),
      appliedSelection: parseAppliedTechnicalSummarySelection(
        getAppliedTechnicalSummarySelection(propertyId)
      )
    }));

    for (const { storedCurrentSummary, appliedSelection } of appliedSelectionEntries) {
      if (appliedSelection?.kind === 'example' && appliedSelection.exampleId) {
        const exampleSummaryJson = await getTechnicalSummaryExampleJson(appliedSelection.exampleId);
        if (exampleSummaryJson?.trim()) {
          return exampleSummaryJson;
        }
        continue;
      }

      const shouldUseCurrentSummary = Boolean(
        (storedCurrentSummary?.summaryJson?.trim() && !appliedSelection)
        || appliedSelection?.kind === 'current'
      );

      if (shouldUseCurrentSummary) {
        const effectiveCurrentFileId =
          appliedSelection?.kind === 'current' && appliedSelection.fileId
            ? appliedSelection.fileId
            : storedCurrentSummary?.sourceFileId || null;

        if (effectiveCurrentFileId) {
          const selectedFileScopedSummaryJson = readFileScopedTechnicalSummaryJson(effectiveCurrentFileId);
          if (selectedFileScopedSummaryJson) {
            return selectedFileScopedSummaryJson;
          }

          if (
            storedCurrentSummary?.sourceFileId === effectiveCurrentFileId
            && storedCurrentSummary.summaryJson?.trim()
          ) {
            return storedCurrentSummary.summaryJson;
          }

          if (appliedSelection?.kind === 'current' && appliedSelection.fileId) {
            // Respect an explicit file selection: do not silently fall back to another summary.
            missingExplicitCurrentSelection = true;
          }
          continue;
        }

        if (storedCurrentSummary?.summaryJson?.trim()) {
          return storedCurrentSummary.summaryJson;
        }

        if (fileScopedSummaryJson) {
          return fileScopedSummaryJson;
        }
      }
    }

    if (missingExplicitCurrentSelection) {
      return null;
    }

    for (const { storedCurrentSummary, appliedSelection } of appliedSelectionEntries) {
      if (appliedSelection || !storedCurrentSummary?.summaryJson?.trim()) {
        continue;
      }

      return storedCurrentSummary.summaryJson;
    }

    if (fileScopedSummaryJson) {
      return fileScopedSummaryJson;
    }

    const fallbackStoredSummary = candidatePropertyIds
      .map((propertyId) => getStoredTechnicalSummary(propertyId))
      .find((summary): summary is NonNullable<typeof summary> => Boolean(summary))
      || getStoredTechnicalSummary(activePropertyId)
      || globalStoredSummary;
    if (fallbackStoredSummary?.summaryJson?.trim()) {
      return fallbackStoredSummary.summaryJson;
    }

    return null;
  }, [activePropertyId, currentFileIndex, file, files, selectedProperty?.id, selectedProperty?.propertyId]);

  const resolveAppliedDocumentSummaryJson = useCallback(async (preferredFileId?: string | null): Promise<string | null> => {
    const currentResolvedFileId = preferredFileId || files[currentFileIndex]?.id || file?.id || null;
    const fileScopedDocumentSummaryJson = readFileScopedDocumentSummaryJson(currentResolvedFileId);
    let missingExplicitCurrentSelection = false;
    const globalStoredSummary = getStoredTechnicalSummary();

    const candidatePropertyIds = [
      activePropertyId,
      selectedProperty?.propertyId,
      selectedProperty?.id
    ].filter((value, index, self): value is string => typeof value === 'string' && value.trim().length > 0 && self.indexOf(value) === index);
    const appliedSelectionEntries = candidatePropertyIds.map((propertyId) => ({
      propertyId,
      storedCurrentSummary: getStoredTechnicalSummary(propertyId),
      appliedSelection: parseAppliedTechnicalSummarySelection(
        getAppliedTechnicalSummarySelection(propertyId)
      )
    }));

    for (const { storedCurrentSummary, appliedSelection } of appliedSelectionEntries) {
      const shouldUseCurrentSummary = Boolean(
        storedCurrentSummary?.documentSummaryJson?.trim()
        || storedCurrentSummary?.summaryJson?.trim()
        || appliedSelection?.kind === 'current'
      );

      if (shouldUseCurrentSummary) {
        const effectiveCurrentFileId =
          appliedSelection?.kind === 'current' && appliedSelection.fileId
            ? appliedSelection.fileId
            : storedCurrentSummary?.sourceFileId || null;

        if (effectiveCurrentFileId) {
          const selectedFileScopedDocumentSummaryJson = readFileScopedDocumentSummaryJson(effectiveCurrentFileId);
          if (selectedFileScopedDocumentSummaryJson) {
            return selectedFileScopedDocumentSummaryJson;
          }

          if (
            storedCurrentSummary?.sourceFileId === effectiveCurrentFileId
            && storedCurrentSummary.documentSummaryJson?.trim()
          ) {
            return storedCurrentSummary.documentSummaryJson;
          }

          if (appliedSelection?.kind === 'current' && appliedSelection.fileId) {
            missingExplicitCurrentSelection = true;
          }
          continue;
        }

        if (storedCurrentSummary?.documentSummaryJson?.trim()) {
          return storedCurrentSummary.documentSummaryJson;
        }

        if (fileScopedDocumentSummaryJson) {
          return fileScopedDocumentSummaryJson;
        }
      }
    }

    if (missingExplicitCurrentSelection) {
      return null;
    }

    if (fileScopedDocumentSummaryJson) {
      return fileScopedDocumentSummaryJson;
    }

    const fallbackStoredSummary = candidatePropertyIds
      .map((propertyId) => getStoredTechnicalSummary(propertyId))
      .find((summary): summary is NonNullable<typeof summary> => Boolean(summary))
      || getStoredTechnicalSummary(activePropertyId)
      || globalStoredSummary;
    if (fallbackStoredSummary?.documentSummaryJson?.trim()) {
      return fallbackStoredSummary.documentSummaryJson;
    }

    return null;
  }, [activePropertyId, currentFileIndex, file, files, selectedProperty?.id, selectedProperty?.propertyId]);

  const resolveAppliedProcessingContextStatus = useCallback((preferredFileId?: string | null): ProcessingContextStatusDTO | null => {
    const currentResolvedFileId = preferredFileId || files[currentFileIndex]?.id || file?.id || null;
    const fileScopedSummaryJson = readFileScopedTechnicalSummaryJson(currentResolvedFileId);
    let missingExplicitCurrentSelection = false;
    const globalStoredSummary = getStoredTechnicalSummary();

    const candidatePropertyIds = [
      activePropertyId,
      selectedProperty?.propertyId,
      selectedProperty?.id
    ].filter((value, index, self): value is string => typeof value === 'string' && value.trim().length > 0 && self.indexOf(value) === index);
    const appliedSelectionEntries = candidatePropertyIds.map((propertyId) => ({
      propertyId,
      storedCurrentSummary: getStoredTechnicalSummary(propertyId),
      appliedSelection: parseAppliedTechnicalSummarySelection(
        getAppliedTechnicalSummarySelection(propertyId)
      )
    }));

    for (const { storedCurrentSummary, appliedSelection } of appliedSelectionEntries) {
      const shouldUseCurrentSummary = Boolean(
        storedCurrentSummary?.summaryJson?.trim() || appliedSelection?.kind === 'current'
      );

      if (!shouldUseCurrentSummary) {
        continue;
      }

      const effectiveCurrentFileId =
        appliedSelection?.kind === 'current' && appliedSelection.fileId
          ? appliedSelection.fileId
          : storedCurrentSummary?.sourceFileId || null;

      if (effectiveCurrentFileId) {
        if (storedCurrentSummary?.sourceFileId === effectiveCurrentFileId) {
          return normalizeProcessingContextStatus(storedCurrentSummary.processingContextStatus);
        }

        if (appliedSelection?.kind === 'current' && appliedSelection.fileId) {
          missingExplicitCurrentSelection = true;
        }
        continue;
      }

      if (storedCurrentSummary?.processingContextStatus) {
        return normalizeProcessingContextStatus(storedCurrentSummary.processingContextStatus);
      }

      if (fileScopedSummaryJson) {
        return null;
      }
    }

    if (missingExplicitCurrentSelection) {
      return null;
    }

    const fallbackStoredSummary = candidatePropertyIds
      .map((propertyId) => getStoredTechnicalSummary(propertyId))
      .find((summary): summary is NonNullable<typeof summary> => Boolean(summary))
      || getStoredTechnicalSummary(activePropertyId)
      || globalStoredSummary;

    return normalizeProcessingContextStatus(fallbackStoredSummary?.processingContextStatus);
  }, [activePropertyId, currentFileIndex, file, files, selectedProperty?.id, selectedProperty?.propertyId]);

  const handlePolygonConfirmed = useCallback(async (
    selections: ConfirmedLotSelection[],
    referencePoints: ConfirmedReferencePoint[] = [],
    sourceFile?: FileMetadata | null
  ) => {
    const currentFile = sourceFile || files[currentFileIndex] || file;
    try {
      if (!currentFile) {
        setMemorialError('Arquivo de origem não disponível para gerar o memorial interativo.');
        return;
      }

      const fileIndex = files.findIndex((fileItem) => fileItem.id === currentFile.id);
      if (fileIndex >= 0 && fileIndex !== currentFileIndex) {
        setCurrentFileIndex(fileIndex);
      }

      beginGeneration('memorial', 'Iniciando geração em lote...');

      const standardId = resolveSelectedStandardId();
      if (!standardId) {
        failGeneration('❌ ERRO: Nenhuma norma selecionada! Vá em "Operação > Configurar Memorial" e aplique uma norma antes de gerar o memorial interativo.');
        return;
      }

      const propertyData = selectedProperty;
      const propertyId = activePropertyId || propertyData?.propertyId || propertyData?.id || getFallbackPropertyId();
      const aiConfig = aiService.getAIConfig();
      const selectedTemplate = resolveSelectedTemplate();
      const lotMemorials: Array<{ lotNumber: number; content: string }> = [];
      let finalConclusion = '';
      let finalHeader = '';
      const orderedSelections = [...selections].sort((left, right) => {
        const leftLot = left.lotNumber ?? Number.MAX_SAFE_INTEGER;
        const rightLot = right.lotNumber ?? Number.MAX_SAFE_INTEGER;
        return leftLot - rightLot;
      });

      for (let i = 0; i < orderedSelections.length; i++) {
        const selection = orderedSelections[i];
        const lotNumber = selection.lotNumber ?? (i + 1);
        updateGeneration({
          step: `Gerando memorial do Lote ${lotNumber} de ${orderedSelections.length}...`,
          progress: Math.round(((i + 1) / orderedSelections.length) * 100)
        });

        const interactiveLayer = `Seleção Interativa Lote ${lotNumber}`;
        const polylineEntity = {
          type: 'POLYLINE',
          layer: interactiveLayer,
          vertices: selection.polygon
        };

        const request = {
          entities: [polylineEntity],
          fileName: currentFile.originalName,
          projectName: resolveMemorialProjectName(currentFile, propertyData),
          projectDescription: `Lote ${lotNumber} - Memorial gerado a partir de seleção em lote`,
          standardId,
          propertyId,
          lotCount: 1,
          billableLotCount: orderedSelections.length,
          chargeCredits: i === 0,
          selectedLayers: [interactiveLayer],
          propertyData: propertyData ? {
            registrationNumber: propertyData.registrationNumber,
            name: propertyData.name,
            street: propertyData.street,
            number: propertyData.number || undefined,
            neighborhood: propertyData.neighborhood,
            city: propertyData.city,
            state: propertyData.state,
            ownerName: propertyData.ownerName,
            ownerDocument: propertyData.ownerDocument,
            propertyType: propertyData.propertyType
          } : null,
          selectedConfrontationTexts: selection.selectedConfrontationTexts.map((selectedText) => ({
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
          })),
          selectedReferencePoints: referencePoints.map((referencePoint) => ({
            label: referencePoint.label,
            x: referencePoint.x,
            y: referencePoint.y,
            georeferencedX: referencePoint.georeferencedX,
            georeferencedY: referencePoint.georeferencedY
          })),
          ...aiService.getAIParameters()
        };

        sendSelectionDebug(
          'C',
          'useDocumentGenerationActions:handlePolygonConfirmed:request',
          '[DEBUG] Payload enviado para gerar lote interativo',
          {
            loopIndex: i + 1,
            requestedLotNumber: lotNumber,
            interactiveLayer,
            selectedLayers: request.selectedLayers,
            projectDescription: request.projectDescription,
            vertexCount: selection.polygon?.length || 0,
            firstVertex: selection.polygon?.[0] || null,
            textsInside: selection.textsInside,
            selectedConfrontationTexts: request.selectedConfrontationTexts,
            selectedReferencePoints: request.selectedReferencePoints
          }
        );

        const summaryResponse = await api.post('/memorial/generate-summary', request);
        const technicalSummaryJson = typeof summaryResponse.data?.technicalSummaryJson === 'string'
          ? summaryResponse.data.technicalSummaryJson
          : '';
        const documentSummaryJson = typeof summaryResponse.data?.documentSummaryJson === 'string'
          ? summaryResponse.data.documentSummaryJson
          : '';
        const processingContextStatus = normalizeProcessingContextStatus(summaryResponse.data?.processingContextStatus);

        if (!technicalSummaryJson.trim()) {
          throw new Error(`Resumo tecnico vazio para o lote ${lotNumber}.`);
        }
        const lotProcessingContextAssessment = resolveTechnicalSummaryProcessingContext(
          technicalSummaryJson,
          processingContextStatus
        );
        if (lotProcessingContextAssessment.status !== 'complete') {
          updateGeneration({
            step: `Lote ${lotNumber}: resumo tecnico com aviso de contexto territorial.`
          });
        }

        sendSelectionDebug(
          'C',
          'useDocumentGenerationActions:handlePolygonConfirmed:summary-response',
          '[DEBUG] Resumo tecnico gerado para o lote interativo',
          {
            loopIndex: i + 1,
            requestedLotNumber: lotNumber,
            technicalSummaryLength: technicalSummaryJson.length,
            templateName: selectedTemplate.templateName,
            templateBackendId: selectedTemplate.templateBackendId
          }
        );

        const { entities: _ignoredEntities, ...requestWithoutEntities } = request;
        const memorialRequest = {
          ...requestWithoutEntities,
          technicalSummaryJson,
          documentSummaryJson,
          templateName: selectedTemplate.templateName,
          templateBackendId: selectedTemplate.templateBackendId
        };

        const response = await api.post(aiConfig.endpoint, memorialRequest);
        const realMemorial = extractMemorialTextFromResponse(response.data);
        const normalizedLotMemorial = normalizeMemorialText(realMemorial);
        const lotMemorialParts = splitLotMemorialParts(normalizedLotMemorial);
        const normalizedLotBody = sanitizeLotBody(
          ensureLotMemorialHeader(lotMemorialParts.body, lotNumber),
          lotNumber
        );

        if (!isValidLotMemorial(normalizedLotBody, lotNumber)) {
          sendSelectionDebug(
            'D',
            'useDocumentGenerationActions:handlePolygonConfirmed:coerce-invalid-lot',
            '[DEBUG] Lote reaproveitado no frontend apos validacao final falhar',
            {
              lotNumber,
              normalizedLength: normalizedLotBody.length,
              normalizedPreview: normalizedLotBody.slice(0, 180)
            }
          );
        }

        if (!finalHeader && lotMemorialParts.header) {
          finalHeader = lotMemorialParts.header;
        }

        if (!finalConclusion && lotMemorialParts.conclusion) {
          finalConclusion = lotMemorialParts.conclusion;
        }

        lotMemorials.push({
          lotNumber,
          content: normalizedLotBody || `LOTE ${lotNumber}:\nGeracao inconsistente para este lote. Revisar manualmente.`
        });
      }

      completeGeneration({
        memorial: buildInteractiveMemorial(lotMemorials, currentFile, propertyData, finalConclusion, finalHeader),
        step: 'Geração em lote concluída!'
      });
    } catch (err: unknown) {
      console.error('Erro ao gerar memorial interativo:', err);
      failGeneration(getErrorMessage(err, 'Erro ao gerar memorial descritivo a partir da seleção'));
    }
  }, [
    activePropertyId,
    beginGeneration,
    currentFileIndex,
    extractMemorialTextFromResponse,
    file,
    files,
    getErrorMessage,
    getFallbackPropertyId,
    resolveSelectedStandardId,
    resolveSelectedTemplate,
    sendSelectionDebug,
    setMemorialError,
    splitLotMemorialParts,
    updateGeneration
  ]);

  const generateMemorial = useCallback(async (
    _sourceDxfData?: DXFData | null,
    sourceFile?: FileMetadata | null
  ) => {
    const currentFile = sourceFile || files[currentFileIndex] || file;
    const currentFileId = currentFile?.id;
    const fallbackFileName = (
      selectedProperty?.name?.trim()
      || selectedProperty?.registrationNumber?.trim()
      || 'ResumoTecnicoAplicado.json'
    );
    const effectiveCurrentFile: FileMetadata = currentFile || {
      id: currentFileId || 'applied-technical-summary',
      originalName: fallbackFileName,
      storedName: fallbackFileName,
      extension: fallbackFileName.split('.').pop()?.toLowerCase() || 'json',
      contentType: 'application/json',
      sizeBytes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      beginGeneration('memorial', 'Validando a configuracao do memorial...');

      const standardId = resolveSelectedStandardId();
      if (!standardId) {
        failGeneration('❌ ERRO: Nenhuma norma selecionada! Vá em "Operação > Configurar Memorial" e aplique uma norma antes de gerar o memorial.');
        return;
      }
      updateGeneration({
        progress: 8,
        step: 'Norma aplicada confirmada. Carregando o Resumo Tecnico selecionado...'
      });

      const technicalSummaryJson = await resolveAppliedTechnicalSummaryJson(currentFileId);
      if (!technicalSummaryJson) {
        failGeneration('❌ ERRO: Nenhum Resumo Tecnico aplicado! Vá em "Operação > Configurar Memorial" e aplique um JSON antes de gerar o memorial.');
        return;
      }
      updateGeneration({
        progress: 18,
        step: 'Resumo Tecnico carregado. Validando o contexto operacional aplicado...'
      });
      const processingContextAssessment = resolveTechnicalSummaryProcessingContext(
        technicalSummaryJson,
        resolveAppliedProcessingContextStatus(currentFileId)
      );
      if (processingContextAssessment.status !== 'complete') {
        updateGeneration({
          progress: 26,
          step: processingContextAssessment.notices[0]?.message || 'Resumo tecnico aplicado com aviso de contexto territorial.'
        });
      } else {
        updateGeneration({
          progress: 28,
          step: 'Resumo Tecnico validado. Preparando template e parametros finais...'
        });
      }
      const documentSummaryJson = await resolveAppliedDocumentSummaryJson(currentFileId);

      const propertyData = selectedProperty;
      const selectedTemplate = resolveSelectedTemplate();
      updateGeneration({
        progress: 38,
        step: 'Template configurado. Montando a solicitacao final do memorial...'
      });
      const memorialRequest: BaseMemorialRequest = {
        ...buildBaseMemorialRequest({
          currentFile: effectiveCurrentFile,
          propertyData,
          activePropertyId
        }),
        standardId,
        technicalSummaryJson,
        documentSummaryJson,
        templateName: selectedTemplate.templateName,
        templateBackendId: selectedTemplate.templateBackendId
      };

      if (!memorialRequest.propertyId) {
        const fallbackPropertyId = getFallbackPropertyId();
        if (fallbackPropertyId) {
          memorialRequest.propertyId = fallbackPropertyId;
        } else {
          console.error('❌ Não foi possível obter propertyId válido');
        }
      }

      const aiConfig = aiService.getAIConfig();
      updateGeneration({
        progress: 52,
        step: 'Enviando norma, template e Resumo Tecnico para geracao do memorial...'
      });
      // #region debug-point A:memorial-request
      fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "memorial-summary-flow", runId: "pre-fix", hypothesisId: "A", location: "useDocumentGenerationActions.ts:generateMemorial:request", msg: "[DEBUG] Frontend vai disparar geracao do memorial", data: { currentFileId: currentFileId || null, effectiveFileId: effectiveCurrentFile.id, effectiveFileName: effectiveCurrentFile.originalName, standardId, propertyId: memorialRequest.propertyId || null, templateName: selectedTemplate.templateName || null, templateBackendId: selectedTemplate.templateBackendId || null, technicalSummaryLength: technicalSummaryJson.length, documentSummaryLength: typeof documentSummaryJson === "string" ? documentSummaryJson.length : 0, provider: aiConfig.model.toLowerCase().includes('claude') ? 'claude' : 'openai' }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      const response = await api.post(aiConfig.endpoint, {
        ...memorialRequest,
        ...aiService.getAIParameters()
      });
      updateGeneration({
        progress: 92,
        step: 'Resposta recebida. Consolidando o memorial final...'
      });
      const rawMemorialText =
        typeof response.data?.memorialText === 'string'
          ? response.data.memorialText
          : '';
      const fallbackMemorialText = rawMemorialText || 'Memorial gerado com sucesso, mas sem detalhes técnicos.';
      const normalizedMemorialText = normalizeMemorialText(fallbackMemorialText);

      completeGeneration({
        memorial: normalizedMemorialText,
        step: processingContextAssessment.status === 'complete'
          ? 'Memorial gerado com sucesso!'
          : 'Memorial gerado com avisos operacionais de contexto!'
      });
    } catch (err: unknown) {
      // #region debug-point E:memorial-exception
      fetch("http://127.0.0.1:7777/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: "memorial-summary-flow", runId: "pre-fix", hypothesisId: "E", location: "useDocumentGenerationActions.ts:generateMemorial:catch", msg: "[DEBUG] Frontend recebeu erro na geracao do memorial", data: { errorMessage: err instanceof Error ? err.message : String(err), currentFileId: currentFileId || null }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      console.error('Erro ao gerar memorial:', err);
      failGeneration(getErrorMessage(err, 'Erro ao gerar memorial descritivo'));
    }
  }, [
    activePropertyId,
    beginGeneration,
    completeGeneration,
    currentFileIndex,
    failGeneration,
    file,
    files,
    getErrorMessage,
    resolveAppliedTechnicalSummaryJson,
    resolveAppliedDocumentSummaryJson,
    resolveAppliedProcessingContextStatus,
    resolveSelectedStandardId,
    resolveSelectedTemplate,
    selectedProperty,
    setMemorialError
  ]);

  const generateTechnicalSummary = useCallback(async (
    sourceDxfData?: DXFData | null,
    sourceFile?: FileMetadata | null,
    referencePoints: ConfirmedReferencePoint[] = []
  ) => {
    const currentFile = sourceFile || files[currentFileIndex] || file;
    const currentFileId = currentFile?.id;
    const effectiveDxfData = sourceDxfData || dxfData;

    if (!currentFileId || !currentFile || !effectiveDxfData) {
      setMemorialError('Dados do arquivo nao disponiveis');
      return;
    }

    try {
      beginGeneration('resumo-tecnico', 'Gerando resumo tecnico do memorial...');

      const propertyData = selectedProperty;
      const summaryRequest: BaseMemorialRequest = {
        ...buildTechnicalSummaryRequest({
          currentFile,
          propertyData,
          sourceDxfData: effectiveDxfData,
          activePropertyId
        }),
        lotCount: inferPrimaryGeoLimitesLotCount(effectiveDxfData) ?? undefined,
        detectedLotNumbers: collectGeoLimitesDetectedLotNumbers(effectiveDxfData),
        selectedReferencePoints: referencePoints.map((referencePoint) => ({
          label: referencePoint.label,
          x: referencePoint.x,
          y: referencePoint.y,
          georeferencedX: referencePoint.georeferencedX,
          georeferencedY: referencePoint.georeferencedY
        })),
        entities: buildGeoLimitesTechnicalSummaryEntities(effectiveDxfData)
      };

      if (!summaryRequest.propertyId) {
        const fallbackPropertyId = getFallbackPropertyId();
        if (fallbackPropertyId) {
          summaryRequest.propertyId = fallbackPropertyId;
        }
      }

      const response = await api.post('/memorial/generate-summary', summaryRequest);
      const technicalSummaryJson = typeof response.data?.technicalSummaryJson === 'string'
        ? response.data.technicalSummaryJson
        : '';
      const documentSummaryJson = typeof response.data?.documentSummaryJson === 'string'
        ? response.data.documentSummaryJson
        : '';
      const processingContextStatus = normalizeProcessingContextStatus(response.data?.processingContextStatus);
      const processingContextAssessment = resolveTechnicalSummaryProcessingContext(
        technicalSummaryJson,
        processingContextStatus
      );
      localStorage.setItem(buildTechnicalSummaryStorageKey(currentFileId), technicalSummaryJson);
      localStorage.setItem(buildDocumentSummaryStorageKey(currentFileId), documentSummaryJson);
      if (processingContextStatus) {
        localStorage.setItem(
          buildProcessingContextStatusStorageKey(currentFileId),
          JSON.stringify(processingContextStatus)
        );
      } else {
        localStorage.removeItem(buildProcessingContextStatusStorageKey(currentFileId));
      }
      setStoredTechnicalSummary({
        summaryJson: technicalSummaryJson,
        documentSummaryJson,
        processingContextStatus: processingContextStatus || undefined,
        summaryText: normalizeMemorialText(
          response.data.memorialText || 'Resumo tecnico gerado com sucesso, mas sem detalhes tecnicos.'
        ),
        analyzedFile: currentFile.originalName,
        generatedAt: new Date().toISOString(),
        source: 'viewer',
        sourceFileId: currentFileId
      }, activePropertyId);
      setAppliedTechnicalSummarySelection(
        buildCurrentTechnicalSummarySelectionValue(currentFileId),
        activePropertyId
      );
      completeGeneration({
        technicalSummaryJson,
        processingContextStatus: processingContextStatus || undefined,
        memorial: normalizeMemorialText(
          response.data.memorialText || 'Resumo tecnico gerado com sucesso, mas sem detalhes tecnicos.'
        ),
        step: processingContextAssessment.status === 'complete'
          ? 'Resumo tecnico gerado com contexto territorial completo!'
          : 'Resumo tecnico gerado com avisos operacionais de contexto!'
      });
    } catch (err: unknown) {
      console.error('Erro ao gerar resumo tecnico do memorial:', err);
      failGeneration(getErrorMessage(err, 'Erro ao gerar resumo tecnico do memorial'));
    }
  }, [
    activePropertyId,
    beginGeneration,
    completeGeneration,
    currentFileIndex,
    dxfData,
    failGeneration,
    file,
    files,
    getErrorMessage,
    selectedProperty,
    setMemorialError
  ]);

  return {
    handlePolygonConfirmed,
    generateMemorial,
    generateTechnicalSummary
  };
};
