import type { DXFEntity, DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';
import { pointToSegmentDistance } from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import { buildPolylineSamplePoints, polylineHasBulgeVertices } from '@/graphics-engine/components/viewer-dxf/dxfGeometryUtils';

const OFFSET_PREVIEW_COLOR = '#22c55e';
const OFFSET_EPSILON = 0.001;

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

export type OffsetEntityPreview = {
  distance: number;
  entities: DXFEntity[];
  overlaySegments: OverlaySegment[];
  overlayPoints: OverlayPoint[];
};

type SegmentProjection = {
  distance: number;
  signedDistance: number;
  projectedPoint: Point2D;
};

type PolylinePoint = {
  x: number;
  y: number;
};

const addVector = (point: Point2D, vector: Point2D, scale: number): Point2D => ({
  x: point.x + vector.x * scale,
  y: point.y + vector.y * scale
});

const buildSegmentVector = (start: Point2D, end: Point2D) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length <= OFFSET_EPSILON) {
    return null;
  }

  return {
    dx,
    dy,
    length,
    tangent: { x: dx / length, y: dy / length },
    normal: { x: -dy / length, y: dx / length }
  };
};

const projectPointOntoSegment = (point: Point2D, start: Point2D, end: Point2D): SegmentProjection | null => {
  const vector = buildSegmentVector(start, end);
  if (!vector) {
    return null;
  }

  const segmentLengthSquared = vector.length * vector.length;
  const t = Math.max(0, Math.min(1, (((point.x - start.x) * vector.dx) + ((point.y - start.y) * vector.dy)) / segmentLengthSquared));
  const projection = {
    x: start.x + vector.dx * t,
    y: start.y + vector.dy * t
  };
  return {
    distance: pointToSegmentDistance(point, start, end),
    signedDistance: ((point.x - projection.x) * vector.normal.x) + ((point.y - projection.y) * vector.normal.y),
    projectedPoint: projection
  };
};

const getNearestPolylineProjection = (
  point: Point2D,
  vertices: PolylinePoint[],
  closed: boolean
): SegmentProjection | null => {
  const edges = closed
    ? vertices.map((vertex, index) => ({
        start: vertex,
        end: vertices[(index + 1) % vertices.length]
      }))
    : vertices.slice(1).map((vertex, index) => ({
        start: vertices[index],
        end: vertex
      }));

  let bestProjection: SegmentProjection | null = null;
  edges.forEach((edge) => {
    const projection = projectPointOntoSegment(point, edge.start, edge.end);
    if (!projection || (bestProjection && projection.distance >= bestProjection.distance)) {
      return;
    }
    bestProjection = projection;
  });

  return bestProjection;
};

const toOffsetVertices = (points: PolylinePoint[]): DXFVertex[] => {
  const nextVertices: DXFVertex[] = [];
  points.forEach((point) => {
    const previousVertex = nextVertices[nextVertices.length - 1];
    if (
      previousVertex
      && Math.hypot(previousVertex.x - point.x, previousVertex.y - point.y) <= OFFSET_EPSILON
    ) {
      return;
    }
    nextVertices.push({ x: point.x, y: point.y });
  });
  return nextVertices;
};

const intersectLines = (a1: Point2D, a2: Point2D, b1: Point2D, b2: Point2D): Point2D | null => {
  const denominator = ((a1.x - a2.x) * (b1.y - b2.y)) - ((a1.y - a2.y) * (b1.x - b2.x));
  if (Math.abs(denominator) <= OFFSET_EPSILON) {
    return null;
  }

  const determinantA = (a1.x * a2.y) - (a1.y * a2.x);
  const determinantB = (b1.x * b2.y) - (b1.y * b2.x);

  return {
    x: ((determinantA * (b1.x - b2.x)) - ((a1.x - a2.x) * determinantB)) / denominator,
    y: ((determinantA * (b1.y - b2.y)) - ((a1.y - a2.y) * determinantB)) / denominator
  };
};

