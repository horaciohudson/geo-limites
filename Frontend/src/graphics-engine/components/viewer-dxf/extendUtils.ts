import type { DXFData, DXFEntity, DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import type { EditableNodeRole } from '@/graphics-engine/components/viewer-dxf/nodeEditUtils';
import { buildPreviewOverlaySegmentsFromEntity } from '@/graphics-engine/components/viewer-dxf/offsetUtils';
import {
  applyTrimExtendToEntity,
  buildLinearIntersectionCandidates,
  findCircleCandidateIntersections,
  findRayCandidateIntersection,
  getArcClockwiseDelta,
  getArcCounterClockwiseDelta,
  getArcPointAtAngle,
  getOpenPolylineSegmentPoints,
  getPreferredOpenPolylineTrimExtendHandle,
  getPointAngleDegrees,
  isAngleInsideArc,
  TRIM_EXTEND_EPSILON
} from '@/graphics-engine/components/viewer-dxf/trimExtendGeometryUtils';
import { buildPolylineSamplePoints, getBulgeArcDefinition, polylineHasBulgeVertices } from '@/graphics-engine/components/viewer-dxf/dxfGeometryUtils';

const EXTEND_EPSILON = TRIM_EXTEND_EPSILON;
const EXTEND_PREVIEW_COLOR = '#0ea5e9';

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
  label?: string;
  labelColor?: string;
  labelBackgroundColor?: string;
  labelBorderColor?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
};

type ExtendEndpointInfo = {
  role: EditableNodeRole;
  point: Point2D;
  direction: Point2D;
  vertexIndex?: number;
};

type BulgeExtendResult = {
  targetPoint: Point2D;
  distance: number;
  entity: DXFEntity;
};

export type ExtendEntityPreview = {
  entityInfo: ViewerSelectedEntityInfo;
  entity: DXFEntity;
  role: EditableNodeRole;
  vertexIndex?: number;
  segmentIndex?: number;
  sourcePoint: Point2D;
  targetPoint: Point2D;
  distance: number;
  overlaySegments: OverlaySegment[];
  overlayPoints: OverlayPoint[];
};

export type ExtendHoverCandidate = {
  entityInfo: ViewerSelectedEntityInfo;
  role: EditableNodeRole;
  vertexIndex?: number;
  segmentIndex?: number;
  sourcePoint: Point2D;
  direction: Point2D;
  sourceDistance: number;
  overlaySegments: OverlaySegment[];
  overlayPoints: OverlayPoint[];
};

const normalizeVector = (vector: Point2D): Point2D | null => {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= EXTEND_EPSILON) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
};

const clonePoint = (point: Point2D): Point2D => ({
  x: point.x,
  y: point.y
});

const normalizeBulgeValue = (bulge: number): number | undefined => (
  Number.isFinite(bulge) && Math.abs(bulge) > EXTEND_EPSILON ? bulge : undefined
);

const buildExtendedBulgedPolylineEntity = (
  entity: DXFEntity,
  role: EditableNodeRole,
  targetPoint: Point2D
): DXFEntity | null => {
  const props = entity.properties as DXFEntityProperties;
  if (!props.vertices || props.vertices.length < 2 || !polylineHasBulgeVertices(props.vertices)) {
    return null;
  }

  const segmentIndex = role === 'start' ? 0 : props.vertices.length - 2;
  const startVertex = props.vertices[segmentIndex];
  const endVertex = props.vertices[segmentIndex + 1];
  const arc = startVertex && endVertex ? getBulgeArcDefinition(startVertex, endVertex, startVertex.bulge) : null;
  if (!arc || typeof startVertex.bulge !== 'number') {
    return null;
  }

  const targetAngle = getPointAngleDegrees(arc.center, targetPoint);
  const bulgeSign = startVertex.bulge < 0 ? -1 : 1;
  const sweepDegrees = role === 'start'
    ? (bulgeSign > 0
        ? getArcCounterClockwiseDelta(targetAngle, arc.endAngle)
        : getArcClockwiseDelta(targetAngle, arc.endAngle))
    : (bulgeSign > 0
        ? getArcCounterClockwiseDelta(arc.startAngle, targetAngle)
        : getArcClockwiseDelta(arc.startAngle, targetAngle));
  if (!Number.isFinite(sweepDegrees) || sweepDegrees <= EXTEND_EPSILON) {
    return null;
  }

  const nextBulge = normalizeBulgeValue(bulgeSign * Math.tan(((sweepDegrees * Math.PI) / 180) / 4));
  const nextVertices = props.vertices.map((vertex) => ({ ...vertex }));
  if (role === 'start') {
    nextVertices[0] = {
      ...nextVertices[0],
      x: targetPoint.x,
      y: targetPoint.y,
      bulge: nextBulge
    };
  } else {
    nextVertices[nextVertices.length - 2] = {
      ...nextVertices[nextVertices.length - 2],
      bulge: nextBulge
    };
    nextVertices[nextVertices.length - 1] = {
      ...nextVertices[nextVertices.length - 1],
      x: targetPoint.x,
      y: targetPoint.y
    };
  }

  return {
    ...entity,
    properties: {
      ...props,
      x: nextVertices[0]?.x,
      y: nextVertices[0]?.y,
      vertexCount: nextVertices.length,
      vertices: nextVertices
    }
  };
};

