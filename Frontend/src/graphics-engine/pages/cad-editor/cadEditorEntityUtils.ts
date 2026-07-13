import { getPersistentEntitySelectionId } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import { normalizeAngleDegrees } from '@/graphics-engine/components/viewer-dxf/trimExtendGeometryUtils';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import type { DXFData, DXFEntity, DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';

let cadEditorEntityIdSequence = 0;
let cadEditorGroupIdSequence = 0;

const countEntitiesByType = (entities: DXFEntity[]): Record<string, number> =>
  entities.reduce<Record<string, number>>((accumulator, entity) => {
    accumulator[entity.type] = (accumulator[entity.type] || 0) + 1;
    return accumulator;
  }, {});

const countEntitiesByLayer = (entities: DXFEntity[]): Record<string, number> =>
  entities.reduce<Record<string, number>>((accumulator, entity) => {
    accumulator[entity.layer] = (accumulator[entity.layer] || 0) + 1;
    return accumulator;
  }, {});

const mirrorX = (value: number, axisX: number) => axisX * 2 - value;
const mirrorBulge = (bulge: number | undefined) => (
  typeof bulge === 'number' && Number.isFinite(bulge) ? -bulge : bulge
);
const mirrorAngleAcrossVerticalAxis = (angle: number) => normalizeAngleDegrees(180 - angle);

const generateCadEditorEntityId = (): string => {
  cadEditorEntityIdSequence += 1;
  return `cad-entity-${cadEditorEntityIdSequence}`;
};

export const generateCadEditorGroupId = (): string => {
  cadEditorGroupIdSequence += 1;
  return `cad-group-${cadEditorGroupIdSequence}`;
};

const ensureCadEntityHasPersistentId = (entity: DXFEntity): DXFEntity => {
  const props = entity.properties as DXFEntityProperties;
  if (typeof props.editorEntityId === 'string' && props.editorEntityId.trim().length > 0) {
    return entity;
  }

  return {
    ...entity,
    properties: {
      ...props,
      editorEntityId: generateCadEditorEntityId()
    }
  };
};

export const getCadEntityGroupId = (entity: DXFEntity): string | null => {
  const props = entity.properties as DXFEntityProperties;
  return typeof props.editorGroupId === 'string' && props.editorGroupId.trim().length > 0
    ? props.editorGroupId
    : null;
};

export const setCadEntityGroupId = (entity: DXFEntity, groupId: string | null): DXFEntity => {
  const props = entity.properties as DXFEntityProperties;
  if (groupId) {
    return {
      ...entity,
      properties: {
        ...props,
        editorGroupId: groupId
      }
    };
  }

  if (typeof props.editorGroupId !== 'string') {
    return entity;
  }

  const { editorGroupId: _editorGroupId, ...remainingProperties } = props;
  return {
    ...entity,
    properties: remainingProperties
  };
};

const normalizeCadEntities = (entities: DXFEntity[]): DXFEntity[] => entities.map(ensureCadEntityHasPersistentId);

const translatePoint = (point: { x: number; y: number }, deltaX: number, deltaY: number) => ({
  x: point.x + deltaX,
  y: point.y + deltaY
});

const isClosedFillableEntity = (entity: DXFEntity): boolean => {
  const props = entity.properties as DXFEntityProperties;
  return ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && Boolean(props.closed)) || entity.type === 'CIRCLE';
};

export const getEntityMirrorAxisX = (selectedEntity: ViewerSelectedEntityInfo, entity: DXFEntity): number => {
  if (typeof selectedEntity.position?.x === 'number') {
    return selectedEntity.position.x;
  }

  const props = entity.properties as DXFEntityProperties;
  if (props.vertices?.length) {
    const total = props.vertices.reduce((sum, vertex) => sum + vertex.x, 0);
    return total / props.vertices.length;
  }

  if (typeof props.x1 === 'number' && typeof props.x2 === 'number') {
    return (props.x1 + props.x2) / 2;
  }

  if (typeof props.x === 'number') {
    return props.x;
  }

  if (typeof props.centerX === 'number') {
    return props.centerX;
  }

  return 0;
};

export const mirrorEntityAcrossVerticalAxis = (entity: DXFEntity, axisX: number): DXFEntity => {
  const props = entity.properties as DXFEntityProperties;
  const mirroredVertices = props.vertices?.map((vertex: DXFVertex) => ({
    ...vertex,
    x: mirrorX(vertex.x, axisX),
    bulge: mirrorBulge(vertex.bulge)
  }));

  const mirroredProps: DXFEntityProperties = {
    ...props,
    x: typeof props.x === 'number' ? mirrorX(props.x, axisX) : props.x,
    x1: typeof props.x1 === 'number' ? mirrorX(props.x1, axisX) : props.x1,
    x2: typeof props.x2 === 'number' ? mirrorX(props.x2, axisX) : props.x2,
    centerX: typeof props.centerX === 'number' ? mirrorX(props.centerX, axisX) : props.centerX,
    alignmentX: typeof props.alignmentX === 'number' ? mirrorX(props.alignmentX, axisX) : props.alignmentX,
    vertices: mirroredVertices
  };

  if (typeof props.rotation === 'number') {
    mirroredProps.rotation = (180 - props.rotation + 360) % 360;
  }

  if (entity.type === 'ARC' && typeof props.startAngle === 'number' && typeof props.endAngle === 'number') {
    mirroredProps.startAngle = mirrorAngleAcrossVerticalAxis(props.endAngle);
    mirroredProps.endAngle = mirrorAngleAcrossVerticalAxis(props.startAngle);
  }

  return {
    ...entity,
    properties: mirroredProps
  };
};

