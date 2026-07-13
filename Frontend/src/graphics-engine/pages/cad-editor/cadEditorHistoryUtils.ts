import type { Dispatch, SetStateAction } from 'react';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import type { DXFData, DXFEntity, DXFEntityProperties, DXFLayer, DXFVertex } from '@/graphics-engine/shared/dxf';

const cloneVertex = (vertex: DXFVertex): DXFVertex => ({
  x: vertex.x,
  y: vertex.y,
  ...(typeof vertex.bulge === 'number' ? { bulge: vertex.bulge } : {})
});

const isVertex = (value: unknown): value is DXFVertex => (
  typeof value === 'object'
  && value !== null
  && 'x' in value
  && 'y' in value
);

const clonePropertyValue = (value: DXFEntityProperties[keyof DXFEntityProperties]) => {
  if (Array.isArray(value)) {
    if (value.every(isVertex)) {
      return value.map(cloneVertex);
    }

    return [...value];
  }

  return value;
};

const cloneEntityProperties = (properties: DXFEntityProperties): DXFEntityProperties => {
  const nextProperties: DXFEntityProperties = {};

  Object.entries(properties).forEach(([key, value]) => {
    nextProperties[key] = clonePropertyValue(value);
  });

  return nextProperties;
};

const cloneEntity = (entity: DXFEntity): DXFEntity => ({
  type: entity.type,
  layer: entity.layer,
  properties: cloneEntityProperties(entity.properties)
});

const cloneLayer = (layer: DXFLayer): DXFLayer => ({
  ...layer
});

export const cloneDxfDataSnapshot = (data: DXFData): DXFData => ({
  entities: data.entities.map(cloneEntity),
  layers: data.layers.map(cloneLayer),
  entityCounts: { ...data.entityCounts },
  layerCounts: { ...data.layerCounts }
});

interface CommitCadEditorHistoryEntryParams {
  currentEditorData: DXFData;
  nextData: DXFData;
  setUndoStack: Dispatch<SetStateAction<DXFData[]>>;
  setRedoStack: Dispatch<SetStateAction<DXFData[]>>;
  setLoadedDxfData: Dispatch<SetStateAction<DXFData | null>>;
}

export const commitCadEditorHistoryEntry = ({
  currentEditorData,
  nextData,
  setUndoStack,
  setRedoStack,
  setLoadedDxfData
}: CommitCadEditorHistoryEntryParams) => {
  setUndoStack((current) => [...current, cloneDxfDataSnapshot(currentEditorData)]);
  setRedoStack([]);
  setLoadedDxfData(cloneDxfDataSnapshot(nextData));
};

interface SyncCadEditorSelectionParams {
  selectedEntities: ViewerSelectedEntityInfo[];
  setSelectedEntities: Dispatch<SetStateAction<ViewerSelectedEntityInfo[]>>;
  setViewerSelectionOverride: Dispatch<SetStateAction<string[] | undefined>>;
}

export const syncCadEditorSelection = ({
  selectedEntities,
  setSelectedEntities,
  setViewerSelectionOverride
}: SyncCadEditorSelectionParams) => {
  setSelectedEntities(selectedEntities);
  setViewerSelectionOverride(selectedEntities.map((entity) => entity.id));
};

export const clearCadEditorSelection = ({
  setSelectedEntities,
  setViewerSelectionOverride
}: Omit<SyncCadEditorSelectionParams, 'selectedEntities'>) => {
  setSelectedEntities([]);
  setViewerSelectionOverride([]);
};

interface ClearCadEditorSelectionStateParams<SelectionItem> {
  setSelectedEntities: Dispatch<SetStateAction<SelectionItem[]>>;
  setViewerSelectionOverride: Dispatch<SetStateAction<string[] | undefined>>;
}

export const clearCadEditorSelectionState = <SelectionItem>({
  setSelectedEntities,
  setViewerSelectionOverride
}: ClearCadEditorSelectionStateParams<SelectionItem>) => {
  setSelectedEntities([]);
  setViewerSelectionOverride([]);
};

interface CommitCadEditorUndoRedoTransitionParams<SelectionItem> {
  currentEditorData: DXFData;
  targetData: DXFData;
  setSourceStack: Dispatch<SetStateAction<DXFData[]>>;
  setTargetStack: Dispatch<SetStateAction<DXFData[]>>;
  setLoadedDxfData: Dispatch<SetStateAction<DXFData | null>>;
  setSelectedEntities: Dispatch<SetStateAction<SelectionItem[]>>;
  setViewerSelectionOverride: Dispatch<SetStateAction<string[] | undefined>>;
}

export const commitCadEditorUndoRedoTransition = <SelectionItem>({
  currentEditorData,
  targetData,
  setSourceStack,
  setTargetStack,
  setLoadedDxfData,
  setSelectedEntities,
  setViewerSelectionOverride
}: CommitCadEditorUndoRedoTransitionParams<SelectionItem>) => {
  setSourceStack((current) => current.slice(0, -1));
  setTargetStack((current) => [...current, cloneDxfDataSnapshot(currentEditorData)]);
  setLoadedDxfData(cloneDxfDataSnapshot(targetData));
  clearCadEditorSelectionState({
    setSelectedEntities,
    setViewerSelectionOverride
  });
};