const buildBulgedPolylineExtendPreview = (
  sourceEntity: DXFEntity,
  dxfData: DXFData,
  selectedEntity: ViewerSelectedEntityInfo,
  endpoint: {
    role: EditableNodeRole;
    point: Point2D;
    direction: Point2D;
    vertexIndex?: number;
    segmentIndex?: number;
  }
): BulgeExtendResult | null => {
  const props = sourceEntity.properties as DXFEntityProperties;
  if (!props.vertices || !polylineHasBulgeVertices(props.vertices)) {
    return null;
  }

  const segmentIndex = endpoint.role === 'start' ? 0 : props.vertices.length - 2;
  const startVertex = props.vertices[segmentIndex];
  const endVertex = props.vertices[segmentIndex + 1];
  const arc = startVertex && endVertex ? getBulgeArcDefinition(startVertex, endVertex, startVertex.bulge) : null;
  if (!arc || typeof startVertex?.bulge !== 'number') {
    return null;
  }

  const currentBulge = startVertex.bulge;
  const bestCandidate = dxfData.entities
    .flatMap((entity, entityIndex) => (
      entityIndex === selectedEntity.index ? [] : buildLinearIntersectionCandidates(entity)
    ))
    .flatMap((candidate) => findCircleCandidateIntersections(arc.center, arc.radius, candidate))
    .map((point) => {
      const angle = getPointAngleDegrees(arc.center, point);
      const isInsideCurrentArc = currentBulge > 0
        ? isAngleInsideArc(angle, arc.startAngle, arc.endAngle)
        : isAngleInsideArc(angle, arc.endAngle, arc.startAngle);
      const delta = endpoint.role === 'start'
        ? (currentBulge > 0
            ? getArcClockwiseDelta(arc.startAngle, angle)
            : getArcCounterClockwiseDelta(arc.startAngle, angle))
        : (currentBulge > 0
            ? getArcCounterClockwiseDelta(arc.endAngle, angle)
            : getArcClockwiseDelta(arc.endAngle, angle));
      return { point, angle, delta, isInsideCurrentArc };
    })
    .filter(({ delta, isInsideCurrentArc }) => delta > EXTEND_EPSILON && !isInsideCurrentArc)
    .sort((left, right) => left.delta - right.delta)[0];

  if (!bestCandidate) {
    return null;
  }

  const nextEntity = buildExtendedBulgedPolylineEntity(sourceEntity, endpoint.role, bestCandidate.point);
  if (!nextEntity) {
    return null;
  }

  return {
    targetPoint: bestCandidate.point,
    distance: (Math.PI * arc.radius * bestCandidate.delta) / 180,
    entity: nextEntity
  };
};

