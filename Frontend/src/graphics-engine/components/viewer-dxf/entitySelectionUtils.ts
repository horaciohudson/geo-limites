import type { DXFEntity, DXFEntityProperties } from '@/graphics-engine/shared/dxf';
import { calculateDistance } from '@/graphics-engine/shared/geometry';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/viewerState';
import { isPointInPolygon, pointToSegmentDistance } from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import {
  getArcPointAtAngle,
  getArcSweepDegrees,
  getPointAngleDegrees,
  isAngleInsideArc
} from '@/graphics-engine/components/viewer-dxf/trimExtendGeometryUtils';
import {
  buildArcSamplePoints,
  buildPolylineSamplePoints,
  getSampledPointBounds
} from '@/graphics-engine/components/viewer-dxf/dxfGeometryUtils';

export interface EntityBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const buildInteriorFallbackDistance = (distanceToBoundary: number, pickRadius: number): number =>
  pickRadius + Math.min(Math.max(distanceToBoundary, 0), pickRadius * 4);

export const isTextLikeEntity = (entity: DXFEntity): boolean =>
  entity.type === 'TEXT' || entity.type === 'MTEXT' || entity.type === 'ATTRIB';

export const extractTextPosition = (entity: DXFEntity): Point2D | null => {
  const props = entity.properties as DXFEntityProperties;
  
  // No DXF, se hAlign > 0 ou vAlign > 0, o ponto de ancoragem real é o alignmentX/Y (códigos 11 e 21).
  // Se forem 0 ou ausentes, o ponto real é o x/y (códigos 10 e 20).
  // Exceção: Para hAlign = 3 (Aligned) ou 5 (Fit), os pontos 10 e 11 definem a linha base.
  // Como não suportamos o esticamento perfeito no canvas ainda, usamos o ponto inicial (10, 20)
  // ou o ponto médio entre eles para melhor aproximação visual.
  const isAlignedOrFit = props.horizontalAlign === 3 || props.horizontalAlign === 5;
  const hasAlignmentPoint = !isAlignedOrFit && ((typeof props.horizontalAlign === 'number' && props.horizontalAlign > 0) || 
                            (typeof props.verticalAlign === 'number' && props.verticalAlign > 0));
  
  let x: number | undefined;
  let y: number | undefined;
  
  if (isAlignedOrFit && typeof props.x === 'number' && typeof props.alignmentX === 'number') {
    x = (props.x + props.alignmentX) / 2;
    y = (props.y! + (props.alignmentY ?? props.y!)) / 2;
  } else if (hasAlignmentPoint) {
    x = props.alignmentX ?? props.x ?? props.x1;
    y = props.alignmentY ?? props.y ?? props.y1;
  } else {
    x = props.x ?? props.alignmentX ?? props.x1;
    y = props.y ?? props.alignmentY ?? props.y1;
  }

  if (typeof x !== 'number' || typeof y !== 'number') {
    return null;
  }

  return { x, y };
};

export const getPersistentEntitySelectionId = (entity: DXFEntity): string | null => {
  const props = entity.properties as DXFEntityProperties;
  return typeof props.editorEntityId === 'string' && props.editorEntityId.trim().length > 0
    ? props.editorEntityId
    : null;
};

export const getPersistentEntityGroupId = (entity: DXFEntity): string | null => {
  const props = entity.properties as DXFEntityProperties;
  return typeof props.editorGroupId === 'string' && props.editorGroupId.trim().length > 0
    ? props.editorGroupId
    : null;
};

export const buildEntitySelectionId = (entity: DXFEntity, index: number): string =>
  getPersistentEntitySelectionId(entity) || [index, entity.layer || '0', entity.type].join('::');

export const getEntityVertexCount = (entity: DXFEntity): number | undefined => {
  const props = entity.properties as DXFEntityProperties;
  if (props.vertices?.length) {
    return props.vertices.length;
  }
  if (entity.type === 'LINE') {
    return 2;
  }
  if (entity.type === 'ARC') {
    return 2;
  }
  return undefined;
};

