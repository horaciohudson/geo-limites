import { buildSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import {
  applyEntityPaintStyle,
  buildCadEntitySelectionId,
  buildUpdatedDxfData,
  cloneCadEntitiesForInsertion,
  generateCadEditorGroupId,
  getCadEntityGroupId,
  setCadEntityGroupId,
  stripCadEntityPersistentId,
  translateEntity
} from '@/graphics-engine/pages/cad-editor/cadEditorEntityUtils';
import {
  clearCadEditorSelection,
  commitCadEditorHistoryEntry,
  syncCadEditorSelection
} from '@/graphics-engine/pages/cad-editor/cadEditorHistoryUtils';
import type { DXFData, DXFEntity } from '@/graphics-engine/shared/dxf';
import type React from 'react';

export interface UseCadEditorEntityActionsParams {
  copiedEntitiesClipboard: DXFEntity[];
  currentEditorData: DXFData | null;
  drawingFillColor: string;
  drawingLineColor: string;
  gridSnapSize: number;
  majorGridStep: number;
  paintFillEnabled: boolean;
  selectedEntities: ViewerSelectedEntityInfo[];
  closeEntityContextMenu: () => void;
  setCopiedEntitiesClipboard: React.Dispatch<React.SetStateAction<DXFEntity[]>>;
  setEditorNotice: React.Dispatch<React.SetStateAction<string>>;
  setLoadedDxfData: React.Dispatch<React.SetStateAction<DXFData | null>>;
  setRedoStack: React.Dispatch<React.SetStateAction<DXFData[]>>;
  setSelectedEntities: React.Dispatch<React.SetStateAction<ViewerSelectedEntityInfo[]>>;
  setUndoStack: React.Dispatch<React.SetStateAction<DXFData[]>>;
  setViewerSelectionOverride: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  messages?: {
    paintSelectionRequiredNotice: string;
    buildApplySelectedEntityColorsNotice: (params: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => string;
    clearFillSelectionRequiredNotice: string;
    buildClearSelectedEntityFillNotice: (params: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => string;
    removeSelectionErrorNotice: string;
    buildRemoveSelectedEntitiesNotice: (params: {
      removedCount: number;
      entityType: string;
    }) => string;
    duplicateSelectionErrorNotice: string;
    buildDuplicateSelectedEntitiesNotice: (params: {
      duplicatedEntitiesCount: number;
      entityType: string;
      duplicateOffset: number;
    }) => string;
    copySelectionErrorNotice: string;
    buildCopySelectedEntitiesNotice: (params: {
      copiedEntitiesCount: number;
      entityType: string;
    }) => string;
    cutSelectionErrorNotice: string;
    buildCutSelectedEntitiesNotice: (params: {
      cutCount: number;
      entityType: string;
    }) => string;
    bringToFrontUnavailableNotice: string;
    buildBringToFrontNotice: (params: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => string;
    bringForwardUnavailableNotice: string;
    buildBringForwardNotice: (params: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => string;
    sendToBackUnavailableNotice: string;
    buildSendToBackNotice: (params: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => string;
    sendBackwardUnavailableNotice: string;
    buildSendBackwardNotice: (params: {
      selectedEntitiesCount: number;
      entityType: string;
    }) => string;
    buildPasteCopiedEntitiesNotice: (params: {
      pastedEntitiesCount: number;
      pasteOffset: number;
    }) => string;
    groupSelectionRequiredNotice: string;
    buildGroupSelectedEntitiesNotice: (params: {
      groupedEntitiesCount: number;
    }) => string;
    ungroupSelectionRequiredNotice: string;
    buildUngroupSelectedEntitiesNotice: (params: {
      ungroupedEntitiesCount: number;
    }) => string;
  };
}

const DEFAULT_ENTITY_ACTIONS_MESSAGES: NonNullable<UseCadEditorEntityActionsParams['messages']> = {
  paintSelectionRequiredNotice: 'Selecione ao menos uma entidade para pintar.',
  buildApplySelectedEntityColorsNotice: ({ selectedEntitiesCount, entityType }) => (
    selectedEntitiesCount > 1
      ? `${selectedEntitiesCount} entidades atualizadas com a pintura atual.`
      : `Entidade ${entityType} atualizada com a pintura atual.`
  ),
  clearFillSelectionRequiredNotice: 'Selecione ao menos uma entidade para limpar o preenchimento.',
  buildClearSelectedEntityFillNotice: ({ selectedEntitiesCount, entityType }) => (
    selectedEntitiesCount > 1
      ? `Preenchimento removido de ${selectedEntitiesCount} entidades.`
      : `Preenchimento removido da entidade ${entityType}.`
  ),
  removeSelectionErrorNotice: 'Nao foi possivel remover a selecao atual.',
  buildRemoveSelectedEntitiesNotice: ({ removedCount, entityType }) => (
    removedCount > 1
      ? `${removedCount} entidades removidas.`
      : `Entidade ${entityType} removida.`
  ),
  duplicateSelectionErrorNotice: 'Nao foi possivel duplicar a selecao atual.',
  buildDuplicateSelectedEntitiesNotice: ({ duplicatedEntitiesCount, entityType, duplicateOffset }) => (
    duplicatedEntitiesCount > 1
      ? `${duplicatedEntitiesCount} entidades duplicadas com deslocamento ${duplicateOffset.toFixed(3)}.`
      : `Entidade ${entityType} duplicada com deslocamento ${duplicateOffset.toFixed(3)}.`
  ),
  copySelectionErrorNotice: 'Nao foi possivel copiar a selecao atual.',
  buildCopySelectedEntitiesNotice: ({ copiedEntitiesCount, entityType }) => (
    copiedEntitiesCount > 1
      ? `${copiedEntitiesCount} entidades copiadas para a area de transferencia do editor.`
      : `Entidade ${entityType} copiada para a area de transferencia do editor.`
  ),
  cutSelectionErrorNotice: 'Nao foi possivel recortar a selecao atual.',
  buildCutSelectedEntitiesNotice: ({ cutCount, entityType }) => (
    cutCount > 1
      ? `${cutCount} entidades recortadas para a area de transferencia do editor.`
      : `Entidade ${entityType} recortada para a area de transferencia do editor.`
  ),
  bringToFrontUnavailableNotice: 'A selecao ja esta na frente da pilha visual.',
  buildBringToFrontNotice: ({ selectedEntitiesCount, entityType }) => (
    selectedEntitiesCount > 1
      ? `${selectedEntitiesCount} entidades trazidas para frente.`
      : `Entidade ${entityType} trazida para frente.`
  ),
  bringForwardUnavailableNotice: 'A selecao ja esta no nivel mais alto possivel.',
  buildBringForwardNotice: ({ selectedEntitiesCount, entityType }) => (
    selectedEntitiesCount > 1
      ? `${selectedEntitiesCount} entidades avancadas um nivel na pilha visual.`
      : `Entidade ${entityType} avancada um nivel na pilha visual.`
  ),
  sendToBackUnavailableNotice: 'A selecao ja esta atras na pilha visual.',
  buildSendToBackNotice: ({ selectedEntitiesCount, entityType }) => (
    selectedEntitiesCount > 1
      ? `${selectedEntitiesCount} entidades enviadas para tras.`
      : `Entidade ${entityType} enviada para tras.`
  ),
  sendBackwardUnavailableNotice: 'A selecao ja esta no nivel mais baixo possivel.',
  buildSendBackwardNotice: ({ selectedEntitiesCount, entityType }) => (
    selectedEntitiesCount > 1
      ? `${selectedEntitiesCount} entidades recuadas um nivel na pilha visual.`
      : `Entidade ${entityType} recuada um nivel na pilha visual.`
  ),
  buildPasteCopiedEntitiesNotice: ({ pastedEntitiesCount, pasteOffset }) => (
    pastedEntitiesCount > 1
      ? `${pastedEntitiesCount} entidades coladas com deslocamento ${pasteOffset.toFixed(3)}.`
      : `Entidade colada com deslocamento ${pasteOffset.toFixed(3)}.`
  ),
  groupSelectionRequiredNotice: 'Selecione ao menos duas entidades para agrupar.',
  buildGroupSelectedEntitiesNotice: ({ groupedEntitiesCount }) => (
    groupedEntitiesCount > 1
      ? `${groupedEntitiesCount} entidades agrupadas.`
      : 'Entidade agrupada.'
  ),
  ungroupSelectionRequiredNotice: 'Selecione ao menos uma entidade agrupada para desagrupar.',
  buildUngroupSelectedEntitiesNotice: ({ ungroupedEntitiesCount }) => (
    ungroupedEntitiesCount > 1
      ? `${ungroupedEntitiesCount} entidades desagrupadas.`
      : 'Entidade desagrupada.'
  )
};

export const useCadEditorEntityActions = ({
  copiedEntitiesClipboard,
  currentEditorData,
  drawingFillColor,
  drawingLineColor,
  gridSnapSize,
  majorGridStep,
  paintFillEnabled,
  selectedEntities,
  closeEntityContextMenu,
  setCopiedEntitiesClipboard,
  setEditorNotice,
  setLoadedDxfData,
  setRedoStack,
  setSelectedEntities,
  setUndoStack,
  setViewerSelectionOverride,
  messages
}: UseCadEditorEntityActionsParams) => {
  const resolvedMessages = messages ?? DEFAULT_ENTITY_ACTIONS_MESSAGES;
  const appendEntitiesToEditor = (appendedEntities: DXFEntity[], notice: string) => {
    if (!currentEditorData || appendedEntities.length === 0) {
      return;
    }

    const nextData = buildUpdatedDxfData(currentEditorData, [...currentEditorData.entities, ...appendedEntities]);
    const selectionStartIndex = nextData.entities.length - appendedEntities.length;
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
    closeEntityContextMenu();
    setEditorNotice(notice);
  };

  const commitEntitySelectionMutation = (nextEntities: DXFEntity[], nextSelectedIds: string[], notice: string) => {
    if (!currentEditorData) {
      return;
    }

    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const selectedIdSet = new Set(nextSelectedIds);
    const nextSelectedInfos = nextData.entities.reduce<ViewerSelectedEntityInfo[]>((accumulator, entity, index) => {
      const selectionId = buildCadEntitySelectionId(entity, index);
      if (selectedIdSet.has(selectionId)) {
        accumulator.push(buildSelectedEntityInfo(entity, index));
      }
      return accumulator;
    }, []);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    syncCadEditorSelection({
      selectedEntities: nextSelectedInfos,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    closeEntityContextMenu();
    setEditorNotice(notice);
  };

  const applyEntityOrderUpdate = (nextEntities: DXFEntity[], notice: string) => {
    if (!currentEditorData || selectedEntities.length === 0) {
      return;
    }

    const selectedIds = new Set(selectedEntities.map((entity) => entity.id));
    const nextSelectedInfos = nextEntities.reduce<ViewerSelectedEntityInfo[]>((accumulator, entity, index) => {
      if (selectedIds.has(buildCadEntitySelectionId(entity, index))) {
        accumulator.push(buildSelectedEntityInfo(entity, index));
      }
      return accumulator;
    }, []);

    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    syncCadEditorSelection({
      selectedEntities: nextSelectedInfos,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    closeEntityContextMenu();
    setEditorNotice(notice);
  };

  const snapshotSelectedEntitiesToClipboard = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      return null;
    }

    const copiedEntities = selectedEntities.map((entity) => {
      const sourceEntity = currentEditorData.entities[entity.index];
      return sourceEntity ? stripCadEntityPersistentId(translateEntity(sourceEntity, 0, 0)) : null;
    });

    if (copiedEntities.some((entity) => entity === null)) {
      return null;
    }

    return copiedEntities.filter((entity): entity is DXFEntity => entity !== null);
  };

  const applySelectedEntityColors = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.paintSelectionRequiredNotice);
      return;
    }

    const selectedIndexes = new Set(selectedEntities.map((entity) => entity.index));
    const nextEntities = currentEditorData.entities.map((entity, index) => (
      selectedIndexes.has(index)
        ? applyEntityPaintStyle(entity, {
            lineColor: drawingLineColor,
            fillColor: paintFillEnabled ? drawingFillColor : null
          })
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
    syncCadEditorSelection({
      selectedEntities,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    closeEntityContextMenu();
    setEditorNotice(resolvedMessages.buildApplySelectedEntityColorsNotice({
      selectedEntitiesCount: selectedEntities.length,
      entityType: selectedEntities[0]?.type || 'selecionada'
    }));
  };

  const clearSelectedEntityFill = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.clearFillSelectionRequiredNotice);
      return;
    }

    const selectedIndexes = new Set(selectedEntities.map((entity) => entity.index));
    const nextEntities = currentEditorData.entities.map((entity, index) => (
      selectedIndexes.has(index)
        ? applyEntityPaintStyle(entity, {
            lineColor: drawingLineColor,
            fillColor: null
          })
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
    syncCadEditorSelection({
      selectedEntities,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    closeEntityContextMenu();
    setEditorNotice(resolvedMessages.buildClearSelectedEntityFillNotice({
      selectedEntitiesCount: selectedEntities.length,
      entityType: selectedEntities[0]?.type || 'selecionada'
    }));
  };

  const removeSelectedEntities = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      return;
    }

    const selectedIndexes = new Set(selectedEntities.map((entity) => entity.index));
    const hasInvalidEntity = selectedEntities.some((entity) => !currentEditorData.entities[entity.index]);
    if (selectedIndexes.size === 0 || hasInvalidEntity) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.removeSelectionErrorNotice);
      return;
    }

    const nextEntities = currentEditorData.entities.filter((_, index) => !selectedIndexes.has(index));
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const removedCount = selectedIndexes.size;

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
    closeEntityContextMenu();
    setEditorNotice(resolvedMessages.buildRemoveSelectedEntitiesNotice({
      removedCount,
      entityType: selectedEntities[0]?.type || 'selecionada'
    }));
  };

  const duplicateSelectedEntities = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      return;
    }

    const baseOffset = Number.isFinite(gridSnapSize) && gridSnapSize > 0 ? gridSnapSize : 10;
    const duplicateOffset = Math.max(baseOffset, majorGridStep / 2);
    const duplicatedEntityDrafts = selectedEntities.map((entity) => {
      const sourceEntity = currentEditorData.entities[entity.index];
      return sourceEntity
        ? stripCadEntityPersistentId(translateEntity(sourceEntity, duplicateOffset, duplicateOffset))
        : null;
    });

    if (duplicatedEntityDrafts.some((entity) => entity === null)) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.duplicateSelectionErrorNotice);
      return;
    }

    const duplicatedEntities = cloneCadEntitiesForInsertion(
      duplicatedEntityDrafts.filter((entity): entity is DXFEntity => entity !== null)
    );
    appendEntitiesToEditor(
      duplicatedEntities,
      resolvedMessages.buildDuplicateSelectedEntitiesNotice({
        duplicatedEntitiesCount: duplicatedEntities.length,
        entityType: selectedEntities[0]?.type || 'selecionada',
        duplicateOffset
      })
    );
  };

  const copySelectedEntities = () => {
    const clipboardPayload = snapshotSelectedEntitiesToClipboard();
    if (!clipboardPayload) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.copySelectionErrorNotice);
      return;
    }

    setCopiedEntitiesClipboard(clipboardPayload);
    closeEntityContextMenu();
    setEditorNotice(resolvedMessages.buildCopySelectedEntitiesNotice({
      copiedEntitiesCount: clipboardPayload.length,
      entityType: selectedEntities[0]?.type || 'selecionada'
    }));
  };

  const cutSelectedEntities = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      return;
    }

    const clipboardPayload = snapshotSelectedEntitiesToClipboard();
    if (!clipboardPayload) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.cutSelectionErrorNotice);
      return;
    }

    const selectedIndexes = new Set(selectedEntities.map((entity) => entity.index));
    const hasInvalidEntity = selectedEntities.some((entity) => !currentEditorData.entities[entity.index]);
    if (selectedIndexes.size === 0 || hasInvalidEntity) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.cutSelectionErrorNotice);
      return;
    }

    const nextEntities = currentEditorData.entities.filter((_, index) => !selectedIndexes.has(index));
    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const cutCount = selectedIndexes.size;

    setCopiedEntitiesClipboard(clipboardPayload);
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
    closeEntityContextMenu();
    setEditorNotice(resolvedMessages.buildCutSelectedEntitiesNotice({
      cutCount,
      entityType: selectedEntities[0]?.type || 'selecionada'
    }));
  };

  const bringSelectedEntitiesToFront = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      return;
    }

    const selectedIndexes = new Set(selectedEntities.map((entity) => entity.index));
    const selectedEntityList = currentEditorData.entities.filter((_, index) => selectedIndexes.has(index));
    const unselectedEntityList = currentEditorData.entities.filter((_, index) => !selectedIndexes.has(index));
    const nextEntities = [...unselectedEntityList, ...selectedEntityList];
    const hasChanged = nextEntities.some((entity, index) => entity !== currentEditorData.entities[index]);

    if (!hasChanged) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.bringToFrontUnavailableNotice);
      return;
    }

    applyEntityOrderUpdate(
      nextEntities,
      resolvedMessages.buildBringToFrontNotice({
        selectedEntitiesCount: selectedEntityList.length,
        entityType: selectedEntityList[0]?.type || 'selecionada'
      })
    );
  };

  const bringSelectedEntitiesForwardOneStep = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      return;
    }

    const nextEntities = [...currentEditorData.entities];
    const selectedIndexes = new Set(selectedEntities.map((entity) => entity.index));
    let hasChanged = false;

    for (let index = nextEntities.length - 2; index >= 0; index -= 1) {
      if (!selectedIndexes.has(index) || selectedIndexes.has(index + 1)) {
        continue;
      }

      const currentEntity = nextEntities[index];
      nextEntities[index] = nextEntities[index + 1];
      nextEntities[index + 1] = currentEntity;
      hasChanged = true;
    }

    if (!hasChanged) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.bringForwardUnavailableNotice);
      return;
    }

    applyEntityOrderUpdate(
      nextEntities,
      resolvedMessages.buildBringForwardNotice({
        selectedEntitiesCount: selectedEntities.length,
        entityType: selectedEntities[0]?.type || 'selecionada'
      })
    );
  };

  const sendSelectedEntitiesToBack = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      return;
    }

    const selectedIndexes = new Set(selectedEntities.map((entity) => entity.index));
    const selectedEntityList = currentEditorData.entities.filter((_, index) => selectedIndexes.has(index));
    const unselectedEntityList = currentEditorData.entities.filter((_, index) => !selectedIndexes.has(index));
    const nextEntities = [...selectedEntityList, ...unselectedEntityList];
    const hasChanged = nextEntities.some((entity, index) => entity !== currentEditorData.entities[index]);

    if (!hasChanged) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.sendToBackUnavailableNotice);
      return;
    }

    applyEntityOrderUpdate(
      nextEntities,
      resolvedMessages.buildSendToBackNotice({
        selectedEntitiesCount: selectedEntityList.length,
        entityType: selectedEntityList[0]?.type || 'selecionada'
      })
    );
  };

  const sendSelectedEntitiesBackwardOneStep = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      return;
    }

    const nextEntities = [...currentEditorData.entities];
    const selectedIndexes = new Set(selectedEntities.map((entity) => entity.index));
    let hasChanged = false;

    for (let index = 1; index < nextEntities.length; index += 1) {
      if (!selectedIndexes.has(index) || selectedIndexes.has(index - 1)) {
        continue;
      }

      const currentEntity = nextEntities[index];
      nextEntities[index] = nextEntities[index - 1];
      nextEntities[index - 1] = currentEntity;
      hasChanged = true;
    }

    if (!hasChanged) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.sendBackwardUnavailableNotice);
      return;
    }

    applyEntityOrderUpdate(
      nextEntities,
      resolvedMessages.buildSendBackwardNotice({
        selectedEntitiesCount: selectedEntities.length,
        entityType: selectedEntities[0]?.type || 'selecionada'
      })
    );
  };

  const pasteCopiedEntities = () => {
    if (!currentEditorData || copiedEntitiesClipboard.length === 0) {
      return;
    }

    const baseOffset = Number.isFinite(gridSnapSize) && gridSnapSize > 0 ? gridSnapSize : 10;
    const pasteOffset = Math.max(baseOffset, majorGridStep / 2);
    const pastedEntities = cloneCadEntitiesForInsertion(copiedEntitiesClipboard.map((entity) =>
      stripCadEntityPersistentId(translateEntity(entity, pasteOffset, pasteOffset))
    ));

    appendEntitiesToEditor(
      pastedEntities,
      resolvedMessages.buildPasteCopiedEntitiesNotice({
        pastedEntitiesCount: pastedEntities.length,
        pasteOffset
      })
    );
  };

  const groupSelectedEntities = () => {
    if (!currentEditorData || selectedEntities.length < 2) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.groupSelectionRequiredNotice);
      return;
    }

    const selectedIds = new Set(selectedEntities.map((entity) => entity.id));
    const nextGroupId = generateCadEditorGroupId();
    const nextEntities = currentEditorData.entities.map((entity, index) => {
      if (!selectedIds.has(buildCadEntitySelectionId(entity, index))) {
        return entity;
      }
      return setCadEntityGroupId(entity, nextGroupId);
    });

    commitEntitySelectionMutation(
      nextEntities,
      Array.from(selectedIds),
      resolvedMessages.buildGroupSelectedEntitiesNotice({
        groupedEntitiesCount: selectedEntities.length
      })
    );
  };

  const ungroupSelectedEntities = () => {
    if (!currentEditorData || selectedEntities.length === 0) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.ungroupSelectionRequiredNotice);
      return;
    }

    const selectedIds = new Set(selectedEntities.map((entity) => entity.id));
    let ungroupedCount = 0;
    const nextEntities = currentEditorData.entities.map((entity, index) => {
      if (!selectedIds.has(buildCadEntitySelectionId(entity, index))) {
        return entity;
      }
      if (!getCadEntityGroupId(entity)) {
        return entity;
      }
      ungroupedCount += 1;
      return setCadEntityGroupId(entity, null);
    });

    if (ungroupedCount === 0) {
      closeEntityContextMenu();
      setEditorNotice(resolvedMessages.ungroupSelectionRequiredNotice);
      return;
    }

    commitEntitySelectionMutation(
      nextEntities,
      Array.from(selectedIds),
      resolvedMessages.buildUngroupSelectedEntitiesNotice({
        ungroupedEntitiesCount: ungroupedCount
      })
    );
  };

  return {
    applySelectedEntityColors,
    bringSelectedEntitiesForwardOneStep,
    bringSelectedEntitiesToFront,
    clearSelectedEntityFill,
    copySelectedEntities,
    cutSelectedEntities,
    duplicateSelectedEntities,
    groupSelectedEntities,
    pasteCopiedEntities,
    removeSelectedEntities,
    sendSelectedEntitiesBackwardOneStep,
    sendSelectedEntitiesToBack,
    ungroupSelectedEntities
  };
};
