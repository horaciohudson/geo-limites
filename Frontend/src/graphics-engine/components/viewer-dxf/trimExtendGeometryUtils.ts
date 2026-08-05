import type { DXFEntity, DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';
import { calculateDistance } from '@/graphics-engine/shared/geometry';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import { pointToSegmentDistance } from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import { applyNodeEditToEntity, type EditableNodeRole } from '@/graphics-engine/components/viewer-dxf/nodeEditUtils';
import { buildPolylineSamplePoints, polylineHasBulgeVertices } from '@/graphics-engine/components/viewer-dxf/dxfGeometryUtils';

export const TRIM_EXTEND_EPSILON = 0.001;

export type LinearIntersectionCandidate =
  | {
      kind: 'segment';
      start: Point2D;
      end: Point2D;
    }
  | {
      kind: 'circle';
      center: Point2D;
      radius: number;
    }
  | {
      kind: 'arc';
      center: Point2D;
      radius: number;
      startAngle: number;
      endAngle: number;
    };

export type PolylineTrimExtendHandle = {
  point: Point2D;
  direction: Point2D;
  vertexIndex: number;
  segmentIndex: number;
  side: 'start' | 'end';
  maxDistance: number;
};

export type PolylineSegmentPoints = {
  start: Point2D;
  end: Point2D;
};

const clonePointToVertex = (point: Point2D): DXFVertex => ({
  x: point.x,
  y: point.y
});

const crossProduct = (left: Point2D, right: Point2D): number => (
  (left.x * right.y) - (left.y * right.x)
);

const normalizeVector = (vector: Point2D): Point2D | null => {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= TRIM_EXTEND_EPSILON) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
};

export const normalizeAngleDegrees = (angle: number): number => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const getPointAngleDegrees = (center: Point2D, point: Point2D): number => (
  normalizeAngleDegrees((Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI)
);

export const isAngleInsideArc = (angle: number, startAngle: number, endAngle: number): boolean => {
  const normalizedAngle = normalizeAngleDegrees(angle);
  const normalizedStart = normalizeAngleDegrees(startAngle);
  const normalizedEnd = normalizeAngleDegrees(endAngle);

  if (Math.abs(normalizedStart - normalizedEnd) <= TRIM_EXTEND_EPSILON) {
    return true;
  }

  if (normalizedStart <= normalizedEnd) {
    return normalizedAngle >= normalizedStart - TRIM_EXTEND_EPSILON
      && normalizedAngle <= normalizedEnd + TRIM_EXTEND_EPSILON;
  }

  return normalizedAngle >= normalizedStart - TRIM_EXTEND_EPSILON
    || normalizedAngle <= normalizedEnd + TRIM_EXTEND_EPSILON;
};

export const getArcPointAtAngle = (center: Point2D, radius: number, angleDegrees: number): Point2D => {
  const radians = (normalizeAngleDegrees(angleDegrees) * Math.PI) / 180;
  return {
    x: center.x + Math.cos(radians) * radius,
    y: center.y + Math.sin(radians) * radius
  };
};

export const getArcSweepDegrees = (startAngle: number, endAngle: number): number => (
  normalizeAngleDegrees(endAngle - startAngle)
);

export const getArcCounterClockwiseDelta = (fromAngle: number, toAngle: number): number => (
  normalizeAngleDegrees(toAngle - fromAngle)
);

export const getArcClockwiseDelta = (fromAngle: number, toAngle: number): number => (
  normalizeAngleDegrees(fromAngle - toAngle)
);

const findSegmentCircleIntersections = (
  center: Point2D,
  radius: number,
  start: Point2D,
  end: Point2D
): Point2D[] => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const fx = start.x - center.x;
  const fy = start.y - center.y;
  const a = (dx * dx) + (dy * dy);
  const b = 2 * ((fx * dx) + (fy * dy));
  const c = (fx * fx) + (fy * fy) - (radius * radius);
  const discriminant = (b * b) - (4 * a * c);
  if (a <= TRIM_EXTEND_EPSILON || discriminant < -TRIM_EXTEND_EPSILON) {
    return [];
  }

  const safeDiscriminant = Math.max(discriminant, 0);
  const sqrtDiscriminant = Math.sqrt(safeDiscriminant);
  const ts = [(-b - sqrtDiscriminant) / (2 * a), (-b + sqrtDiscriminant) / (2 * a)];

  return ts
    .filter((t, index, values) => (
      Number.isFinite(t)
      && t >= -TRIM_EXTEND_EPSILON
      && t <= 1 + TRIM_EXTEND_EPSILON
      && values.findIndex((candidate) => Math.abs(candidate - t) <= TRIM_EXTEND_EPSILON) === index
    ))
    .map((t) => ({
      x: start.x + dx * t,
      y: start.y + dy * t
    }));
};