const buildPolylineOffsetVertices = (vertices: DXFVertex[], distance: number, closed: boolean): DXFVertex[] | null => {
  if (vertices.length < 2 || Math.abs(distance) <= OFFSET_EPSILON) {
    return null;
  }

  const sourceSegments = closed
    ? vertices.map((vertex, index) => ({
        start: vertex,
        end: vertices[(index + 1) % vertices.length]
      }))
    : vertices.slice(1).map((vertex, index) => ({
        start: vertices[index],
        end: vertex
      }));

  if (sourceSegments.length === 0) {
    return null;
  }

  const offsetSegments = sourceSegments.map((segment) => {
    const vector = buildSegmentVector(segment.start, segment.end);
    if (!vector) {
      return null;
    }

    return {
      start: addVector(segment.start, vector.normal, distance),
      end: addVector(segment.end, vector.normal, distance),
      normal: vector.normal
    };
  });

  if (offsetSegments.some((segment) => segment === null)) {
    return null;
  }

  const safeOffsetSegments = offsetSegments.filter((segment): segment is NonNullable<typeof segment> => segment !== null);
  const nextVertices: DXFVertex[] = [];

  if (closed) {
    for (let index = 0; index < vertices.length; index += 1) {
      const previousSegment = safeOffsetSegments[(index - 1 + safeOffsetSegments.length) % safeOffsetSegments.length];
      const currentSegment = safeOffsetSegments[index];
      const intersection = intersectLines(previousSegment.start, previousSegment.end, currentSegment.start, currentSegment.end);
      nextVertices.push(intersection ?? addVector(vertices[index], currentSegment.normal, distance));
    }
  } else {
    nextVertices.push(safeOffsetSegments[0].start);
    for (let index = 1; index < safeOffsetSegments.length; index += 1) {
      const previousSegment = safeOffsetSegments[index - 1];
      const currentSegment = safeOffsetSegments[index];
      const intersection = intersectLines(previousSegment.start, previousSegment.end, currentSegment.start, currentSegment.end);
      nextVertices.push(intersection ?? currentSegment.start);
    }
    nextVertices.push(safeOffsetSegments[safeOffsetSegments.length - 1].end);
  }

  if (nextVertices.some((vertex) => !Number.isFinite(vertex.x) || !Number.isFinite(vertex.y))) {
    return null;
  }

  return nextVertices;
};

const buildLineOffsetEntity = (entity: DXFEntity, distance: number): DXFEntity | null => {
  const props = entity.properties as DXFEntityProperties;
  if (
    typeof props.x1 !== 'number'
    || typeof props.y1 !== 'number'
    || typeof props.x2 !== 'number'
    || typeof props.y2 !== 'number'
  ) {
    return null;
  }

  const vector = buildSegmentVector({ x: props.x1, y: props.y1 }, { x: props.x2, y: props.y2 });
  if (!vector) {
    return null;
  }

  const start = addVector({ x: props.x1, y: props.y1 }, vector.normal, distance);
  const end = addVector({ x: props.x2, y: props.y2 }, vector.normal, distance);

  return {
    ...entity,
    properties: {
      ...props,
      x: start.x,
      y: start.y,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y
    }
  };
};

const buildCircleOffsetEntity = (entity: DXFEntity, distance: number): DXFEntity | null => {
  const props = entity.properties as DXFEntityProperties;
  if (
    typeof props.centerX !== 'number'
    || typeof props.centerY !== 'number'
    || typeof props.radius !== 'number'
  ) {
    return null;
  }

  const nextRadius = props.radius + distance;
  if (nextRadius <= OFFSET_EPSILON) {
    return null;
  }

  return {
    ...entity,
    properties: {
      ...props,
      radius: nextRadius
    }
  };
};

const buildPolylineOffsetEntity = (entity: DXFEntity, distance: number): DXFEntity | null => {
  const props = entity.properties as DXFEntityProperties;
  if (!props.vertices || props.vertices.length < 2) {
    return null;
  }

  const sourceVertices = polylineHasBulgeVertices(props.vertices)
    ? toOffsetVertices(buildPolylineSamplePoints(props.vertices, Boolean(props.closed)))
    : props.vertices;
  const nextVertices = buildPolylineOffsetVertices(sourceVertices, distance, Boolean(props.closed));
  if (!nextVertices) {
    return null;
  }

  const {
    code_10: _code10,
    code_20: _code20,
    code_42: _code42,
    ...baseProps
  } = props;

  return {
    ...entity,
    properties: {
      ...baseProps,
      x: nextVertices[0]?.x,
      y: nextVertices[0]?.y,
      vertexCount: nextVertices.length,
      vertices: nextVertices
    }
  };
};