const buildExtendGripSegments = (point: Point2D, direction: Point2D, color: string): OverlaySegment[] => {
  const normalizedDirection = normalizeVector(direction);
  if (!normalizedDirection) {
    return [];
  }

  const perpendicular = {
    x: -normalizedDirection.y,
    y: normalizedDirection.x
  };
  const axisLength = 3.4;
  const jawDepth = 1.8;
  const jawWidth = 1.9;
  const baseOffset = 0.55;
  const baseCenter = {
    x: point.x - (normalizedDirection.x * baseOffset),
    y: point.y - (normalizedDirection.y * baseOffset)
  };
  const jawCenter = {
    x: point.x + (normalizedDirection.x * jawDepth),
    y: point.y + (normalizedDirection.y * jawDepth)
  };
  const upperBase = {
    x: baseCenter.x + (perpendicular.x * jawWidth),
    y: baseCenter.y + (perpendicular.y * jawWidth)
  };
  const lowerBase = {
    x: baseCenter.x - (perpendicular.x * jawWidth),
    y: baseCenter.y - (perpendicular.y * jawWidth)
  };
  const upperJaw = {
    x: jawCenter.x + (perpendicular.x * jawWidth),
    y: jawCenter.y + (perpendicular.y * jawWidth)
  };
  const lowerJaw = {
    x: jawCenter.x - (perpendicular.x * jawWidth),
    y: jawCenter.y - (perpendicular.y * jawWidth)
  };
  const axisTip = {
    x: point.x + (normalizedDirection.x * axisLength),
    y: point.y + (normalizedDirection.y * axisLength)
  };

  return [
    {
      start: clonePoint(upperBase),
      end: clonePoint(upperJaw),
      color,
      strokeWidth: 1.7
    },
    {
      start: clonePoint(lowerBase),
      end: clonePoint(lowerJaw),
      color,
      strokeWidth: 1.7
    },
    {
      start: clonePoint(upperBase),
      end: clonePoint(lowerBase),
      color,
      strokeWidth: 1.5
    },
    {
      start: clonePoint(point),
      end: clonePoint(axisTip),
      color,
      strokeWidth: 1.85
    }
  ];
};

const isOpenPolylineEntity = (entity: DXFEntity, props: DXFEntityProperties): boolean => (
  (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE')
  && Array.isArray(props.vertices)
  && props.vertices.length >= 2
  && !props.closed
);

export const isExtendSupportedEntity = (entity: DXFEntity | null | undefined): boolean => {
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
      && props.radius > EXTEND_EPSILON;
  }

  return isOpenPolylineEntity(entity, props);
};

const getExtendEndpoints = (entity: DXFEntity): ExtendEndpointInfo[] => {
  const props = entity.properties as DXFEntityProperties;
  if (entity.type === 'LINE') {
    const startPoint = { x: props.x1 as number, y: props.y1 as number };
    const endPoint = { x: props.x2 as number, y: props.y2 as number };
    const startDirection = normalizeVector({
      x: startPoint.x - endPoint.x,
      y: startPoint.y - endPoint.y
    });
    const endDirection = normalizeVector({
      x: endPoint.x - startPoint.x,
      y: endPoint.y - startPoint.y
    });

    return [
      ...(startDirection ? [{
        role: 'start' as const,
        point: startPoint,
        direction: startDirection
      }] : []),
      ...(endDirection ? [{
        role: 'end' as const,
        point: endPoint,
        direction: endDirection
      }] : [])
    ];
  }

  if (
    entity.type === 'ARC'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.radius === 'number'
    && typeof props.startAngle === 'number'
    && typeof props.endAngle === 'number'
    && props.radius > EXTEND_EPSILON
  ) {
    const center = { x: props.centerX, y: props.centerY };
    return [
      {
        role: 'start' as const,
        point: getArcPointAtAngle(center, props.radius, props.startAngle),
        direction: { x: 0, y: 0 }
      },
      {
        role: 'end' as const,
        point: getArcPointAtAngle(center, props.radius, props.endAngle),
        direction: { x: 0, y: 0 }
      }
    ];
  }

  if (!isOpenPolylineEntity(entity, props)) {
    return [];
  }

  const vertices = polylineHasBulgeVertices(props.vertices)
    ? buildPolylineSamplePoints(props.vertices as DXFVertex[], false).map((point) => ({ x: point.x, y: point.y }))
    : props.vertices as DXFVertex[];
  const startVertex = vertices[0];
  const secondVertex = vertices[1];
  const penultimateVertex = vertices[vertices.length - 2];
  const endVertex = vertices[vertices.length - 1];
  const startDirection = normalizeVector({
    x: startVertex.x - secondVertex.x,
    y: startVertex.y - secondVertex.y
  });
  const endDirection = normalizeVector({
    x: endVertex.x - penultimateVertex.x,
    y: endVertex.y - penultimateVertex.y
  });

  return [
    ...(startDirection ? [{
      role: 'start' as const,
      point: { x: startVertex.x, y: startVertex.y },
      direction: startDirection
    }] : []),
    ...(endDirection ? [{
      role: 'end' as const,
      point: { x: endVertex.x, y: endVertex.y },
      direction: endDirection
    }] : [])
  ];
};