export const getEntityLength = (entity: DXFEntity): number | undefined => {
  const props = entity.properties as DXFEntityProperties;
  if (entity.type === 'LINE' && typeof props.x1 === 'number' && typeof props.y1 === 'number' && typeof props.x2 === 'number' && typeof props.y2 === 'number') {
    return calculateDistance({ x: props.x1, y: props.y1 }, { x: props.x2, y: props.y2 });
  }
  if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices && props.vertices.length > 1) {
    const sampledPoints = buildPolylineSamplePoints(props.vertices, props.closed);
    if (sampledPoints.length > 1) {
      let length = 0;
      for (let index = 1; index < sampledPoints.length; index += 1) {
        length += calculateDistance(sampledPoints[index - 1], sampledPoints[index]);
      }
      return length;
    }
    let length = 0;
    for (let index = 1; index < props.vertices.length; index += 1) {
      length += calculateDistance(props.vertices[index - 1], props.vertices[index]);
    }
    if (props.closed && props.vertices.length > 2) {
      length += calculateDistance(props.vertices[props.vertices.length - 1], props.vertices[0]);
    }
    return length;
  }
  if (
    entity.type === 'ARC'
    && typeof props.radius === 'number'
    && typeof props.startAngle === 'number'
    && typeof props.endAngle === 'number'
  ) {
    return (Math.PI * props.radius * getArcSweepDegrees(props.startAngle, props.endAngle)) / 180;
  }
  return undefined;
};

export const getEntityRepresentativePosition = (entity: DXFEntity): Point2D | null => {
  const props = entity.properties as DXFEntityProperties;
  if (isTextLikeEntity(entity)) {
    return extractTextPosition(entity);
  }
  if (entity.type === 'LINE' && typeof props.x1 === 'number' && typeof props.y1 === 'number' && typeof props.x2 === 'number' && typeof props.y2 === 'number') {
    return { x: (props.x1 + props.x2) / 2, y: (props.y1 + props.y2) / 2 };
  }
  if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices?.length) {
    const sampledPoints = buildPolylineSamplePoints(props.vertices, props.closed);
    const basePoints = sampledPoints.length > 0 ? sampledPoints : props.vertices;
    const total = basePoints.reduce((acc, vertex) => ({ x: acc.x + vertex.x, y: acc.y + vertex.y }), { x: 0, y: 0 });
    return { x: total.x / basePoints.length, y: total.y / basePoints.length };
  }
  if (
    entity.type === 'ARC'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.radius === 'number'
    && typeof props.startAngle === 'number'
    && typeof props.endAngle === 'number'
  ) {
    const midAngle = props.startAngle + (getArcSweepDegrees(props.startAngle, props.endAngle) / 2);
    return getArcPointAtAngle({ x: props.centerX, y: props.centerY }, props.radius, midAngle);
  }
  if (typeof props.centerX === 'number' && typeof props.centerY === 'number') {
    return { x: props.centerX, y: props.centerY };
  }
  if (typeof props.x === 'number' && typeof props.y === 'number') {
    return { x: props.x, y: props.y };
  }
  return null;
};