const findCircleCircleIntersections = (
  centerA: Point2D,
  radiusA: number,
  centerB: Point2D,
  radiusB: number
): Point2D[] => {
  const dx = centerB.x - centerA.x;
  const dy = centerB.y - centerA.y;
  const distance = Math.hypot(dx, dy);
  if (
    distance <= TRIM_EXTEND_EPSILON
    || distance > radiusA + radiusB + TRIM_EXTEND_EPSILON
    || distance < Math.abs(radiusA - radiusB) - TRIM_EXTEND_EPSILON
  ) {
    return [];
  }

  const a = ((radiusA * radiusA) - (radiusB * radiusB) + (distance * distance)) / (2 * distance);
  const hSquared = (radiusA * radiusA) - (a * a);
  if (hSquared < -TRIM_EXTEND_EPSILON) {
    return [];
  }

  const h = Math.sqrt(Math.max(hSquared, 0));
  const midX = centerA.x + (a * dx) / distance;
  const midY = centerA.y + (a * dy) / distance;
  const rx = (-dy * h) / distance;
  const ry = (dx * h) / distance;
  const points = [
    { x: midX + rx, y: midY + ry },
    { x: midX - rx, y: midY - ry }
  ];

  return points.filter((point, index, values) => (
    values.findIndex((candidate) => (
      Math.abs(candidate.x - point.x) <= TRIM_EXTEND_EPSILON
      && Math.abs(candidate.y - point.y) <= TRIM_EXTEND_EPSILON
    )) === index
  ));
};

const findRaySegmentIntersection = (
  origin: Point2D,
  direction: Point2D,
  start: Point2D,
  end: Point2D,
  minDistance: number,
  maxDistance: number
): { point: Point2D; distance: number } | null => {
  const segmentVector = {
    x: end.x - start.x,
    y: end.y - start.y
  };
  const denominator = crossProduct(direction, segmentVector);
  if (Math.abs(denominator) <= TRIM_EXTEND_EPSILON) {
    return null;
  }

  const delta = {
    x: start.x - origin.x,
    y: start.y - origin.y
  };
  const rayDistance = crossProduct(delta, segmentVector) / denominator;
  const segmentFactor = crossProduct(delta, direction) / denominator;
  if (
    rayDistance <= minDistance
    || rayDistance >= maxDistance
    || segmentFactor < -TRIM_EXTEND_EPSILON
    || segmentFactor > 1 + TRIM_EXTEND_EPSILON
  ) {
    return null;
  }

  return {
    point: {
      x: origin.x + direction.x * rayDistance,
      y: origin.y + direction.y * rayDistance
    },
    distance: rayDistance
  };
};

const solveRayCircleIntersections = (
  origin: Point2D,
  direction: Point2D,
  center: Point2D,
  radius: number,
  minDistance: number,
  maxDistance: number
): Array<{ point: Point2D; distance: number }> => {
  const offset = {
    x: origin.x - center.x,
    y: origin.y - center.y
  };
  const b = 2 * ((direction.x * offset.x) + (direction.y * offset.y));
  const c = (offset.x * offset.x) + (offset.y * offset.y) - (radius * radius);
  const discriminant = (b * b) - (4 * c);
  if (discriminant < -TRIM_EXTEND_EPSILON) {
    return [];
  }

  const safeDiscriminant = Math.max(discriminant, 0);
  const sqrtDiscriminant = Math.sqrt(safeDiscriminant);
  const distances = [(-b - sqrtDiscriminant) / 2, (-b + sqrtDiscriminant) / 2];

  return distances
    .filter((distance, index, values) => (
      Number.isFinite(distance)
      && distance > minDistance
      && distance < maxDistance
      && values.findIndex((candidate) => Math.abs(candidate - distance) <= TRIM_EXTEND_EPSILON) === index
    ))
    .map((distance) => ({
      distance,
      point: {
        x: origin.x + direction.x * distance,
        y: origin.y + direction.y * distance
      }
    }));
};