export const buildExtendHoverCandidate = (
  sourceEntity: DXFEntity,
  selectedEntity: ViewerSelectedEntityInfo,
  referencePoint: Point2D
): ExtendHoverCandidate | null => {
  if (!isExtendSupportedEntity(sourceEntity)) {
    return null;
  }

  const sourceProps = sourceEntity.properties as DXFEntityProperties;
  const extendVertices = isOpenPolylineEntity(sourceEntity, sourceProps) && sourceProps.vertices
    ? (polylineHasBulgeVertices(sourceProps.vertices)
        ? buildPolylineSamplePoints(sourceProps.vertices, false).map((point) => ({ x: point.x, y: point.y }))
        : sourceProps.vertices)
    : null;
  const polylineHandle = extendVertices
    ? getPreferredOpenPolylineTrimExtendHandle(extendVertices, referencePoint, 'extend')
    : null;

  const endpoint = polylineHandle
    ? {
        role: polylineHandle.side,
        point: polylineHandle.point,
        direction: polylineHandle.direction,
        vertexIndex: polylineHandle.vertexIndex,
        segmentIndex: polylineHandle.segmentIndex
      }
    : getExtendEndpoints(sourceEntity)
        .map((candidate) => ({
          ...candidate,
          referenceDistance: Math.hypot(referencePoint.x - candidate.point.x, referencePoint.y - candidate.point.y)
        }))
        .sort((left, right) => left.referenceDistance - right.referenceDistance)[0];

  if (!endpoint) {
    return null;
  }

  const selectedSegment = polylineHandle && extendVertices
    ? getOpenPolylineSegmentPoints(extendVertices, polylineHandle.segmentIndex)
    : null;

  return {
    entityInfo: selectedEntity,
    role: endpoint.role,
    vertexIndex: endpoint.vertexIndex,
    segmentIndex: polylineHandle?.segmentIndex,
    sourcePoint: clonePoint(endpoint.point),
    direction: clonePoint(endpoint.direction),
    sourceDistance: Math.hypot(referencePoint.x - endpoint.point.x, referencePoint.y - endpoint.point.y),
    overlaySegments: [
      ...(selectedSegment ? [{
        start: clonePoint(selectedSegment.start),
        end: clonePoint(selectedSegment.end),
        color: '#38bdf8',
        dashed: false,
        strokeWidth: 2.2
      }] : []),
      ...buildExtendGripSegments(endpoint.point, endpoint.direction, '#0284c7')
    ],
    overlayPoints: [{
      point: clonePoint(endpoint.point),
      color: '#2563eb',
      radius: 5.8
    }]
  };
};

