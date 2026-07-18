import type { CadLayerDefinition } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import type { DXFData, DXFEntity, DXFLayer, DXFVertex } from '@/graphics-engine/shared/dxf';
import {
  GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF,
  GEO_LIMITES_FUNCTIONAL_LAYER_AUXILIAR,
  GEO_LIMITES_FUNCTIONAL_LAYER_CONFRONTACOES_TXT,
  GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM,
  GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT,
  resolveGeoLimitesFunctionalLayerNameFromEntity
} from '@/graphics-engine/adapters/geolimites/functionalLayerUtils';

const normalizeLayerName = (layerName: string | undefined | null) => {
  const normalized = String(layerName || '').trim();
  return normalized || '0';
};

const cloneVertices = (vertices: DXFVertex[] | undefined): DXFVertex[] | undefined => {
  if (!vertices) {
    return undefined;
  }

  return vertices.map((vertex) => (
    typeof vertex.bulge === 'number'
      ? { x: vertex.x, y: vertex.y, bulge: vertex.bulge }
      : { x: vertex.x, y: vertex.y }
  ));
};

const cloneEntityWithLayer = (entity: DXFEntity, nextLayer: string): DXFEntity => ({
  ...entity,
  layer: nextLayer,
  properties: {
    ...entity.properties,
    ...(entity.layer !== nextLayer ? { originalLayer: entity.layer } : {}),
    ...(entity.properties.vertices ? { vertices: cloneVertices(entity.properties.vertices) } : {})
  }
});

export const normalizeDxfToFunctionalLayers = (
  dxfData: DXFData,
  baseLayers: ReadonlyArray<CadLayerDefinition>
): DXFData => {
  const baseLayerNameSet = new Set(baseLayers.map((layer) => normalizeLayerName(layer.name)));
  const editorCreatedLayerNames = new Set<string>();
  const originalLayerVisibilityMap = new Map<string, boolean>();

  dxfData.layers.forEach((layer) => {
    const normalizedLayerName = normalizeLayerName(layer.name);
    originalLayerVisibilityMap.set(normalizedLayerName, !layer.hiddenByDefault);
    if (!baseLayerNameSet.has(normalizedLayerName) && layer.editorCreated) {
      editorCreatedLayerNames.add(normalizedLayerName);
    }
  });

  const normalizedLayerVisibility = new Map<string, { hasVisibleSource: boolean; hasHiddenSource: boolean }>();
  const normalizedEntities = dxfData.entities.map((entity) => {
    const normalizedOriginalLayerName = normalizeLayerName(entity.layer);
    const resolvedLayerName = editorCreatedLayerNames.has(normalizedOriginalLayerName)
      ? normalizedOriginalLayerName
      : resolveGeoLimitesFunctionalLayerNameFromEntity(entity);
    const sourceIsVisible = originalLayerVisibilityMap.get(normalizedOriginalLayerName) ?? true;
    const currentVisibility = normalizedLayerVisibility.get(resolvedLayerName) || {
      hasVisibleSource: false,
      hasHiddenSource: false
    };

    if (sourceIsVisible) {
      currentVisibility.hasVisibleSource = true;
    } else {
      currentVisibility.hasHiddenSource = true;
    }
    normalizedLayerVisibility.set(resolvedLayerName, currentVisibility);

    return cloneEntityWithLayer(entity, resolvedLayerName);
  });

  const orderedLayerNames = new Set<string>(baseLayerNameSet);
  editorCreatedLayerNames.forEach((layerName) => {
    orderedLayerNames.add(layerName);
  });
  normalizedEntities.forEach((entity) => {
    orderedLayerNames.add(normalizeLayerName(entity.layer));
  });

  const hasPrimaryDrawingContent = normalizedEntities.some((entity) => (
    entity.layer === GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM
      || entity.layer === GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT
      || entity.layer === GEO_LIMITES_FUNCTIONAL_LAYER_CONFRONTACOES_TXT
  ));

  const layers: DXFLayer[] = Array.from(orderedLayerNames).map((layerName) => {
    const visibility = normalizedLayerVisibility.get(layerName);
    const hiddenByImportedState = Boolean(visibility?.hasHiddenSource && !visibility.hasVisibleSource);
    const hiddenByRelevanceFocus = hasPrimaryDrawingContent
      && (
        layerName === GEO_LIMITES_FUNCTIONAL_LAYER_AUXILIAR
        || layerName === GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF
      );

    return {
      name: layerName,
      hiddenByDefault: hiddenByImportedState || hiddenByRelevanceFocus
    };
  });
  const entityCounts = normalizedEntities.reduce<Record<string, number>>((counts, entity) => {
    counts[entity.type] = (counts[entity.type] || 0) + 1;
    return counts;
  }, {});
  const layerCounts = layers.reduce<Record<string, number>>((counts, layer) => {
    counts[layer.name] = 0;
    return counts;
  }, {});

  normalizedEntities.forEach((entity) => {
    layerCounts[entity.layer] = (layerCounts[entity.layer] || 0) + 1;
  });

  return {
    ...dxfData,
    entities: normalizedEntities,
    layers,
    entityCounts,
    layerCounts
  };
};