export const getEntityBounds = (entity: DXFEntity): EntityBounds | null => {
  const props = entity.properties as DXFEntityProperties;

  if (isTextLikeEntity(entity)) {
    const position = extractTextPosition(entity);
    if (!position) {
      return null;
    }
    return {
      minX: position.x,
      minY: position.y,
      maxX: position.x,
      maxY: position.y
    };
  }

  if (
    entity.type === 'LINE'
    && typeof props.x1 === 'number'
    && typeof props.y1 === 'number'
    && typeof props.x2 === 'number'
    && typeof props.y2 === 'number'
  ) {
    return {
      minX: Math.min(props.x1, props.x2),
      minY: Math.min(props.y1, props.y2),
      maxX: Math.max(props.x1, props.x2),
      maxY: Math.max(props.y1, props.y2)
    };
  }

  if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices?.length) {
    const sampledBounds = getSampledPointBounds(buildPolylineSamplePoints(props.vertices, props.closed));
    if (sampledBounds) {
      return sampledBounds;
    }
  }

  if (
    entity.type === 'ARC'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.radius === 'number'
    && typeof props.startAngle === 'number'
    && typeof props.endAngle === 'number'
    && props.radius > 0
  ) {
    const sampledBounds = getSampledPointBounds(
      buildArcSamplePoints({ x: props.centerX, y: props.centerY }, props.radius, props.startAngle, props.endAngle)
    );
    if (sampledBounds) {
      return sampledBounds;
    }
  }

  if (typeof props.centerX === 'number' && typeof props.centerY === 'number') {
    const radius = typeof props.radius === 'number' && props.radius > 0 ? props.radius : 0;
    return {
      minX: props.centerX - radius,
      minY: props.centerY - radius,
      maxX: props.centerX + radius,
      maxY: props.centerY + radius
    };
  }

  if (typeof props.x === 'number' && typeof props.y === 'number') {
    return {
      minX: props.x,
      minY: props.y,
      maxX: props.x,
      maxY: props.y
    };
  }

  return null;
};

export const buildSelectedEntityInfo = (entity: DXFEntity, index: number): ViewerSelectedEntityInfo => {
  const props = entity.properties as DXFEntityProperties;
  const arcStartPoint = (
    entity.type === 'ARC'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.radius === 'number'
    && typeof props.startAngle === 'number'
  ) ? getArcPointAtAngle({ x: props.centerX, y: props.centerY }, props.radius, props.startAngle) : null;
  const arcEndPoint = (
    entity.type === 'ARC'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.radius === 'number'
    && typeof props.endAngle === 'number'
  ) ? getArcPointAtAngle({ x: props.centerX, y: props.centerY }, props.radius, props.endAngle) : null;
  return {
    id: buildEntitySelectionId(entity, index),
    index,
    type: entity.type,
    layer: entity.layer || '0',
    groupId: getPersistentEntityGroupId(entity) || undefined,
    text: typeof props.text === 'string' ? props.text.trim() : undefined,
    closed: typeof props.closed === 'boolean' ? props.closed : undefined,
    vertexCount: getEntityVertexCount(entity),
    length: getEntityLength(entity),
    radius: typeof props.radius === 'number' ? props.radius : undefined,
    position: getEntityRepresentativePosition(entity),
    startPoint: entity.type === 'LINE' && typeof props.x1 === 'number' && typeof props.y1 === 'number'
      ? { x: props.x1, y: props.y1 }
      : arcStartPoint,
    endPoint: entity.type === 'LINE' && typeof props.x2 === 'number' && typeof props.y2 === 'number'
      ? { x: props.x2, y: props.y2 }
      : arcEndPoint
  };
};