const buildExtendArcPreview = (
  sourceEntity: DXFEntity,
  dxfData: DXFData,
  selectedEntity: ViewerSelectedEntityInfo,
  referencePoint: Point2D
): ExtendEntityPreview | null => {
  const props = sourceEntity.properties as DXFEntityProperties;
  if (
    typeof props.centerX !== 'number'
    || typeof props.centerY !== 'number'
    || typeof props.radius !== 'number'
    || typeof props.startAngle !== 'number'
    || typeof props.endAngle !== 'number'
    || props.radius <= EXTEND_EPSILON
  ) {
    return null;
  }

  const center = { x: props.centerX, y: props.centerY };
  const radius = props.radius;
  const startAngle = props.startAngle;
  const endAngle = props.endAngle;
  const endpoints = [
    {
      role: 'start' as const,
      point: getArcPointAtAngle(center, radius, startAngle),
      angle: startAngle
    },
    {
      role: 'end' as const,
      point: getArcPointAtAngle(center, radius, endAngle),
      angle: endAngle
    }
  ];
  const endpoint = endpoints
    .map((candidate) => ({
      ...candidate,
      referenceDistance: Math.hypot(referencePoint.x - candidate.point.x, referencePoint.y - candidate.point.y)
    }))
    .sort((left, right) => left.referenceDistance - right.referenceDistance)[0];
  if (!endpoint) {
    return null;
  }

  const bestCandidate = dxfData.entities
    .flatMap((entity, entityIndex) => (
      entityIndex === selectedEntity.index ? [] : buildLinearIntersectionCandidates(entity)
    ))
    .flatMap((candidate) => findCircleCandidateIntersections(center, radius, candidate))
    .map((point) => {
      const angle = getPointAngleDegrees(center, point);
      const delta = endpoint.role === 'end'
        ? getArcCounterClockwiseDelta(endAngle, angle)
        : getArcClockwiseDelta(startAngle, angle);
      return { point, angle, delta };
    })
    .filter(({ angle, delta }) => (
      delta > EXTEND_EPSILON
      && !isAngleInsideArc(angle, startAngle, endAngle)
    ))
    .sort((left, right) => left.delta - right.delta)[0];

  if (!bestCandidate) {
    return null;
  }

  const previewEntity = applyTrimExtendToEntity(sourceEntity, endpoint.role, bestCandidate.point);
  return {
    entityInfo: selectedEntity,
    entity: previewEntity,
    role: endpoint.role,
    sourcePoint: endpoint.point,
    targetPoint: bestCandidate.point,
    distance: (Math.PI * radius * bestCandidate.delta) / 180,
    overlaySegments: [
      ...buildPreviewOverlaySegmentsFromEntity(previewEntity, EXTEND_PREVIEW_COLOR),
      {
        start: clonePoint(endpoint.point),
        end: clonePoint(bestCandidate.point),
        color: EXTEND_PREVIEW_COLOR,
        dashed: true,
        strokeWidth: 1.4
      }
    ],
    overlayPoints: [
      {
        point: clonePoint(endpoint.point),
        color: '#2563eb',
        radius: 4.8
      },
      {
        point: clonePoint(bestCandidate.point),
        color: EXTEND_PREVIEW_COLOR,
        radius: 5.2
      }
    ]
  };
};

