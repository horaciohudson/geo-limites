import { useMemo } from 'react';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import type { CadLayerDefinition } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import type { CadEditorLayerClassificationInput } from '@/graphics-engine/pages/cad-editor/cadEditorHost';
import { getWeldAvailability } from '@/graphics-engine/pages/cad-editor/cadEditorWeldUtils';
import type { DXFData } from '@/graphics-engine/shared/dxf';

const getSelectionCentroid = (entities: ViewerSelectedEntityInfo[]) => {
  const positionedEntities = entities.filter(
    (entity): entity is ViewerSelectedEntityInfo & { position: { x: number; y: number } } =>
      Boolean(entity.position)
  );

  if (positionedEntities.length === 0) {
    return null;
  }

  const total = positionedEntities.reduce(
    (accumulator, entity) => ({
      x: accumulator.x + entity.position.x,
      y: accumulator.y + entity.position.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / positionedEntities.length,
    y: total.y / positionedEntities.length
  };
};

interface UseCadEditorRightSidebarViewModelParams {
  loadedDxfData: DXFData | null;
  currentEditorData: DXFData | null;
  selectedEntities: ViewerSelectedEntityInfo[];
  activeLayerName: string;
  activeToolId: string;
  weldTolerance: number;
  baseLayers: ReadonlyArray<CadLayerDefinition>;
  layerColorClasses: ReadonlyArray<string>;
  resolveFunctionalLayerName?: (input: CadEditorLayerClassificationInput) => string;
}

export const useCadEditorRightSidebarViewModel = ({
  loadedDxfData,
  currentEditorData,
  selectedEntities,
  activeLayerName,
  activeToolId,
  weldTolerance,
  baseLayers,
  layerColorClasses,
  resolveFunctionalLayerName
}: UseCadEditorRightSidebarViewModelParams) => {
  const baseLayerNameSet = useMemo(
    () => new Set(baseLayers.map((layer) => layer.name)),
    [baseLayers]
  );
  const resolveDisplayLayerName = useMemo(
    () => (
      resolveFunctionalLayerName
        ? (input: CadEditorLayerClassificationInput) => (
          baseLayerNameSet.has(input.layer)
            ? input.layer
            : resolveFunctionalLayerName(input)
        )
        : (input: CadEditorLayerClassificationInput) => input.layer
    ),
    [baseLayerNameSet, resolveFunctionalLayerName]
  );
  const geometryEntityCount = useMemo(
    () =>
      (loadedDxfData?.entities || []).filter((entity) =>
        ['LINE', 'POLYLINE', 'LWPOLYLINE', 'CIRCLE', 'ARC'].includes(entity.type)
      ).length,
    [loadedDxfData]
  );

  const textEntityCount = useMemo(
    () =>
      (loadedDxfData?.entities || []).filter((entity) =>
        ['TEXT', 'MTEXT', 'ATTRIB'].includes(entity.type)
      ).length,
    [loadedDxfData]
  );

  const layerSummaries = useMemo<CadLayerDefinition[]>(
    () => {
      const mergedLayerNames = new Map<string, number>();
      const layerEntityCounts: Record<string, number> = {};
      const sourceData = currentEditorData || loadedDxfData;

      (sourceData?.layers || []).forEach((layer) => {
        const layerName = layer.name?.trim();
        if (layerName && !mergedLayerNames.has(layerName)) {
          mergedLayerNames.set(layerName, mergedLayerNames.size);
        }
      });

      baseLayers.forEach((layer) => {
        if (!mergedLayerNames.has(layer.name)) {
          mergedLayerNames.set(layer.name, mergedLayerNames.size);
        }
      });

      if (resolveFunctionalLayerName) {
        (sourceData?.entities || []).forEach((entity) => {
          const layerName = resolveDisplayLayerName({
            layer: entity.layer,
            type: entity.type,
            text: typeof entity.properties.text === 'string' ? entity.properties.text : null
          });
          if (!mergedLayerNames.has(layerName)) {
            mergedLayerNames.set(layerName, mergedLayerNames.size);
          }
          layerEntityCounts[layerName] = (layerEntityCounts[layerName] || 0) + 1;
        });
      } else {
        (sourceData?.layers || []).forEach((layer, index) => {
          const layerName = layer.name || `CAMADA_${index + 1}`;
          if (!mergedLayerNames.has(layerName)) {
            mergedLayerNames.set(layerName, mergedLayerNames.size);
          }
          layerEntityCounts[layerName] = sourceData?.layerCounts?.[layerName] || 0;
        });
      }

      return Array.from(mergedLayerNames.keys()).map((layerName, index) => ({
        name: layerName,
        colorClass: layerColorClasses[index % layerColorClasses.length],
        entityCount: layerEntityCounts[layerName] || 0
      }));
    },
    [baseLayers, currentEditorData, layerColorClasses, loadedDxfData, resolveDisplayLayerName, resolveFunctionalLayerName]
  );

  const layerPlaceholderRows = Math.max(0, 6 - layerSummaries.length);

  const topEntityTypes = useMemo(
    () =>
      Object.entries(loadedDxfData?.entityCounts || {})
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3),
    [loadedDxfData]
  );

  const activeLayerSummary = useMemo(
    () => layerSummaries.find((layer) => layer.name === activeLayerName) || layerSummaries[0] || null,
    [activeLayerName, layerSummaries]
  );

  const activeLayerEntityTypes = useMemo(
    () =>
      Object.entries(
        (loadedDxfData?.entities || []).reduce<Record<string, number>>((accumulator, entity) => {
          const entityLayerName = resolveDisplayLayerName({
            layer: entity.layer,
            type: entity.type,
            text: typeof entity.properties.text === 'string' ? entity.properties.text : null
          });

          if (entityLayerName !== activeLayerName) {
            return accumulator;
          }

          accumulator[entity.type] = (accumulator[entity.type] || 0) + 1;
          return accumulator;
        }, {})
      )
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3),
    [activeLayerName, loadedDxfData, resolveDisplayLayerName]
  );

  const primarySelectedEntity = selectedEntities[selectedEntities.length - 1] || null;

  const selectedLayerLabels = useMemo(
    () => Array.from(new Set(selectedEntities.map((entity) => (
      resolveDisplayLayerName({
        layer: entity.layer,
        type: entity.type,
        text: entity.text || null
      })
    )).filter(Boolean))),
    [resolveDisplayLayerName, selectedEntities]
  );

  const selectedTypeLabels = useMemo(
    () => Array.from(new Set(selectedEntities.map((entity) => entity.type).filter(Boolean))),
    [selectedEntities]
  );

  const selectionPosition = useMemo(() => getSelectionCentroid(selectedEntities), [selectedEntities]);

  const selectionLength = useMemo(() => {
    const lengths = selectedEntities
      .map((entity) => entity.length)
      .filter((value): value is number => typeof value === 'number');
    if (lengths.length === 0) {
      return null;
    }
    return lengths.reduce((total, value) => total + value, 0);
  }, [selectedEntities]);

  const selectionVertexCount = useMemo(() => {
    const counts = selectedEntities
      .map((entity) => entity.vertexCount)
      .filter((value): value is number => typeof value === 'number');
    if (counts.length === 0) {
      return null;
    }
    return counts.reduce((total, value) => total + value, 0);
  }, [selectedEntities]);

  const selectionEntityLabel = selectedEntities.length > 1
    ? `${selectedEntities.length} entidades`
    : primarySelectedEntity?.type || 'Nenhuma';

  const selectionLayerLabel = selectedLayerLabels.length === 0
    ? 'Nenhuma'
    : selectedLayerLabels.length === 1
      ? selectedLayerLabels[0]
      : `${selectedLayerLabels.length} camadas`;

  const selectionTextLabel = selectedEntities.length <= 1
    ? primarySelectedEntity?.text || 'N/A'
    : (() => {
        const selectedTextCount = selectedEntities.filter((entity) => Boolean(entity.text)).length;
        return selectedTextCount > 0 ? `${selectedTextCount} textos na selecao` : 'Multipla selecao';
      })();

  const weldAvailability = useMemo(
    () => getWeldAvailability(currentEditorData, selectedEntities, weldTolerance),
    [currentEditorData, selectedEntities, weldTolerance]
  );

  const weldPreviewSegments = useMemo(
    () => (activeToolId === 'join' ? weldAvailability.previewSegments : []),
    [activeToolId, weldAvailability.previewSegments]
  );

  const weldPreviewPoints = useMemo(
    () => (activeToolId === 'join' ? weldAvailability.previewPoints : []),
    [activeToolId, weldAvailability.previewPoints]
  );

  return {
    geometryEntityCount,
    textEntityCount,
    layerSummaries,
    layerPlaceholderRows,
    topEntityTypes,
    activeLayerSummary,
    activeLayerEntityTypes,
    primarySelectedEntity,
    selectedTypeLabels,
    selectionPosition,
    selectionLength,
    selectionVertexCount,
    selectionEntityLabel,
    selectionLayerLabel,
    selectionTextLabel,
    weldAvailability,
    weldPreviewSegments,
    weldPreviewPoints
  };
};

