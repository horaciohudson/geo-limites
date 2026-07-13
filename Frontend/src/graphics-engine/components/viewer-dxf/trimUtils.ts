import type { DXFData, DXFEntity, DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import { buildPreviewOverlaySegmentsFromEntity } from '@/graphics-engine/components/viewer-dxf/offsetUtils';
import {
  getArcPointAtAngle,
  getPointAngleDegrees,
  isAngleInsideArc,
  normalizeAngleDegrees
} from '@/graphics-engine/components/viewer-dxf/trimExtendGeometryUtils';
import {
  getBulgeArcDefinition,
  splitBulgeSegmentAtPoint
} from '@/graphics-engine/components/viewer-dxf/dxfGeometryUtils';

const TRIM_EPSILON = 0.001;
const TRIM_PREVIEW_COLOR = '#ef4444';

type OverlaySegment = {
  start: Point2D;
  end: Point2D;
  color?: string;
  dashed?: boolean;
  strokeWidth?: number;
};

type OverlayPoint = {
  point: Point2D;
  color?: string;
  radius?: number;
};

type PolylineTrimSegment = {
  segmentIndex: number;
  start: Point2D;
  end: Point2D;
  bulge?: number;
};

export type TrimEntityPreview = {
  entityInfo: ViewerSelectedEntityInfo;
  segmentIndex: number;
  splitPoint: Point2D;
  distance: number;
  replacementEntities: DXFEntity[];
  overlaySegments: OverlaySegment[];
  overlayPoints: OverlayPoint[];
};

const clonePoint = (point: Point2D): Point2D => ({
  x: point.x,
  y: point.y
});

const cloneVertex = (vertex: DXFVertex): DXFVertex => ({
  x: vertex.x,
  y: vertex.y,
  ...(typeof vertex.bulge === 'number' ? { bulge: vertex.bulge } : {})
});

const cloneSamplePointToVertex = (point: Point2D): DXFVertex => ({
  x: point.x,
  y: point.y
});

const isPolylineEntity = (entity: DXFEntity, props: DXFEntityProperties): boolean => (
  (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE')
  && Array.isArray(props.vertices)
  && props.vertices.length >= 2
);

const isOpenPolylineEntity = (entity: DXFEntity, props: DXFEntityProperties): boolean => (
  isPolylineEntity(entity, props)
  && !props.closed
);

const isClosedPolylineEntity = (entity: DXFEntity, props: DXFEntityProperties): boolean => (
  isPolylineEntity(entity, props)
  && !!props.closed
);

const sanitizeSplitProperties = (props: DXFEntityProperties): DXFEntityProperties => {
  const { editorEntityId: _editorEntityId, ...remainingProps } = props;
  return remainingProps;
};

const isSamePoint = (left: Point2D, right: Point2D): boolean => (
  Math.hypot(left.x - right.x, left.y - right.y) <= TRIM_EPSILON
);

const projectPointOnSegment = (point: Point2D, start: Point2D, end: Point2D): { point: Point2D; distance: number } => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const segmentLengthSquared = (deltaX * deltaX) + (deltaY * deltaY);
  if (segmentLengthSquared <= TRIM_EPSILON) {
    return {
      point: clonePoint(start),
      distance: Math.hypot(point.x - start.x, point.y - start.y)
    };
  }

  const projection = (((point.x - start.x) * deltaX) + ((point.y - start.y) * deltaY)) / segmentLengthSquared;
  const clampedProjection = Math.max(0, Math.min(1, projection));
  const projectedPoint = {
    x: start.x + (deltaX * clampedProjection),
    y: start.y + (deltaY * clampedProjection)
  };

  return {
    point: projectedPoint,
    distance: Math.hypot(point.x - projectedPoint.x, point.y - projectedPoint.y)
  };
};

const buildTrimFocusSegments = (point: Point2D): OverlaySegment[] => {
  const outerRadius = 5.2;
  const innerGap = 2.1;
  return [
    {
      start: { x: point.x - outerRadius, y: point.y },
      end: { x: point.x - innerGap, y: point.y },
      color: '#be123c',
      strokeWidth: 1.2
    },
    {
      start: { x: point.x + innerGap, y: point.y },
      end: { x: point.x + outerRadius, y: point.y },
      color: '#be123c',
      strokeWidth: 1.2
    },
    {
      start: { x: point.x, y: point.y - outerRadius },
      end: { x: point.x, y: point.y - innerGap },
      color: '#be123c',
      strokeWidth: 1.2
    },
    {
      start: { x: point.x, y: point.y + innerGap },
      end: { x: point.x, y: point.y + outerRadius },
      color: '#be123c',
      strokeWidth: 1.2
    }
  ];
};

export const isTrimSupportedEntity = (entity: DXFEntity | null | undefined): boolean => {
  if (!entity) {
    return false;
  }

  const props = entity.properties as DXFEntityProperties;
  if (entity.type === 'LINE') {
    return typeof props.x1 === 'number'
      && typeof props.y1 === 'number'
      && typeof props.x2 === 'number'
      && typeof props.y2 === 'number';
  }

  if (entity.type === 'ARC') {
    return typeof props.centerX === 'number'
      && typeof props.centerY === 'number'
      && typeof props.radius === 'number'
      && typeof props.startAngle === 'number'
      && typeof props.endAngle === 'number'
      && props.radius > TRIM_EPSILON;
  }

  if (entity.type === 'CIRCLE') {
    return typeof props.centerX === 'number'
      && typeof props.centerY === 'number'
      && typeof props.radius === 'number'
      && props.radius > TRIM_EPSILON;
  }

  return isPolylineEntity(entity, props);
};

const buildLineSplitEntities = (entity: DXFEntity, splitPoint: Point2D): DXFEntity[] | null => {
  const props = entity.properties as DXFEntityProperties;
  if (
    typeof props.x1 !== 'number'
    || typeof props.y1 !== 'number'
    || typeof props.x2 !== 'number'
    || typeof props.y2 !== 'number'
  ) {
    return null;
  }

  const start = { x: props.x1, y: props.y1 };
  const end = { x: props.x2, y: props.y2 };
  if (isSamePoint(splitPoint, start) || isSamePoint(splitPoint, end)) {
    return null;
  }

  const baseProps = sanitizeSplitProperties(props);
  return [
    {
      ...entity,
      properties: {
        ...baseProps,
        x: start.x,
        y: start.y,
        x1: start.x,
        y1: start.y,
        x2: splitPoint.x,
        y2: splitPoint.y
      }
    },
    {
      ...entity,
      properties: {
        ...baseProps,
        x: splitPoint.x,
        y: splitPoint.y,
        x1: splitPoint.x,
        y1: splitPoint.y,
        x2: end.x,
        y2: end.y
      }
    }
  ];
};

const buildOpenPolylineSplitEntities = (
  entity: DXFEntity,
  splitPoint: Point2D,
  segmentIndex: number
): DXFEntity[] | null => {
  const props = entity.properties as DXFEntityProperties;
  if (!isOpenPolylineEntity(entity, props) || !props.vertices) {
    return null;
  }

  const startVertex = props.vertices[segmentIndex];
  const endVertex = props.vertices[segmentIndex + 1];
  if (!startVertex || !endVertex) {
    return null;
  }

  const firstVertices = props.vertices.slice(0, segmentIndex + 1).map(cloneVertex);
  if (!isSamePoint(firstVertices[firstVertices.length - 1], splitPoint)) {
    firstVertices.push(clonePoint(splitPoint));
  }

  const secondVertices: DXFVertex[] = [];
  if (!isSamePoint(splitPoint, endVertex)) {
    secondVertices.push(clonePoint(splitPoint));
  }
  secondVertices.push(...props.vertices.slice(segmentIndex + 1).map(cloneVertex));

  if (firstVertices.length < 2 || secondVertices.length < 2) {
    return null;
  }

  const baseProps = sanitizeSplitProperties(props);
  return [
    {
      ...entity,
      properties: {
        ...baseProps,
        closed: false,
        x: firstVertices[0]?.x,
        y: firstVertices[0]?.y,
        vertexCount: firstVertices.length,
        vertices: firstVertices
      }
    },
    {
      ...entity,
      properties: {
        ...baseProps,
        closed: false,
        x: secondVertices[0]?.x,
        y: secondVertices[0]?.y,
        vertexCount: secondVertices.length,
        vertices: secondVertices
      }
    }
  ];
};

const buildClosedPolylineCutEntities = (
  entity: DXFEntity,
  splitPoint: Point2D,
  segmentIndex: number
): DXFEntity[] | null => {
  const props = entity.properties as DXFEntityProperties;
  if (!isClosedPolylineEntity(entity, props) || !props.vertices) {
    return null;
  }

  const vertexCount = props.vertices.length;
  const startVertex = props.vertices[segmentIndex];
  const endVertex = props.vertices[(segmentIndex + 1) % vertexCount];
  if (!startVertex || !endVertex) {
    return null;
  }

  const nextVertices: DXFVertex[] = [clonePoint(splitPoint)];
  for (let step = 1; step < vertexCount; step += 1) {
    const nextVertex = cloneVertex(props.vertices[(segmentIndex + step) % vertexCount]);
    if (!isSamePoint(nextVertices[nextVertices.length - 1], nextVertex)) {
      nextVertices.push(nextVertex);
    }
  }

  if (!isSamePoint(nextVertices[nextVertices.length - 1], splitPoint)) {
    nextVertices.push(clonePoint(splitPoint));
  }

  if (nextVertices.length < 2) {
    return null;
  }

  const baseProps = sanitizeSplitProperties(props);
  return [{
    ...entity,
    properties: {
      ...baseProps,
      closed: false,
      x: nextVertices[0]?.x,
      y: nextVertices[0]?.y,
      vertexCount: nextVertices.length,
      vertices: nextVertices
    }
  }];
};

const buildPolylineEntityFromVertices = (
  entity: DXFEntity,
  baseProps: DXFEntityProperties,
  vertices: DXFVertex[],
  closed: boolean
): DXFEntity => ({
  ...entity,
  properties: {
    ...baseProps,
    closed,
    x: vertices[0]?.x,
    y: vertices[0]?.y,
    vertexCount: vertices.length,
    vertices
  }
});

const buildOpenPolylineSplitEntitiesPreservingBulge = (
  entity: DXFEntity,
  splitPoint: Point2D,
  segmentIndex: number
): DXFEntity[] | null => {
  const props = entity.properties as DXFEntityProperties;
  if (!isOpenPolylineEntity(entity, props) || !props.vertices) {
    return null;
  }

  const startVertex = props.vertices[segmentIndex];
  const endVertex = props.vertices[segmentIndex + 1];
  const splitBulge = startVertex && endVertex
    ? splitBulgeSegmentAtPoint(startVertex, endVertex, startVertex.bulge, splitPoint)
    : null;
  if (!splitBulge) {
    return null;
  }

  const firstVertices = props.vertices.slice(0, segmentIndex + 1).map(cloneVertex);
  firstVertices[firstVertices.length - 1] = {
    ...firstVertices[firstVertices.length - 1],
    bulge: splitBulge.firstBulge
  };
  firstVertices.push(cloneSamplePointToVertex(splitPoint));

  const secondVertices: DXFVertex[] = [
    {
      x: splitPoint.x,
      y: splitPoint.y,
      ...(typeof splitBulge.secondBulge === 'number' ? { bulge: splitBulge.secondBulge } : {})
    },
    ...props.vertices.slice(segmentIndex + 1).map(cloneVertex)
  ];

  const {
    code_10: _code10,
    code_20: _code20,
    code_42: _code42,
    ...baseProps
  } = sanitizeSplitProperties(props);

  return [
    buildPolylineEntityFromVertices(entity, baseProps, firstVertices, false),
    buildPolylineEntityFromVertices(entity, baseProps, secondVertices, false)
  ];
};

const buildClosedPolylineCutEntitiesPreservingBulge = (
  entity: DXFEntity,
  splitPoint: Point2D,
  segmentIndex: number
): DXFEntity[] | null => {
  const props = entity.properties as DXFEntityProperties;
  if (!isClosedPolylineEntity(entity, props) || !props.vertices) {
    return null;
  }

  const vertexCount = props.vertices.length;
  const startVertex = props.vertices[segmentIndex];
  const endVertex = props.vertices[(segmentIndex + 1) % vertexCount];
  const splitBulge = startVertex && endVertex
    ? splitBulgeSegmentAtPoint(startVertex, endVertex, startVertex.bulge, splitPoint)
    : null;
  if (!splitBulge) {
    return null;
  }

  const nextVertices: DXFVertex[] = [{
    x: splitPoint.x,
    y: splitPoint.y,
    ...(typeof splitBulge.secondBulge === 'number' ? { bulge: splitBulge.secondBulge } : {})
  }];
  for (let step = 1; step < vertexCount; step += 1) {
    nextVertices.push(cloneVertex(props.vertices[(segmentIndex + step) % vertexCount]));
  }
  nextVertices[nextVertices.length - 1] = {
    ...nextVertices[nextVertices.length - 1],
    bulge: splitBulge.firstBulge
  };
  nextVertices.push(cloneSamplePointToVertex(splitPoint));

  const {
    code_10: _code10,
    code_20: _code20,
    code_42: _code42,
    ...baseProps
  } = sanitizeSplitProperties(props);

  return [buildPolylineEntityFromVertices(entity, baseProps, nextVertices, false)];
};

const projectPointOnArc = (
  point: Point2D,
  center: Point2D,
  radius: number,
  startAngle: number,
  endAngle: number
): { point: Point2D; angle: number; distance: number } => {
  const candidateAngle = getPointAngleDegrees(center, point);
  if (isAngleInsideArc(candidateAngle, startAngle, endAngle)) {
    const projectedPoint = getArcPointAtAngle(center, radius, candidateAngle);
    return {
      point: projectedPoint,
      angle: normalizeAngleDegrees(candidateAngle),
      distance: Math.hypot(point.x - projectedPoint.x, point.y - projectedPoint.y)
    };
  }

  const startPoint = getArcPointAtAngle(center, radius, startAngle);
  const endPoint = getArcPointAtAngle(center, radius, endAngle);
  const startDistance = Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
  const endDistance = Math.hypot(point.x - endPoint.x, point.y - endPoint.y);
  return startDistance <= endDistance
    ? {
        point: startPoint,
        angle: normalizeAngleDegrees(startAngle),
        distance: startDistance
      }
    : {
        point: endPoint,
        angle: normalizeAngleDegrees(endAngle),
        distance: endDistance
      };
};

const buildArcSplitEntities = (entity: DXFEntity, splitAngle: number): DXFEntity[] | null => {
  const props = entity.properties as DXFEntityProperties;
  if (
    entity.type !== 'ARC'
    || typeof props.centerX !== 'number'
    || typeof props.centerY !== 'number'
    || typeof props.radius !== 'number'
    || typeof props.startAngle !== 'number'
    || typeof props.endAngle !== 'number'
    || props.radius <= TRIM_EPSILON
  ) {
    return null;
  }

  const normalizedSplitAngle = normalizeAngleDegrees(splitAngle);
  const normalizedStartAngle = normalizeAngleDegrees(props.startAngle);
  const normalizedEndAngle = normalizeAngleDegrees(props.endAngle);
  if (
    Math.abs(normalizedSplitAngle - normalizedStartAngle) <= TRIM_EPSILON
    || Math.abs(normalizedSplitAngle - normalizedEndAngle) <= TRIM_EPSILON
  ) {
    return null;
  }

  const center = { x: props.centerX, y: props.centerY };
  const startPoint = getArcPointAtAngle(center, props.radius, normalizedStartAngle);
  const splitPoint = getArcPointAtAngle(center, props.radius, normalizedSplitAngle);
  const baseProps = sanitizeSplitProperties(props);

  return [
    {
      ...entity,
      properties: {
        ...baseProps,
        x: startPoint.x,
        y: startPoint.y,
        startAngle: normalizedStartAngle,
        endAngle: normalizedSplitAngle
      }
    },
    {
      ...entity,
      properties: {
        ...baseProps,
        x: splitPoint.x,
        y: splitPoint.y,
        startAngle: normalizedSplitAngle,
        endAngle: normalizedEndAngle
      }
    }
  ];
};

const projectPointOnCircle = (
  point: Point2D,
  center: Point2D,
  radius: number
): { point: Point2D; angle: number; distance: number } => {
  const candidateAngle = getPointAngleDegrees(center, point);
  const projectedPoint = getArcPointAtAngle(center, radius, candidateAngle);
  return {
    point: projectedPoint,
    angle: normalizeAngleDegrees(candidateAngle),
    distance: Math.hypot(point.x - projectedPoint.x, point.y - projectedPoint.y)
  };
};

const buildCircleCutEntities = (entity: DXFEntity, splitAngle: number): DXFEntity[] | null => {
  const props = entity.properties as DXFEntityProperties;
  if (
    entity.type !== 'CIRCLE'
    || typeof props.centerX !== 'number'
    || typeof props.centerY !== 'number'
    || typeof props.radius !== 'number'
    || props.radius <= TRIM_EPSILON
  ) {
    return null;
  }

  const normalizedSplitAngle = normalizeAngleDegrees(splitAngle);
  const cutGapAngle = Math.max(0.6, Math.min(2.4, 28 / Math.max(props.radius, 1)));
  const startAngle = normalizeAngleDegrees(normalizedSplitAngle + (cutGapAngle / 2));
  const endAngle = normalizeAngleDegrees(normalizedSplitAngle - (cutGapAngle / 2));
  const center = { x: props.centerX, y: props.centerY };
  const startPoint = getArcPointAtAngle(center, props.radius, startAngle);
  const baseProps = sanitizeSplitProperties(props);

  return [{
    ...entity,
    type: 'ARC',
    properties: {
      ...baseProps,
      x: startPoint.x,
      y: startPoint.y,
      startAngle,
      endAngle
    }
  }];
};

export const buildTrimEntityPreview = (
  dxfData: DXFData | null,
  sourceEntityInfo: ViewerSelectedEntityInfo | null,
  referencePoint: Point2D | null
): TrimEntityPreview | null => {
  if (!dxfData || !sourceEntityInfo || !referencePoint) {
    return null;
  }

  const sourceEntity = dxfData.entities[sourceEntityInfo.index];
  if (!isTrimSupportedEntity(sourceEntity)) {
    return null;
  }

  const props = sourceEntity.properties as DXFEntityProperties;
  const segments = sourceEntity.type === 'LINE'
    ? [{
        segmentIndex: 0,
        start: { x: props.x1 as number, y: props.y1 as number },
        end: { x: props.x2 as number, y: props.y2 as number }
      }]
    : sourceEntity.type === 'ARC' || sourceEntity.type === 'CIRCLE'
      ? []
    : props.closed
      ? (props.vertices as DXFVertex[]).map((vertex, index, vertices): PolylineTrimSegment => ({
          segmentIndex: index,
          start: clonePoint(vertex),
          end: clonePoint(vertices[(index + 1) % vertices.length]),
          bulge: vertex.bulge
        }))
      : (props.vertices as DXFVertex[]).slice(1).map((vertex, index): PolylineTrimSegment => ({
          segmentIndex: index,
          start: clonePoint((props.vertices as DXFVertex[])[index]),
          end: clonePoint(vertex),
          bulge: (props.vertices as DXFVertex[])[index].bulge
        }));

  const bestSegment = sourceEntity.type === 'ARC' || sourceEntity.type === 'CIRCLE'
    ? null
    : segments
      .map((segment) => {
        const arcDefinition = typeof segment.bulge === 'number'
          ? getBulgeArcDefinition(segment.start, segment.end, segment.bulge)
          : null;
        const projection = arcDefinition
          ? projectPointOnArc(referencePoint, arcDefinition.center, arcDefinition.radius, arcDefinition.startAngle, arcDefinition.endAngle)
          : projectPointOnSegment(referencePoint, segment.start, segment.end);
        return {
          ...segment,
          splitPoint: projection.point,
          distance: projection.distance,
          bulgeArcDefinition: arcDefinition
        };
      })
      .sort((left, right) => left.distance - right.distance)[0];

  const arcProjection = sourceEntity.type === 'ARC'
    ? projectPointOnArc(
        referencePoint,
        { x: props.centerX as number, y: props.centerY as number },
        props.radius as number,
        props.startAngle as number,
        props.endAngle as number
      )
    : null;
  const circleProjection = sourceEntity.type === 'CIRCLE'
    ? projectPointOnCircle(
        referencePoint,
        { x: props.centerX as number, y: props.centerY as number },
        props.radius as number
      )
    : null;

  if (!bestSegment && !arcProjection && !circleProjection) {
    return null;
  }

  const replacementEntities = sourceEntity.type === 'LINE'
    ? buildLineSplitEntities(sourceEntity, bestSegment!.splitPoint)
    : sourceEntity.type === 'ARC'
      ? buildArcSplitEntities(sourceEntity, arcProjection!.angle)
      : sourceEntity.type === 'CIRCLE'
        ? buildCircleCutEntities(sourceEntity, circleProjection!.angle)
      : bestSegment?.bulgeArcDefinition
        ? (props.closed
            ? buildClosedPolylineCutEntitiesPreservingBulge(sourceEntity, bestSegment!.splitPoint, bestSegment!.segmentIndex)
            : buildOpenPolylineSplitEntitiesPreservingBulge(sourceEntity, bestSegment!.splitPoint, bestSegment!.segmentIndex))
      : props.closed
        ? buildClosedPolylineCutEntities(sourceEntity, bestSegment!.splitPoint, bestSegment!.segmentIndex)
        : buildOpenPolylineSplitEntities(sourceEntity, bestSegment!.splitPoint, bestSegment!.segmentIndex);

  if (!replacementEntities) {
    return null;
  }

  const splitPoint = sourceEntity.type === 'ARC'
    ? arcProjection!.point
    : sourceEntity.type === 'CIRCLE'
      ? circleProjection!.point
    : bestSegment!.splitPoint;
  const distance = sourceEntity.type === 'ARC'
    ? arcProjection!.distance
    : sourceEntity.type === 'CIRCLE'
      ? circleProjection!.distance
    : bestSegment!.distance;
  const segmentIndex = sourceEntity.type === 'ARC' || sourceEntity.type === 'CIRCLE'
    ? 0
    : bestSegment!.segmentIndex;
  const sourceHighlightSegments = sourceEntity.type === 'ARC' || sourceEntity.type === 'CIRCLE'
    ? buildPreviewOverlaySegmentsFromEntity({
        ...sourceEntity,
        properties: {
          ...props,
          startAngle: sourceEntity.type === 'ARC' ? props.startAngle : 0,
          endAngle: sourceEntity.type === 'ARC' ? props.endAngle : 360
        }
      }, '#fb7185')
    : bestSegment?.bulgeArcDefinition
      ? buildPreviewOverlaySegmentsFromEntity({
          ...sourceEntity,
          type: 'ARC',
          properties: {
            layer: sourceEntity.layer,
            centerX: bestSegment.bulgeArcDefinition.center.x,
            centerY: bestSegment.bulgeArcDefinition.center.y,
            x: bestSegment.bulgeArcDefinition.center.x,
            y: bestSegment.bulgeArcDefinition.center.y,
            radius: bestSegment.bulgeArcDefinition.radius,
            startAngle: bestSegment.bulgeArcDefinition.startAngle,
            endAngle: bestSegment.bulgeArcDefinition.endAngle
          }
        }, '#fb7185')
      : [{
          start: clonePoint(bestSegment!.start),
          end: clonePoint(bestSegment!.end),
          color: '#fb7185',
          dashed: false,
          strokeWidth: 2.4
        }];

  return {
    entityInfo: sourceEntityInfo,
    segmentIndex,
    splitPoint: clonePoint(splitPoint),
    distance,
    replacementEntities,
    overlaySegments: [
      ...sourceHighlightSegments,
      ...buildTrimFocusSegments(splitPoint),
      ...replacementEntities.flatMap((entity) => buildPreviewOverlaySegmentsFromEntity(entity, TRIM_PREVIEW_COLOR))
    ],
    overlayPoints: [
      {
        point: clonePoint(splitPoint),
        color: 'rgba(239, 68, 68, 0.12)',
        radius: 12
      },
      {
        point: clonePoint(splitPoint),
        color: 'rgba(239, 68, 68, 0.24)',
        radius: 7.2
      },
      {
        point: clonePoint(splitPoint),
        color: TRIM_PREVIEW_COLOR,
        radius: 3.2
      }
    ]
  };
};