export const buildExtendEntityPreview = (
  dxfData: DXFData | null,
  selectedEntity: ViewerSelectedEntityInfo | null,
  referencePoint: Point2D | null
): ExtendEntityPreview | null => {
  if (!dxfData || !selectedEntity || !referencePoint) {
    return null;
  }

  const sourceEntity = dxfData.entities[selectedEntity.index];
  if (!isExtendSupportedEntity(sourceEntity)) {
    return null;
  }

  if (sourceEntity.type === 'ARC') {
    return buildExtendArcPreview(sourceEntity, dxfData, selectedEntity, referencePoint);
  }

  const sourceProps = sourceEntity.properties as DXFEntityProperties;
  const extendVertices = isOpenPolylineEntity(sourceEntity, sourceProps) && sourceProps.vertices
    ? (polylineHasBulgeVertices(sourceProps.vertices)
        ? buildPolylineSamplePoints(sourceProps.vertices, false).map((point) => ({ x: point.x, y: point.y }))
        : sourceProps.vertices)
    : null;
  const polylineHandle = extendVertices
    ? getPreferredOpenPolylineTrimExtendHandle(extendVertices, referencePoint, 'extend')
    : null;
  const endpoints = getExtendEndpoints(sourceEntity);
  const endpoint = polylineHandle
    ? {
        role: polylineHandle.side,
        point: polylineHandle.point,
        direction: polylineHandle.direction,
        vertexIndex: polylineHandle.vertexIndex,
        segmentIndex: polylineHandle.segmentIndex
      }
    : endpoints
        .map((candidate) => ({
          ...candidate,
          referenceDistance: Math.hypot(referencePoint.x - candidate.point.x, referencePoint.y - candidate.point.y)
        }))
        .sort((left, right) => left.referenceDistance - right.referenceDistance)[0];
  if (!endpoint) {
    return null;
  }

  const bestIntersection = dxfData.entities
    .flatMap((entity, entityIndex) => (
      entityIndex === selectedEntity.index ? [] : buildLinearIntersectionCandidates(entity)
    ))
    .map((candidate) => findRayCandidateIntersection(endpoint.point, endpoint.direction, candidate))
    .filter((candidate): candidate is { point: Point2D; distance: number } => candidate !== null)
    .sort((left, right) => left.distance - right.distance)[0];

  const bulgedExtendResult = sourceEntity.type !== 'LINE' && sourceEntity.type !== 'ARC'
    ? buildBulgedPolylineExtendPreview(sourceEntity, dxfData, selectedEntity, endpoint)
    : null;

  const projectedDistance = (
    ((referencePoint.x - endpoint.point.x) * endpoint.direction.x)
    + ((referencePoint.y - endpoint.point.y) * endpoint.direction.y)
  );
  const fallbackTargetPoint = projectedDistance > EXTEND_EPSILON
    ? {
        x: endpoint.point.x + (endpoint.direction.x * projectedDistance),
        y: endpoint.point.y + (endpoint.direction.y * projectedDistance)
      }
    : null;
  const targetPoint = bulgedExtendResult?.targetPoint || bestIntersection?.point || fallbackTargetPoint;
  const targetDistance = bulgedExtendResult?.distance || bestIntersection?.distance || projectedDistance;

  if (!targetPoint || !Number.isFinite(targetDistance) || targetDistance <= EXTEND_EPSILON) {
    return null;
  }
  const previewEntity = bulgedExtendResult?.entity || applyTrimExtendToEntity(sourceEntity, endpoint.role, targetPoint, endpoint.vertexIndex);
  if (Math.hypot(targetPoint.x - endpoint.point.x, targetPoint.y - endpoint.point.y) <= EXTEND_EPSILON) {
    return null;
  }

  const selectedSegment = polylineHandle && extendVertices
    ? getOpenPolylineSegmentPoints(extendVertices, polylineHandle.segmentIndex)
    : null;
  const directionGuideLength = polylineHandle
    ? Math.max(Math.min(polylineHandle.maxDistance * 0.28, 12), 4)
    : 0;

  return {
    entityInfo: selectedEntity,
    entity: previewEntity,
    role: endpoint.role,
    vertexIndex: endpoint.vertexIndex,
    segmentIndex: polylineHandle?.segmentIndex,
    sourcePoint: clonePoint(endpoint.point),
    targetPoint: clonePoint(targetPoint),
    distance: targetDistance,
    overlaySegments: [
      ...(selectedSegment ? [{
        start: clonePoint(selectedSegment.start),
        end: clonePoint(selectedSegment.end),
        color: '#38bdf8',
        dashed: false,
        strokeWidth: 2.2
      }] : []),
      ...buildExtendGripSegments(endpoint.point, endpoint.direction, '#0284c7'),
      ...(polylineHandle ? [{
        start: clonePoint(endpoint.point),
        end: {
          x: endpoint.point.x + (endpoint.direction.x * directionGuideLength),
          y: endpoint.point.y + (endpoint.direction.y * directionGuideLength)
        },
        color: '#0284c7',
        dashed: true,
        strokeWidth: 1.3
      }] : []),
      ...buildPreviewOverlaySegmentsFromEntity(previewEntity, EXTEND_PREVIEW_COLOR),
      {
        start: clonePoint(endpoint.point),
        end: clonePoint(targetPoint),
        color: EXTEND_PREVIEW_COLOR,
        dashed: true,
        strokeWidth: 1.4
      }
    ],
    overlayPoints: [
      {
        point: clonePoint(endpoint.point),
        color: '#2563eb',
        radius: 5.8
      },
      {
        point: clonePoint(targetPoint),
        color: EXTEND_PREVIEW_COLOR,
        radius: 4.2
      }
    ]
  };
};


