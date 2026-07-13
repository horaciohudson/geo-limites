import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import {
  buildCadEntitySelectionId,
  buildUpdatedDxfData,
  getEntityMirrorAxisX,
  mirrorEntityAcrossVerticalAxis
} from '@/graphics-engine/pages/cad-editor/cadEditorEntityUtils';
import { commitCadEditorHistoryEntry } from '@/graphics-engine/pages/cad-editor/cadEditorHistoryUtils';
import { cloneVertex, type WeldAvailability } from '@/graphics-engine/pages/cad-editor/cadEditorWeldUtils';
import type { DXFData, DXFEntity } from '@/graphics-engine/shared/dxf';

export interface UseCadEditorModifyControllerParams {
  currentEditorData: DXFData | null;
  primarySelectedEntity: ViewerSelectedEntityInfo | null;
  selectedEntities: ViewerSelectedEntityInfo[];
  weldAvailability: WeldAvailability;
  weldTolerance: number;
  setUndoStack: Dispatch<SetStateAction<DXFData[]>>;
  setRedoStack: Dispatch<SetStateAction<DXFData[]>>;
  setLoadedDxfData: Dispatch<SetStateAction<DXFData | null>>;
  setViewerSelectionOverride: Dispatch<SetStateAction<string[] | undefined>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  messages?: {
    mirrorRequiresSingleSelectionNotice: string;
    mirrorEntityNotFoundNotice: string;
    buildMirrorAppliedNotice: (params: { entityType: string }) => string;
    weldRequiresDocumentNotice: string;
    buildWeldBuildChainErrorNotice: (params: { weldTolerance: number }) => string;
    buildWeldAppliedNotice: (params: {
      mergedCount: number;
      vertexCount: number;
      gap: number;
    }) => string;
  };
}

const DEFAULT_MODIFY_CONTROLLER_MESSAGES: NonNullable<UseCadEditorModifyControllerParams['messages']> = {
  mirrorRequiresSingleSelectionNotice: 'Selecione apenas uma entidade antes de aplicar Espelhar.',
  mirrorEntityNotFoundNotice: 'Nao foi possivel localizar a entidade selecionada para espelhar.',
  buildMirrorAppliedNotice: ({ entityType }) => `Entidade ${entityType} espelhada no proprio eixo vertical.`,
  weldRequiresDocumentNotice: 'Abra um DXF antes de aplicar Weld.',
  buildWeldBuildChainErrorNotice: ({ weldTolerance }) => (
    `Nao foi possivel montar a cadeia de Weld com tolerancia de ${weldTolerance.toFixed(2)}.`
  ),
  buildWeldAppliedNotice: ({ mergedCount, vertexCount, gap }) => (
    `Weld aplicado para ${mergedCount} entidades. Polilinha resultante com ${vertexCount} vertices e gap total ${gap.toFixed(3)}.`
  )
};

export const useCadEditorModifyController = ({
  currentEditorData,
  primarySelectedEntity,
  selectedEntities,
  weldAvailability,
  weldTolerance,
  setUndoStack,
  setRedoStack,
  setLoadedDxfData,
  setViewerSelectionOverride,
  setEditorNotice,
  messages
}: UseCadEditorModifyControllerParams) => {
  const resolvedMessages = messages ?? DEFAULT_MODIFY_CONTROLLER_MESSAGES;
  const handleApplyMirrorToSelection = useCallback(() => {
    if (!currentEditorData || !primarySelectedEntity || selectedEntities.length !== 1) {
      setEditorNotice(resolvedMessages.mirrorRequiresSingleSelectionNotice);
      return;
    }

    const entityToMirror = currentEditorData.entities[primarySelectedEntity.index];
    if (!entityToMirror) {
      setEditorNotice(resolvedMessages.mirrorEntityNotFoundNotice);
      return;
    }

    const axisX = getEntityMirrorAxisX(primarySelectedEntity, entityToMirror);
    const nextEntities = currentEditorData.entities.map((entity, index) =>
      index === primarySelectedEntity.index ? mirrorEntityAcrossVerticalAxis(entity, axisX) : entity
    );
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    setViewerSelectionOverride(undefined);
    setEditorNotice(resolvedMessages.buildMirrorAppliedNotice({ entityType: primarySelectedEntity.type }));
  }, [
    currentEditorData,
    primarySelectedEntity,
    resolvedMessages,
    selectedEntities.length,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  const handleApplyWeldToSelection = useCallback(() => {
    if (!currentEditorData) {
      setEditorNotice(resolvedMessages.weldRequiresDocumentNotice);
      return;
    }

    if (!weldAvailability.canApply) {
      setEditorNotice(weldAvailability.reason);
      return;
    }

    if (!weldAvailability.mergedVertices || weldAvailability.mergedVertices.length < 2) {
      setEditorNotice(resolvedMessages.buildWeldBuildChainErrorNotice({ weldTolerance }));
      return;
    }

    const selectedIndexes = selectedEntities.map((entity) => entity.index).sort((left, right) => left - right);
    const firstIndex = selectedIndexes[0];
    const selectionLayer = selectedEntities[0]?.layer || '0';
    const weldedEntity: DXFEntity = {
      type: 'LWPOLYLINE',
      layer: selectionLayer,
      properties: {
        x: weldAvailability.mergedVertices[0]?.x,
        y: weldAvailability.mergedVertices[0]?.y,
        closed: false,
        polylineFlag: 0,
        vertexCount: weldAvailability.mergedVertices.length,
        vertices: weldAvailability.mergedVertices.map(cloneVertex)
      }
    };
    const nextEntities = currentEditorData.entities.reduce<DXFEntity[]>((accumulator, entity, index) => {
      if (index === firstIndex) {
        accumulator.push(weldedEntity);
        return accumulator;
      }

      if (selectedIndexes.includes(index)) {
        return accumulator;
      }

      accumulator.push(entity);
      return accumulator;
    }, []);
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const weldedEntityInResult = nextData.entities[firstIndex];
    const weldedSelectionId = weldedEntityInResult
      ? buildCadEntitySelectionId(weldedEntityInResult, firstIndex)
      : buildCadEntitySelectionId(weldedEntity, firstIndex);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    setViewerSelectionOverride([weldedSelectionId]);
    setEditorNotice(resolvedMessages.buildWeldAppliedNotice({
      mergedCount: weldAvailability.mergedCount,
      vertexCount: weldAvailability.mergedVertices.length,
      gap: weldAvailability.gap || 0
    }));
  }, [
    currentEditorData,
    resolvedMessages,
    selectedEntities,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setUndoStack,
    setViewerSelectionOverride,
    weldAvailability,
    weldTolerance
  ]);

  return {
    handleApplyMirrorToSelection,
    handleApplyWeldToSelection
  };
};