export const buildLinearIntersectionCandidates = (entity: DXFEntity): LinearIntersectionCandidate[] => {
  const props = entity.properties as DXFEntityProperties;
  if (
    entity.type === 'LINE'
    && typeof props.x1 === 'number'
    && typeof props.y1 === 'number'
    && typeof props.x2 === 'number'
    && typeof props.y2 === 'number'
  ) {
    return [{
      kind: 'segment',
      start: { x: props.x1, y: props.y1 },
      end: { x: props.x2, y: props.y2 }
    }];
  }

  if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && Array.isArray(props.vertices) && props.vertices.length >= 2) {
    const candidateVertices = polylineHasBulgeVertices(props.vertices)
      ? buildPolylineSamplePoints(props.vertices, Boolean(props.closed)).map(clonePointToVertex)
      : props.vertices;
    const segments: LinearIntersectionCandidate[] = candidateVertices.slice(1).map((vertex, index) => ({
      kind: 'segment',
      start: { x: candidateVertices[index].x, y: candidateVertices[index].y },
      end: { x: vertex.x, y: vertex.y }
    }));

    if (props.closed && candidateVertices.length > 2) {
      segments.push({
        kind: 'segment',
        start: { x: candidateVertices[candidateVertices.length - 1].x, y: candidateVertices[candidateVertices.length - 1].y },
        end: { x: candidateVertices[0].x, y: candidateVertices[0].y }
      });
    }

    return segments;
  }

  if (
    entity.type === 'CIRCLE'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.radius === 'number'
    && props.radius > TRIM_EXTEND_EPSILON
  ) {
    return [{
      kind: 'circle',
      center: { x: props.centerX, y: props.centerY },
      radius: props.radius
    }];
  }

  if (
    entity.type === 'ARC'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.radius === 'number'
    && typeof props.startAngle === 'number'
    && typeof props.endAngle === 'number'
    && props.radius > TRIM_EXTEND_EPSILON
  ) {
    return [{
      kind: 'arc',
      center: { x: props.centerX, y: props.centerY },
      radius: props.radius,
      startAngle: props.startAngle,
      endAngle: props.endAngle
    }];
  }

  return [];
};

export const findRayCandidateIntersection = (
  origin: Point2D,
  direction: Point2D,
  candidate: LinearIntersectionCandidate,
  options?: {
    minDistance?: number;
    maxDistance?: number;
  }
): { point: Point2D; distance: number } | null => {
  const minDistance = options?.minDistance ?? TRIM_EXTEND_EPSILON;
  const maxDistance = options?.maxDistance ?? Number.POSITIVE_INFINITY;

  if (candidate.kind === 'segment') {
    return findRaySegmentIntersection(origin, direction, candidate.start, candidate.end, minDistance, maxDistance);
  }

  const circleHits = solveRayCircleIntersections(origin, direction, candidate.center, candidate.radius, minDistance, maxDistance);
  if (candidate.kind === 'circle') {
    return circleHits.sort((left, right) => left.distance - right.distance)[0] ?? null;
  }

  return circleHits
    .filter((hit) => isAngleInsideArc(getPointAngleDegrees(candidate.center, hit.point), candidate.startAngle, candidate.endAngle))
    .sort((left, right) => left.distance - right.distance)[0] ?? null;
};

export const findCircleCandidateIntersections = (
  center: Point2D,
  radius: number,
  candidate: LinearIntersectionCandidate
): Point2D[] => {
  if (candidate.kind === 'segment') {
    return findSegmentCircleIntersections(center, radius, candidate.start, candidate.end);
  }

  const intersections = findCircleCircleIntersections(center, radius, candidate.center, candidate.radius);
  if (candidate.kind === 'circle') {
    return intersections;
  }

  return intersections.filter((point) => (
    isAngleInsideArc(getPointAngleDegrees(candidate.center, point), candidate.startAngle, candidate.endAngle)
  ));
};

export const applyTrimExtendToEntity = (
  entity: DXFEntity,
  role: EditableNodeRole,
  targetPoint: Point2D,
  vertexIndex?: number
): DXFEntity => {
  const props = entity.properties as DXFEntityProperties;
  if (
    entity.type === 'ARC'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.startAngle === 'number'
    && typeof props.endAngle === 'number'
  ) {
    const targetAngle = getPointAngleDegrees({ x: props.centerX, y: props.centerY }, targetPoint);
    return {
      ...entity,
      properties: {
        ...props,
        startAngle: role === 'start' ? targetAngle : props.startAngle,
        endAngle: role === 'end' ? targetAngle : props.endAngle
      }
    };
  }

  if (
    (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE')
    && props.vertices?.length
  ) {
    if (polylineHasBulgeVertices(props.vertices)) {
      const sampledPoints = buildPolylineSamplePoints(props.vertices, Boolean(props.closed));
      if (sampledPoints.length >= 2) {
        const nextVertices = sampledPoints.map(clonePointToVertex);
        if (role === 'start') {
          nextVertices[0] = clonePointToVertex(targetPoint);
        } else if (role === 'end') {
          nextVertices[nextVertices.length - 1] = clonePointToVertex(targetPoint);
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
            closed: false,
            x: nextVertices[0]?.x,
            y: nextVertices[0]?.y,
            vertexCount: nextVertices.length,
            vertices: nextVertices
          }
        };
      }
    }

    if (
      typeof vertexIndex === 'number'
      && vertexIndex >= 0
      && vertexIndex < props.vertices.length
    ) {
    const nextVertices = props.vertices.map((vertex, index) => (
      index === vertexIndex
        ? { ...vertex, x: targetPoint.x, y: targetPoint.y }
        : { ...vertex }
    ));
    return {
      ...entity,
      properties: {
        ...props,
        x: nextVertices[0]?.x,
        y: nextVertices[0]?.y,
        vertices: nextVertices
      }
    };
    }
  }

  return applyNodeEditToEntity(entity, role, undefined, targetPoint);
};