export const findNearestSelectableEntityInfo = (
  entities: DXFEntity[],
  dxfCoords: Point2D,
  scale: number,
  matcher?: (entity: DXFEntity, index: number) => boolean
): ViewerSelectedEntityInfo | null => {
  const textPickRadius = 25 / Math.max(scale, 0.0001);
  const geometryPickRadius = 18 / Math.max(scale, 0.0001);
  let nearestInfo: ViewerSelectedEntityInfo | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = entities.length - 1; index >= 0; index -= 1) {
    const entity = entities[index];
    if (matcher && !matcher(entity, index)) {
      continue;
    }
    const props = entity.properties as DXFEntityProperties;
    let distance: number | null = null;

    if (isTextLikeEntity(entity)) {
      const position = extractTextPosition(entity);
      if (position) {
        distance = calculateDistance(dxfCoords, position);
        if (distance > textPickRadius) {
          distance = null;
        }
      }
    } else if (
      entity.type === 'LINE'
      && typeof props.x1 === 'number'
      && typeof props.y1 === 'number'
      && typeof props.x2 === 'number'
      && typeof props.y2 === 'number'
    ) {
      distance = pointToSegmentDistance(dxfCoords, { x: props.x1, y: props.y1 }, { x: props.x2, y: props.y2 });
      if (distance > geometryPickRadius) {
        distance = null;
      }
    } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices && props.vertices.length > 1) {
      const polylinePoints = buildPolylineSamplePoints(props.vertices, props.closed);
      const polygonPoints = polylinePoints.length > 0 ? polylinePoints : props.vertices;
      const edges = polygonPoints.slice(1).map((vertex, vertexIndex) => ({
        start: polygonPoints[vertexIndex],
        end: vertex
      }));
      if (props.closed && polygonPoints.length > 2) {
        edges.push({ start: polygonPoints[polygonPoints.length - 1], end: polygonPoints[0] });
      }
      if (edges.length > 0) {
        distance = Math.min(...edges.map((edge) => pointToSegmentDistance(dxfCoords, edge.start, edge.end)));
        if (distance > geometryPickRadius) {
          if (props.closed && polygonPoints.length > 2 && isPointInPolygon(dxfCoords, polygonPoints)) {
            distance = buildInteriorFallbackDistance(distance, geometryPickRadius);
          } else {
            distance = null;
          }
        }
      } else if (props.closed && polygonPoints.length > 2 && isPointInPolygon(dxfCoords, polygonPoints)) {
        distance = buildInteriorFallbackDistance(0, geometryPickRadius);
      }
    } else if (
      entity.type === 'CIRCLE'
      && typeof props.centerX === 'number'
      && typeof props.centerY === 'number'
      && typeof props.radius === 'number'
      && props.radius > 0
    ) {
      const center = { x: props.centerX, y: props.centerY };
      const centerDistance = calculateDistance(dxfCoords, center);
      const distanceToBoundary = Math.abs(centerDistance - props.radius);
      if (distanceToBoundary <= geometryPickRadius) {
        distance = distanceToBoundary;
      } else if (centerDistance < props.radius) {
        distance = buildInteriorFallbackDistance(distanceToBoundary, geometryPickRadius);
      } else {
        distance = null;
      }
    } else if (
      entity.type === 'ARC'
      && typeof props.centerX === 'number'
      && typeof props.centerY === 'number'
      && typeof props.radius === 'number'
      && typeof props.startAngle === 'number'
      && typeof props.endAngle === 'number'
      && props.radius > 0
    ) {
      const center = { x: props.centerX, y: props.centerY };
      const pointAngle = getPointAngleDegrees(center, dxfCoords);
      const startPoint = getArcPointAtAngle(center, props.radius, props.startAngle);
      const endPoint = getArcPointAtAngle(center, props.radius, props.endAngle);
      const radialDistance = Math.abs(calculateDistance(dxfCoords, center) - props.radius);
      if (isAngleInsideArc(pointAngle, props.startAngle, props.endAngle)) {
        distance = radialDistance;
      } else {
        distance = Math.min(
          calculateDistance(dxfCoords, startPoint),
          calculateDistance(dxfCoords, endPoint)
        );
      }
      if (distance > geometryPickRadius) {
        distance = null;
      }
    }

    if (distance === null) {
      continue;
    }

    const info = buildSelectedEntityInfo(entity, index);
    if (distance < nearestDistance) {
      nearestInfo = info;
      nearestDistance = distance;
    }
  }

  return nearestInfo;
};

export const buildSelectedTextId = (entity: DXFEntity, position: Point2D): string => {
  const text = String(entity.properties.text || '').trim();
  return [entity.layer || '0', entity.type || 'TEXT', position.x.toFixed(3), position.y.toFixed(3), text].join('|');
};