export const stripCadEntityPersistentId = (entity: DXFEntity): DXFEntity => {
  const props = entity.properties as DXFEntityProperties;
  if (typeof props.editorEntityId !== 'string') {
    return entity;
  }

  const { editorEntityId: _editorEntityId, ...remainingProperties } = props;
  return {
    ...entity,
    properties: remainingProperties
  };
};

export const cloneCadEntitiesForInsertion = (entities: DXFEntity[]): DXFEntity[] => {
  const nextGroupIdBySource = new Map<string, string>();

  return entities.map((entity) => {
    const withoutPersistentId = stripCadEntityPersistentId(entity);
    const sourceGroupId = getCadEntityGroupId(withoutPersistentId);
    if (!sourceGroupId) {
      return withoutPersistentId;
    }

    const nextGroupId = nextGroupIdBySource.get(sourceGroupId) || generateCadEditorGroupId();
    nextGroupIdBySource.set(sourceGroupId, nextGroupId);
    return setCadEntityGroupId(withoutPersistentId, nextGroupId);
  });
};

export const buildUpdatedDxfData = (baseData: DXFData, entities: DXFEntity[]): DXFData => {
  const normalizedEntities = normalizeCadEntities(entities);
  const layerNameSet = new Set<string>();
  const mergedLayers = [...(baseData.layers || [])];

  mergedLayers.forEach((layer) => {
    if (layer.name) {
      layerNameSet.add(layer.name);
    }
  });

  normalizedEntities.forEach((entity) => {
    const layerName = entity.layer?.trim();
    if (layerName && !layerNameSet.has(layerName)) {
      layerNameSet.add(layerName);
      mergedLayers.push({ name: layerName });
    }
  });

  return {
    entities: normalizedEntities,
    layers: mergedLayers,
    entityCounts: countEntitiesByType(normalizedEntities),
    layerCounts: countEntitiesByLayer(normalizedEntities)
  };
};

export const translateEntity = (entity: DXFEntity, deltaX: number, deltaY: number): DXFEntity => {
  const props = entity.properties as DXFEntityProperties;
  const translatedVertices = props.vertices?.map((vertex: DXFVertex) => ({
    ...vertex,
    x: vertex.x + deltaX,
    y: vertex.y + deltaY
  }));

  return {
    ...entity,
    properties: {
      ...props,
      x: typeof props.x === 'number' ? props.x + deltaX : props.x,
      y: typeof props.y === 'number' ? props.y + deltaY : props.y,
      x1: typeof props.x1 === 'number' ? props.x1 + deltaX : props.x1,
      y1: typeof props.y1 === 'number' ? props.y1 + deltaY : props.y1,
      x2: typeof props.x2 === 'number' ? props.x2 + deltaX : props.x2,
      y2: typeof props.y2 === 'number' ? props.y2 + deltaY : props.y2,
      centerX: typeof props.centerX === 'number' ? props.centerX + deltaX : props.centerX,
      centerY: typeof props.centerY === 'number' ? props.centerY + deltaY : props.centerY,
      alignmentX: typeof props.alignmentX === 'number' ? props.alignmentX + deltaX : props.alignmentX,
      alignmentY: typeof props.alignmentY === 'number' ? props.alignmentY + deltaY : props.alignmentY,
      vertices: translatedVertices
    }
  };
};

export const applyEntityPaintStyle = (
  entity: DXFEntity,
  options: {
    lineColor: string;
    fillColor: string | null;
  }
): DXFEntity => {
  const props = entity.properties as DXFEntityProperties;
  const nextProperties: DXFEntityProperties = {
    ...props,
    lineColor: options.lineColor
  };

  if (isClosedFillableEntity(entity) && options.fillColor) {
    nextProperties.fillColor = options.fillColor;
  } else {
    delete nextProperties.fillColor;
  }

  return {
    ...entity,
    properties: nextProperties
  };
};

export const translateSelectedEntityInfo = (
  entity: ViewerSelectedEntityInfo,
  deltaX: number,
  deltaY: number
): ViewerSelectedEntityInfo => ({
  ...entity,
  position: entity.position ? translatePoint(entity.position, deltaX, deltaY) : entity.position,
  startPoint: entity.startPoint ? translatePoint(entity.startPoint, deltaX, deltaY) : entity.startPoint,
  endPoint: entity.endPoint ? translatePoint(entity.endPoint, deltaX, deltaY) : entity.endPoint
});

export const buildCadEntitySelectionId = (entity: DXFEntity, index: number): string =>
  getPersistentEntitySelectionId(entity) || [index, entity.layer || '0', entity.type].join('::');