export const getPreferredOpenPolylineTrimExtendHandle = (
  vertices: DXFVertex[],
  referencePoint: Point2D,
  mode: 'trim' | 'extend'
): PolylineTrimExtendHandle | null => {
  if (vertices.length < 2) {
    return null;
  }

  const handles = vertices.slice(1).flatMap((endVertex, segmentIndex) => {
    const startVertex = vertices[segmentIndex];
    const startPoint = { x: startVertex.x, y: startVertex.y };
    const endPoint = { x: endVertex.x, y: endVertex.y };
    const segmentLength = calculateDistance(startPoint, endPoint);
    if (segmentLength <= TRIM_EXTEND_EPSILON) {
      return [];
    }

    const inwardStartDirection = normalizeVector({
      x: endPoint.x - startPoint.x,
      y: endPoint.y - startPoint.y
    });
    const inwardEndDirection = normalizeVector({
      x: startPoint.x - endPoint.x,
      y: startPoint.y - endPoint.y
    });
    const outwardStartDirection = normalizeVector({
      x: startPoint.x - endPoint.x,
      y: startPoint.y - endPoint.y
    });
    const outwardEndDirection = normalizeVector({
      x: endPoint.x - startPoint.x,
      y: endPoint.y - startPoint.y
    });
    const segmentDistance = pointToSegmentDistance(referencePoint, startPoint, endPoint);
    const startEndpointDistance = calculateDistance(referencePoint, startPoint);
    const endEndpointDistance = calculateDistance(referencePoint, endPoint);
    const startScore = (segmentDistance * 0.75) + (startEndpointDistance * 0.25);
    const endScore = (segmentDistance * 0.75) + (endEndpointDistance * 0.25);

    return [
      ...(mode === 'trim' ? inwardStartDirection ? [{
        point: startPoint,
        direction: inwardStartDirection,
        vertexIndex: segmentIndex,
        segmentIndex,
        side: 'start' as const,
        maxDistance: segmentLength,
        score: startScore,
        endpointDistance: startEndpointDistance
      }] : [] : outwardStartDirection ? [{
        point: startPoint,
        direction: outwardStartDirection,
        vertexIndex: segmentIndex,
        segmentIndex,
        side: 'start' as const,
        maxDistance: segmentLength,
        score: startScore,
        endpointDistance: startEndpointDistance
      }] : []),
      ...(mode === 'trim' ? inwardEndDirection ? [{
        point: endPoint,
        direction: inwardEndDirection,
        vertexIndex: segmentIndex + 1,
        segmentIndex,
        side: 'end' as const,
        maxDistance: segmentLength,
        score: endScore,
        endpointDistance: endEndpointDistance
      }] : [] : outwardEndDirection ? [{
        point: endPoint,
        direction: outwardEndDirection,
        vertexIndex: segmentIndex + 1,
        segmentIndex,
        side: 'end' as const,
        maxDistance: segmentLength,
        score: endScore,
        endpointDistance: endEndpointDistance
      }] : [])
    ];
  });

  const bestHandle = handles.sort((left, right) => {
    if (Math.abs(left.score - right.score) > TRIM_EXTEND_EPSILON) {
      return left.score - right.score;
    }
    if (Math.abs(left.endpointDistance - right.endpointDistance) > TRIM_EXTEND_EPSILON) {
      return left.endpointDistance - right.endpointDistance;
    }
    return left.vertexIndex - right.vertexIndex;
  })[0];

  if (!bestHandle) {
    return null;
  }

  return {
    point: bestHandle.point,
    direction: bestHandle.direction,
    vertexIndex: bestHandle.vertexIndex,
    segmentIndex: bestHandle.segmentIndex,
    side: bestHandle.side,
    maxDistance: bestHandle.maxDistance
  };
};

export const getOpenPolylineSegmentPoints = (
  vertices: DXFVertex[],
  segmentIndex: number
): PolylineSegmentPoints | null => {
  if (segmentIndex < 0 || segmentIndex >= vertices.length - 1) {
    return null;
  }

  const startVertex = vertices[segmentIndex];
  const endVertex = vertices[segmentIndex + 1];
  if (!startVertex || !endVertex) {
    return null;
  }

  return {
    start: { x: startVertex.x, y: startVertex.y },
    end: { x: endVertex.x, y: endVertex.y }
  };
};

