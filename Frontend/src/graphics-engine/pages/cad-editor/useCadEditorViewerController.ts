import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  EmbeddedCadToolMode,
  ViewerEntitiesDrawnPayload,
  ViewerEntitySelectionChange,
  ViewerSelectedEntityInfo
} from '@/graphics-engine/components/viewer-dxf/types';
import type {
  ViewerEntityCopyPayload,
  ViewerEntityEditCurvePayload,
  ViewerEntityEditNodePayload,
  ViewerEntityExtendPayload,
  ViewerEntityMovePayload,
  ViewerEntityOffsetPayload,
  ViewerEntityTransformPayload,
  ViewerEntityTrimPayload
} from '@/graphics-engine/components/viewer-dxf/viewerEntityCallbacks';
import { applyNodeEditToEntity, type EditableNodeRole } from '@/graphics-engine/components/viewer-dxf/nodeEditUtils';
import { applyCurveEditToEntity, type EditableCurveHandleRole } from '@/graphics-engine/components/viewer-dxf/curveEditUtils';
import { applyTrimExtendToEntity } from '@/graphics-engine/components/viewer-dxf/trimExtendGeometryUtils';
import { applyPreviewTransformToEntity, type EntityPreviewTransform } from '@/graphics-engine/components/viewer-dxf/selectionTransformUtils';
import { buildSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import {
  applyEntityPaintStyle,
  buildUpdatedDxfData,
  cloneCadEntitiesForInsertion,
  stripCadEntityPersistentId,
  translateEntity,
  translateSelectedEntityInfo
} from '@/graphics-engine/pages/cad-editor/cadEditorEntityUtils';
import {
  clearCadEditorSelection,
  commitCadEditorHistoryEntry,
  syncCadEditorSelection
} from '@/graphics-engine/pages/cad-editor/cadEditorHistoryUtils';
import type {
  CadEntityContextMenuState,
  CadGuideContextMenuState,
  CadViewportState
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import type { CadEditorLayerClassificationInput } from '@/graphics-engine/pages/cad-editor/cadEditorHost';
import type { DXFData, DXFEntity } from '@/graphics-engine/shared/dxf';

export interface UseCadEditorViewerControllerParams {
  currentEditorData: DXFData | null;
  drawingLineColor: string;
  setUndoStack: Dispatch<SetStateAction<DXFData[]>>;
  setRedoStack: Dispatch<SetStateAction<DXFData[]>>;
  setLoadedDxfData: Dispatch<SetStateAction<DXFData | null>>;
  setSelectedEntities: Dispatch<SetStateAction<ViewerSelectedEntityInfo[]>>;
  setViewerSelectionOverride: Dispatch<SetStateAction<string[] | undefined>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  setEntityContextMenu: Dispatch<SetStateAction<CadEntityContextMenuState | null>>;
  setSelectedGuideId: Dispatch<SetStateAction<string | null>>;
  setGuideContextMenu: Dispatch<SetStateAction<CadGuideContextMenuState | null>>;
  setActiveLayerName: Dispatch<SetStateAction<string>>;
  setViewerZoom: Dispatch<SetStateAction<number>>;
  setViewerViewportState: Dispatch<SetStateAction<CadViewportState>>;
  resolveFunctionalLayerName?: (input: CadEditorLayerClassificationInput) => string;
  messages?: {
    clearSelectedEntitiesNotice: string;
    buildSelectionChangeNotice: (params: {
      primaryEntity: ViewerSelectedEntityInfo | null;
      selectedEntitiesCount: number;
    }) => string;
    translateSelectionErrorNotice: string;
    buildTranslateSelectionNotice: (params: {
      entityType: string;
      selectedEntitiesCount: number;
      deltaX: number;
      deltaY: number;
    }) => string;
    copySelectionErrorNotice: string;
    buildCopySelectionNotice: (params: {
      entityType: string;
      selectedEntitiesCount: number;
      deltaX: number;
      deltaY: number;
    }) => string;
    transformSelectionErrorNotice: string;
    buildTransformSelectionNotice: (params: {
      entityType: string;
      selectedEntitiesCount: number;
      previewTransform: EntityPreviewTransform;
    }) => string;
    buildOffsetSelectionNotice: (params: {
      entityType: string;
      distance: number;
    }) => string;
    editNodeSelectionErrorNotice: string;
    buildEditNodeSelectionNotice: (params: {
      role: EditableNodeRole;
      vertexIndex?: number;
      targetPoint: { x: number; y: number };
      snappedToEntityId?: string | null;
    }) => string;
    editCurveSelectionErrorNotice: string;
    buildEditCurveSelectionNotice: (params: {
      role: EditableCurveHandleRole;
      targetPoint: { x: number; y: number };
    }) => string;
    extendSelectionErrorNotice: string;
    buildExtendSelectionNotice: (params: {
      role: EditableNodeRole;
      vertexIndex?: number;
      targetPoint: { x: number; y: number };
    }) => string;
    trimSelectionErrorNotice: string;
    buildTrimSelectionNotice: (params: {
      sourceEntityType: string;
      segmentIndex: number;
      splitPoint: { x: number; y: number };
    }) => string;
    drawRequiresDocumentNotice: string;
    drawCompletedNotice: string;
    buildEntitiesDrawnNotice: (params: {
      entityCount: number;
      mode: EmbeddedCadToolMode;
    }) => string;
  };
}

const DEFAULT_VIEWER_CONTROLLER_MESSAGES: NonNullable<UseCadEditorViewerControllerParams['messages']> = {
  clearSelectedEntitiesNotice: 'Selecao de entidades limpa.',
  buildSelectionChangeNotice: ({ primaryEntity, selectedEntitiesCount }) => (
    primaryEntity
      ? selectedEntitiesCount > 1
        ? `${selectedEntitiesCount} entidades selecionadas.`
        : `Entidade selecionada: ${primaryEntity.type} na camada ${primaryEntity.layer}.`
      : 'Nenhuma entidade selecionada.'
  ),
  translateSelectionErrorNotice: 'Nao foi possivel mover a selecao atual.',
  buildTranslateSelectionNotice: ({ entityType, selectedEntitiesCount, deltaX, deltaY }) => (
    `${selectedEntitiesCount > 1 ? `${selectedEntitiesCount} entidades movidas` : `Entidade ${entityType} movida`} em X ${deltaX.toFixed(3)} / Y ${deltaY.toFixed(3)}.`
  ),
  copySelectionErrorNotice: 'Nao foi possivel copiar a selecao atual.',
  buildCopySelectionNotice: ({ entityType, selectedEntitiesCount, deltaX, deltaY }) => (
    `${selectedEntitiesCount > 1 ? `${selectedEntitiesCount} entidades copiadas` : `Entidade ${entityType} copiada`} em X ${deltaX.toFixed(3)} / Y ${deltaY.toFixed(3)}.`
  ),
  transformSelectionErrorNotice: 'Nao foi possivel transformar a selecao atual.',
  buildTransformSelectionNotice: ({ entityType, selectedEntitiesCount, previewTransform }) => (
    previewTransform.mode === 'rotate'
      ? `${selectedEntitiesCount > 1 ? `${selectedEntitiesCount} entidades rotacionadas` : `Entidade ${entityType} rotacionada`} em ${previewTransform.rotationDegrees.toFixed(1)}°.`
      : previewTransform.mode === 'scale'
        ? `${selectedEntitiesCount > 1 ? `${selectedEntitiesCount} entidades redimensionadas` : `Entidade ${entityType} redimensionada`} com escala X ${previewTransform.scaleX.toFixed(3)} / Y ${previewTransform.scaleY.toFixed(3)}.`
        : `${selectedEntitiesCount > 1 ? `${selectedEntitiesCount} entidades transformadas` : `Entidade ${entityType} transformada`}.`
  ),
  buildOffsetSelectionNotice: ({ entityType, distance }) => `Offset aplicado em ${Math.abs(distance).toFixed(3)} para ${entityType}.`,
  editNodeSelectionErrorNotice: 'Nao foi possivel editar o no selecionado.',
  buildEditNodeSelectionNotice: ({ role, vertexIndex, targetPoint, snappedToEntityId }) => (
    snappedToEntityId
      ? `No ${role === 'start' ? 'inicial' : role === 'end' ? 'final' : `intermediario ${typeof vertexIndex === 'number' ? vertexIndex + 1 : ''}`.trim()} ajustado e aproximado de outra extremidade.`
      : `No ${role === 'start' ? 'inicial' : role === 'end' ? 'final' : `intermediario ${typeof vertexIndex === 'number' ? vertexIndex + 1 : ''}`.trim()} atualizado em X ${targetPoint.x.toFixed(3)} / Y ${targetPoint.y.toFixed(3)}.`
  ),
  editCurveSelectionErrorNotice: 'Nao foi possivel editar a curva selecionada.',
  buildEditCurveSelectionNotice: ({ role, targetPoint }) => (
    `Alca ${role === 'control1' ? '1' : '2'} da curva atualizada em X ${targetPoint.x.toFixed(3)} / Y ${targetPoint.y.toFixed(3)}.`
  ),
  extendSelectionErrorNotice: 'Nao foi possivel estender a entidade selecionada.',
  buildExtendSelectionNotice: ({ role, vertexIndex, targetPoint }) => (
    typeof vertexIndex === 'number'
      ? `Estender aplicado no vertice ${vertexIndex + 1} em X ${targetPoint.x.toFixed(3)} / Y ${targetPoint.y.toFixed(3)}.`
      : `Estender aplicado no no ${role === 'start' ? 'inicial' : 'final'} em X ${targetPoint.x.toFixed(3)} / Y ${targetPoint.y.toFixed(3)}.`
  ),
  trimSelectionErrorNotice: 'Nao foi possivel aparar a entidade selecionada.',
  buildTrimSelectionNotice: ({ sourceEntityType, segmentIndex, splitPoint }) => {
    const targetLabel = sourceEntityType === 'ARC'
      ? 'no arco'
      : sourceEntityType === 'CIRCLE'
        ? 'no circulo'
        : `no segmento ${segmentIndex + 1}`;
    return `Corte aplicado ${targetLabel} em X ${splitPoint.x.toFixed(3)} / Y ${splitPoint.y.toFixed(3)}.`;
  },
  drawRequiresDocumentNotice: 'Inicie um novo desenho ou abra um DXF antes de desenhar.',
  drawCompletedNotice: 'Operacao concluida.',
  buildEntitiesDrawnNotice: ({ entityCount, mode }) => `${entityCount} entidade(s) criada(s) com a ferramenta ${mode}.`
};

export const useCadEditorViewerController = ({
  currentEditorData,
  drawingLineColor,
  setUndoStack,
  setRedoStack,
  setLoadedDxfData,
  setSelectedEntities,
  setViewerSelectionOverride,
  setEditorNotice,
  setEntityContextMenu,
  setSelectedGuideId,
  setGuideContextMenu,
  setActiveLayerName: _setActiveLayerName,
  setViewerZoom,
  setViewerViewportState,
  resolveFunctionalLayerName: _resolveFunctionalLayerName,
  messages
}: UseCadEditorViewerControllerParams) => {
  const resolvedMessages = messages ?? DEFAULT_VIEWER_CONTROLLER_MESSAGES;

  const clearSelectedEntities = useCallback((notice = resolvedMessages.clearSelectedEntitiesNotice) => {
    clearCadEditorSelection({
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEntityContextMenu(null);
    setEditorNotice(notice);
  }, [resolvedMessages.clearSelectedEntitiesNotice, setEditorNotice, setEntityContextMenu, setSelectedEntities, setViewerSelectionOverride]);

  const handleViewerViewportStateChange = useCallback((viewport: CadViewportState) => {
    setViewerZoom(viewport.zoom);
    setViewerViewportState(viewport);
  }, [setViewerViewportState, setViewerZoom]);

  const handleViewerSelectionChange = useCallback((selection: ViewerEntitySelectionChange) => {
    setViewerSelectionOverride(selection.selectedEntities.map((entity) => entity.id));
    setSelectedEntities(selection.selectedEntities);
    if (selection.selectedEntities.length > 0) {
      setSelectedGuideId(null);
      setGuideContextMenu(null);
    }
    setEditorNotice(resolvedMessages.buildSelectionChangeNotice({
      primaryEntity: selection.primaryEntity || null,
      selectedEntitiesCount: selection.selectedEntities.length
    }));
  }, [
    resolvedMessages,
    setEditorNotice,
    setEntityContextMenu,
    setGuideContextMenu,
    setSelectedEntities,
    setSelectedGuideId,
    setViewerSelectionOverride
  ]);

  const handleTranslateSelectedEntity = useCallback((move: ViewerEntityMovePayload) => {
    if (!currentEditorData) {
      return;
    }

    if (Math.abs(move.deltaX) <= 0.001 && Math.abs(move.deltaY) <= 0.001) {
      return;
    }

    const selectedIndexes = new Set(move.entities.map((entity) => entity.index));
    const hasInvalidEntity = move.entities.some((entity) => !currentEditorData.entities[entity.index]);
    if (selectedIndexes.size === 0 || hasInvalidEntity) {
      setEditorNotice(resolvedMessages.translateSelectionErrorNotice);
      return;
    }

    const nextEntities = currentEditorData.entities.map((entity, index) =>
      selectedIndexes.has(index) ? translateEntity(entity, move.deltaX, move.deltaY) : entity
    );
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const nextSelectedEntities = move.entities.map((entity) =>
      translateSelectedEntityInfo(entity, move.deltaX, move.deltaY)
    );

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    syncCadEditorSelection({
      selectedEntities: nextSelectedEntities,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorNotice(resolvedMessages.buildTranslateSelectionNotice({
      entityType: move.entity.type,
      selectedEntitiesCount: move.entities.length,
      deltaX: move.deltaX,
      deltaY: move.deltaY
    }));
  }, [
    currentEditorData,
    resolvedMessages,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  const handleCopySelectedEntity = useCallback((move: ViewerEntityCopyPayload) => {
    if (!currentEditorData) {
      return;
    }

    if (Math.abs(move.deltaX) <= 0.001 && Math.abs(move.deltaY) <= 0.001) {
      return;
    }

    const selectedIndexes = new Set(move.entities.map((entity) => entity.index));
    const hasInvalidEntity = move.entities.some((entity) => !currentEditorData.entities[entity.index]);
    if (selectedIndexes.size === 0 || hasInvalidEntity) {
      setEditorNotice(resolvedMessages.copySelectionErrorNotice);
      return;
    }

    const copiedEntities = move.entities.map((entity) => {
      const sourceEntity = currentEditorData.entities[entity.index];
      return sourceEntity
        ? stripCadEntityPersistentId(translateEntity(sourceEntity, move.deltaX, move.deltaY))
        : null;
    });

    if (copiedEntities.some((entity) => entity === null)) {
      setEditorNotice(resolvedMessages.copySelectionErrorNotice);
      return;
    }

    const nextEntities = [
      ...currentEditorData.entities,
      ...cloneCadEntitiesForInsertion(copiedEntities.filter((entity): entity is DXFEntity => entity !== null))
    ];
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const selectionStartIndex = nextData.entities.length - move.entities.length;
    const nextSelectedEntities = nextData.entities
      .slice(selectionStartIndex)
      .map((entity, index) => buildSelectedEntityInfo(entity, selectionStartIndex + index));

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    syncCadEditorSelection({
      selectedEntities: nextSelectedEntities,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorNotice(resolvedMessages.buildCopySelectionNotice({
      entityType: move.entity.type,
      selectedEntitiesCount: move.entities.length,
      deltaX: move.deltaX,
      deltaY: move.deltaY
    }));
  }, [
    currentEditorData,
    resolvedMessages,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  const handleTransformSelectedEntity = useCallback((transform: ViewerEntityTransformPayload) => {
    if (!currentEditorData) {
      return;
    }

    const selectedIndexes = new Set(transform.entities.map((entity) => entity.index));
    const hasInvalidEntity = transform.entities.some((entity) => !currentEditorData.entities[entity.index]);
    if (selectedIndexes.size === 0 || hasInvalidEntity) {
      setEditorNotice(resolvedMessages.transformSelectionErrorNotice);
      return;
    }

    const nextEntities = currentEditorData.entities.map((entity, index) => (
      selectedIndexes.has(index)
        ? applyPreviewTransformToEntity(entity, transform.previewTransform)
        : entity
    ));
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const nextSelectedEntities = transform.entities
      .map((entity) => nextData.entities[entity.index] ? buildSelectedEntityInfo(nextData.entities[entity.index], entity.index) : null)
      .filter((entity): entity is ViewerSelectedEntityInfo => entity !== null);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    syncCadEditorSelection({
      selectedEntities: nextSelectedEntities,
      setSelectedEntities,
      setViewerSelectionOverride
    });

    setEditorNotice(resolvedMessages.buildTransformSelectionNotice({
      entityType: transform.entity.type,
      selectedEntitiesCount: transform.entities.length,
      previewTransform: transform.previewTransform
    }));
  }, [
    currentEditorData,
    resolvedMessages,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  const handleOffsetSelectedEntity = useCallback((offset: ViewerEntityOffsetPayload) => {
    if (!currentEditorData || offset.entities.length === 0) {
      return;
    }

    const preparedEntities = offset.entities.map((entity) => stripCadEntityPersistentId(entity));
    const nextData = buildUpdatedDxfData(currentEditorData, [...currentEditorData.entities, ...preparedEntities]);
    const selectionStartIndex = nextData.entities.length - preparedEntities.length;
    const nextSelectedEntities = nextData.entities
      .slice(selectionStartIndex)
      .map((entity, index) => buildSelectedEntityInfo(entity, selectionStartIndex + index));

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    syncCadEditorSelection({
      selectedEntities: nextSelectedEntities,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorNotice(resolvedMessages.buildOffsetSelectionNotice({
      entityType: offset.entity.type,
      distance: offset.distance
    }));
  }, [
    currentEditorData,
    resolvedMessages,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  const handleEditSelectedEntityNode = useCallback((edit: ViewerEntityEditNodePayload) => {
    if (!currentEditorData) {
      return;
    }

    const sourceEntity = currentEditorData.entities[edit.entity.index];
    if (!sourceEntity) {
      setEditorNotice(resolvedMessages.editNodeSelectionErrorNotice);
      return;
    }

    const nextEntities = currentEditorData.entities.map((entity, index) => (
      index === edit.entity.index
        ? applyNodeEditToEntity(entity, edit.role, edit.vertexIndex, edit.targetPoint)
        : entity
    ));
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const updatedEntity = nextData.entities[edit.entity.index];
    const nextSelectedEntity = updatedEntity ? buildSelectedEntityInfo(updatedEntity, edit.entity.index) : null;

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    if (nextSelectedEntity) {
      syncCadEditorSelection({
        selectedEntities: [nextSelectedEntity],
        setSelectedEntities,
        setViewerSelectionOverride
      });
    } else {
      clearCadEditorSelection({
        setSelectedEntities,
        setViewerSelectionOverride
      });
    }
    setEditorNotice(resolvedMessages.buildEditNodeSelectionNotice({
      role: edit.role,
      vertexIndex: edit.vertexIndex,
      targetPoint: edit.targetPoint,
      snappedToEntityId: edit.snappedToEntityId
    }));
  }, [
    currentEditorData,
    resolvedMessages,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  const handleEditSelectedEntityCurve = useCallback((edit: ViewerEntityEditCurvePayload) => {
    if (!currentEditorData) {
      return;
    }

    const sourceEntity = currentEditorData.entities[edit.entity.index];
    if (!sourceEntity) {
      setEditorNotice(resolvedMessages.editCurveSelectionErrorNotice);
      return;
    }

    const nextEntities = currentEditorData.entities.map((entity, index) => (
      index === edit.entity.index
        ? applyCurveEditToEntity(entity, edit.role, edit.targetPoint)
        : entity
    ));
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const updatedEntity = nextData.entities[edit.entity.index];
    const nextSelectedEntity = updatedEntity ? buildSelectedEntityInfo(updatedEntity, edit.entity.index) : null;

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    if (nextSelectedEntity) {
      syncCadEditorSelection({
        selectedEntities: [nextSelectedEntity],
        setSelectedEntities,
        setViewerSelectionOverride
      });
    } else {
      clearCadEditorSelection({
        setSelectedEntities,
        setViewerSelectionOverride
      });
    }
    setEditorNotice(resolvedMessages.buildEditCurveSelectionNotice({
      role: edit.role,
      targetPoint: edit.targetPoint
    }));
  }, [
    currentEditorData,
    resolvedMessages,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  const handleExtendSelectedEntity = useCallback((extend: ViewerEntityExtendPayload) => {
    if (!currentEditorData) {
      return;
    }

    const sourceEntity = currentEditorData.entities[extend.entity.index];
    if (!sourceEntity) {
      setEditorNotice(resolvedMessages.extendSelectionErrorNotice);
      return;
    }

    const nextEntities = currentEditorData.entities.map((entity, index) => (
      index === extend.entity.index
        ? (extend.resultEntity ?? applyTrimExtendToEntity(entity, extend.role, extend.targetPoint, extend.vertexIndex))
        : entity
    ));
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    clearCadEditorSelection({
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorNotice(resolvedMessages.buildExtendSelectionNotice({
      role: extend.role,
      vertexIndex: extend.vertexIndex,
      targetPoint: extend.targetPoint
    }));
  }, [
    currentEditorData,
    resolvedMessages,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  const handleTrimSelectedEntity = useCallback((trim: ViewerEntityTrimPayload) => {
    if (!currentEditorData || trim.replacementEntities.length < 1) {
      return;
    }

    const sourceEntity = currentEditorData.entities[trim.entity.index];
    if (!sourceEntity) {
      setEditorNotice(resolvedMessages.trimSelectionErrorNotice);
      return;
    }

    const replacementEntities = trim.replacementEntities.map((entity) => stripCadEntityPersistentId(entity));
    const nextEntities = currentEditorData.entities.flatMap((entity, index) => (
      index === trim.entity.index ? replacementEntities : [entity]
    ));
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const replacementStartIndex = trim.entity.index;
    const nextSelectedEntities = nextData.entities
      .slice(replacementStartIndex, replacementStartIndex + replacementEntities.length)
      .map((entity, index) => buildSelectedEntityInfo(entity, replacementStartIndex + index));

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    syncCadEditorSelection({
      selectedEntities: nextSelectedEntities,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorNotice(
      `${resolvedMessages.buildTrimSelectionNotice({
        sourceEntityType: sourceEntity.type,
        segmentIndex: trim.segmentIndex,
        splitPoint: trim.splitPoint
      })} ${nextSelectedEntities.length > 1 ? 'Partes resultantes destacadas.' : 'Parte resultante destacada.'}`
    );
  }, [
    currentEditorData,
    resolvedMessages,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  const handleEntitiesDrawn = useCallback((payload: ViewerEntitiesDrawnPayload) => {
    if (!currentEditorData) {
      setEditorNotice(resolvedMessages.drawRequiresDocumentNotice);
      return;
    }

    if (payload.entities.length === 0) {
      setEditorNotice(payload.notice || resolvedMessages.drawCompletedNotice);
      return;
    }

    const preparedEntities = payload.entities.map((entity) => applyEntityPaintStyle(stripCadEntityPersistentId(entity), {
      lineColor: drawingLineColor,
      fillColor: null
    }));
    const nextData = buildUpdatedDxfData(currentEditorData, [...currentEditorData.entities, ...preparedEntities]);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    clearCadEditorSelection({
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorNotice(payload.notice || resolvedMessages.buildEntitiesDrawnNotice({
      entityCount: payload.entities.length,
      mode: payload.mode
    }));
  }, [
    currentEditorData,
    drawingLineColor,
    resolvedMessages,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);

  return {
    clearSelectedEntities,
    handleViewerViewportStateChange,
    handleViewerSelectionChange,
    handleCopySelectedEntity,
    handleEditSelectedEntityCurve,
    handleEditSelectedEntityNode,
    handleExtendSelectedEntity,
    handleTrimSelectedEntity,
    handleOffsetSelectedEntity,
    handleTranslateSelectedEntity,
    handleTransformSelectedEntity,
    handleEntitiesDrawn
  };
};