export const buildPreviewOverlaySegmentsFromEntity = (entity: DXFEntity, color = OFFSET_PREVIEW_COLOR): OverlaySegment[] => {
  const props = entity.properties as DXFEntityProperties;
  if (
    entity.type === 'LINE'
    && typeof props.x1 === 'number'
    && typeof props.y1 === 'number'
    && typeof props.x2 === 'number'
    && typeof props.y2 === 'number'
  ) {
    return [{
      start: { x: props.x1, y: props.y1 },
      end: { x: props.x2, y: props.y2 },
      color,
      strokeWidth: 2.2
    }];
  }

  if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices && props.vertices.length > 1) {
    const sampledPoints = buildPolylineSamplePoints(props.vertices, Boolean(props.closed));
    const segments = sampledPoints.slice(1).map((point, index) => ({
      start: sampledPoints[index],
      end: point,
      color,
      strokeWidth: 2.2
    }));
    if (props.closed && sampledPoints.length > 2) {
      segments.push({
        start: sampledPoints[sampledPoints.length - 1],
        end: sampledPoints[0],
        color,
        strokeWidth: 2.2
      });
    }
    return segments;
  }

  if (
    entity.type === 'CIRCLE'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.radius === 'number'
    && props.radius > OFFSET_EPSILON
  ) {
    const steps = 48;
    const segments: OverlaySegment[] = [];
    for (let index = 0; index < steps; index += 1) {
      const startAngle = (Math.PI * 2 * index) / steps;
      const endAngle = (Math.PI * 2 * (index + 1)) / steps;
      segments.push({
        start: {
          x: props.centerX + Math.cos(startAngle) * props.radius,
          y: props.centerY + Math.sin(startAngle) * props.radius
        },
        end: {
          x: props.centerX + Math.cos(endAngle) * props.radius,
          y: props.centerY + Math.sin(endAngle) * props.radius
        },
        color,
        strokeWidth: 2.2
      });
    }
    return segments;
  }

  if (
    entity.type === 'ARC'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.radius === 'number'
    && typeof props.startAngle === 'number'
    && typeof props.endAngle === 'number'
    && props.radius > OFFSET_EPSILON
  ) {
    const startAngle = (props.startAngle * Math.PI) / 180;
    const endAngle = (props.endAngle * Math.PI) / 180;
    const rawSweep = endAngle - startAngle;
    const sweep = rawSweep <= 0 ? rawSweep + (Math.PI * 2) : rawSweep;
    const steps = Math.max(12, Math.ceil((Math.abs(sweep) / (Math.PI * 2)) * 48));
    const segments: OverlaySegment[] = [];
    for (let index = 0; index < steps; index += 1) {
      const segmentStartAngle = startAngle + (sweep * index) / steps;
      const segmentEndAngle = startAngle + (sweep * (index + 1)) / steps;
      segments.push({
        start: {
          x: props.centerX + Math.cos(segmentStartAngle) * props.radius,
          y: props.centerY + Math.sin(segmentStartAngle) * props.radius
        },
        end: {
          x: props.centerX + Math.cos(segmentEndAngle) * props.radius,
          y: props.centerY + Math.sin(segmentEndAngle) * props.radius
        },
        color,
        strokeWidth: 2.2
      });
    }
    return segments;
  }

  return [];
};

export const isOffsetSupportedEntity = (entity: DXFEntity | null | undefined): boolean => (
  Boolean(
    entity
    && (
      entity.type === 'LINE'
      || entity.type === 'CIRCLE'
      || entity.type === 'LWPOLYLINE'
      || entity.type === 'POLYLINE'
    )
  )
);

export const buildOffsetEntityPreview = (entity: DXFEntity, referencePoint: Point2D): OffsetEntityPreview | null => {
  if (!isOffsetSupportedEntity(entity)) {
    return null;
  }

  const props = entity.properties as DXFEntityProperties;
  let distance = 0;
  let previewEntity: DXFEntity | null = null;
  let guideStartPoint: Point2D | null = null;

  if (entity.type === 'LINE') {
    const projection = (
      typeof props.x1 === 'number'
      && typeof props.y1 === 'number'
      && typeof props.x2 === 'number'
      && typeof props.y2 === 'number'
    )
      ? projectPointOntoSegment(referencePoint, { x: props.x1, y: props.y1 }, { x: props.x2, y: props.y2 })
      : null;
    distance = projection?.signedDistance ?? 0;
    guideStartPoint = projection?.projectedPoint ?? null;
    previewEntity = buildLineOffsetEntity(entity, distance);
  } else if (entity.type === 'CIRCLE') {
    if (
      typeof props.centerX !== 'number'
      || typeof props.centerY !== 'number'
      || typeof props.radius !== 'number'
    ) {
      return null;
    }
    distance = Math.hypot(referencePoint.x - props.centerX, referencePoint.y - props.centerY) - props.radius;
    guideStartPoint = { x: props.centerX, y: props.centerY };
    previewEntity = buildCircleOffsetEntity(entity, distance);
  } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices) {
    const projectionVertices = polylineHasBulgeVertices(props.vertices)
      ? buildPolylineSamplePoints(props.vertices, Boolean(props.closed))
      : props.vertices;
    const nearestProjection = getNearestPolylineProjection(referencePoint, projectionVertices, Boolean(props.closed));
    distance = nearestProjection?.signedDistance ?? 0;
    guideStartPoint = nearestProjection?.projectedPoint ?? null;
    previewEntity = buildPolylineOffsetEntity(entity, distance);
  }

  if (!previewEntity || Math.abs(distance) <= OFFSET_EPSILON) {
    return null;
  }

  return {
    distance,
    entities: [previewEntity],
    overlaySegments: [
      ...buildPreviewOverlaySegmentsFromEntity(previewEntity),
      ...(guideStartPoint ? [{
        start: guideStartPoint,
        end: referencePoint,
        color: OFFSET_PREVIEW_COLOR,
        dashed: true,
        strokeWidth: 1.35
      }] : [])
    ],
    overlayPoints: [
      ...(guideStartPoint ? [{
        point: guideStartPoint,
        color: '#2563eb',
        radius: 4.8
      }] : []),
      {
        point: referencePoint,
        color: OFFSET_PREVIEW_COLOR,
        radius: 5.2
      }
    ]
  };
};


