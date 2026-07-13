import { calculateDistance } from '@/graphics-engine/shared/geometry';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { SegmentConfrontationAnnotation } from '@/graphics-engine/components/viewer-dxf/types';

export const isPointInPolygon = (point: Point2D, polygon: Point2D[]) => {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
    if (intersect) {
      isInside = !isInside;
    }
  }
  return isInside;
};

export const pointKey = (point: Point2D): string => `${point.x.toFixed(3)}|${point.y.toFixed(3)}`;

export const getMidpoint = (left: Point2D, right: Point2D): Point2D => ({
  x: (left.x + right.x) / 2,
  y: (left.y + right.y) / 2
});

export const getPolygonCentroid = (polygon: Point2D[]): Point2D => {
  if (polygon.length === 0) {
    return { x: 0, y: 0 };
  }

  const total = polygon.reduce((acc, point) => ({
    x: acc.x + point.x,
    y: acc.y + point.y
  }), { x: 0, y: 0 });

  return {
    x: total.x / polygon.length,
    y: total.y / polygon.length
  };
};

export const getPolygonEdges = (polygon: Point2D[]): { start: Point2D; end: Point2D }[] => {
  if (polygon.length < 2) {
    return [];
  }

  return polygon.map((point, index) => ({
    start: point,
    end: polygon[(index + 1) % polygon.length]
  }));
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const pointToSegmentDistance = (point: Point2D, start: Point2D, end: Point2D): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const segmentLengthSquared = dx * dx + dy * dy;

  if (segmentLengthSquared === 0) {
    return calculateDistance(point, start);
  }

  const t = clamp((((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / segmentLengthSquared, 0, 1);
  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy
  };

  return calculateDistance(point, projection);
};

export const segmentToSegmentDistance = (a1: Point2D, a2: Point2D, b1: Point2D, b2: Point2D): number =>
  Math.min(
    pointToSegmentDistance(a1, b1, b2),
    pointToSegmentDistance(a2, b1, b2),
    pointToSegmentDistance(b1, a1, a2),
    pointToSegmentDistance(b2, a1, a2)
  );

export const getSegmentLength = (start: Point2D, end: Point2D): number =>
  calculateDistance(start, end);

const getNormalizedSegmentVector = (start: Point2D, end: Point2D): Point2D | null => {
  const length = getSegmentLength(start, end);
  if (length === 0) {
    return null;
  }

  return {
    x: (end.x - start.x) / length,
    y: (end.y - start.y) / length
  };
};

const getAxisProjection = (point: Point2D, axis: Point2D): number =>
  point.x * axis.x + point.y * axis.y;

export const getProjectedOverlapRatio = (
  aStart: Point2D,
  aEnd: Point2D,
  bStart: Point2D,
  bEnd: Point2D
): number => {
  const axis = getNormalizedSegmentVector(aStart, aEnd) ?? getNormalizedSegmentVector(bStart, bEnd);
  if (!axis) {
    return 0;
  }

  const a1 = getAxisProjection(aStart, axis);
  const a2 = getAxisProjection(aEnd, axis);
  const b1 = getAxisProjection(bStart, axis);
  const b2 = getAxisProjection(bEnd, axis);

  const aMin = Math.min(a1, a2);
  const aMax = Math.max(a1, a2);
  const bMin = Math.min(b1, b2);
  const bMax = Math.max(b1, b2);

  const overlap = Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin));
  const referenceLength = Math.max(1, Math.min(Math.abs(aMax - aMin), Math.abs(bMax - bMin)));
  return overlap / referenceLength;
};

export const getParallelismScore = (
  aStart: Point2D,
  aEnd: Point2D,
  bStart: Point2D,
  bEnd: Point2D
): number => {
  const aVector = getNormalizedSegmentVector(aStart, aEnd);
  const bVector = getNormalizedSegmentVector(bStart, bEnd);

  if (!aVector || !bVector) {
    return 0;
  }

  return Math.abs(aVector.x * bVector.x + aVector.y * bVector.y);
};

export const getSegmentMidpoint = (start: Point2D, end: Point2D): Point2D => ({
  x: (start.x + end.x) / 2,
  y: (start.y + end.y) / 2
});

export const inferDirectionFromPolygon = (polygon: Point2D[], textPoint: Point2D): string | null => {
  if (polygon.length === 0) {
    return null;
  }

  const centroid = getPolygonCentroid(polygon);
  const dx = textPoint.x - centroid.x;
  const dy = textPoint.y - centroid.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'LESTE' : 'OESTE';
  }

  return dy >= 0 ? 'NORTE' : 'SUL';
};

export const inferDirectionFromSegment = (polygon: Point2D[], startPoint: Point2D, endPoint: Point2D): string | null => {
  const centroid = getPolygonCentroid(polygon);
  const closestEdge = getPolygonEdges(polygon)
    .map((edge) => ({
      edge,
      distance: segmentToSegmentDistance(startPoint, endPoint, edge.start, edge.end)
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  if (!closestEdge) {
    return inferDirectionFromPolygon(polygon, getSegmentMidpoint(startPoint, endPoint));
  }

  const edgeMidpoint = getSegmentMidpoint(closestEdge.edge.start, closestEdge.edge.end);
  const dx = edgeMidpoint.x - centroid.x;
  const dy = edgeMidpoint.y - centroid.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'LESTE' : 'OESTE';
  }

  return dy >= 0 ? 'NORTE' : 'SUL';
};

export const polygonTouchesAnnotationSegment = (
  polygon: Point2D[],
  annotation: SegmentConfrontationAnnotation,
  tolerance: number = 1.2
): boolean => {
  const annotationLength = getSegmentLength(annotation.startPoint, annotation.endPoint);
  const corridorDistance = Math.max(tolerance, Math.min(20, annotationLength * 0.18));

  return getPolygonEdges(polygon).some((edge) => {
    const distance = segmentToSegmentDistance(annotation.startPoint, annotation.endPoint, edge.start, edge.end);
    if (distance <= tolerance) {
      return true;
    }

    const overlapRatio = getProjectedOverlapRatio(annotation.startPoint, annotation.endPoint, edge.start, edge.end);
    const parallelism = getParallelismScore(annotation.startPoint, annotation.endPoint, edge.start, edge.end);

    return parallelism >= 0.9 && overlapRatio >= 0.3 && distance <= corridorDistance;
  });
};

export const getSegmentSnapCandidates = (
  referencePoint: Point2D,
  polygons: Point2D[][],
  searchRadius: number,
  preferredPolygon?: Point2D[] | null
): Point2D[] => {
  const scopedPolygons = preferredPolygon && preferredPolygon.length > 0
    ? [preferredPolygon]
    : polygons;

  const relevantPolygons = scopedPolygons.filter((polygon) =>
    isPointInPolygon(referencePoint, polygon) ||
    getPolygonEdges(polygon).some((edge) => pointToSegmentDistance(referencePoint, edge.start, edge.end) <= searchRadius * 1.5)
  );

  const sourcePolygons = relevantPolygons.length > 0
    ? relevantPolygons
    : scopedPolygons
        .map((polygon) => ({
          polygon,
          distance: Math.min(
            ...getPolygonEdges(polygon).map((edge) => pointToSegmentDistance(referencePoint, edge.start, edge.end))
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 1)
        .map((item) => item.polygon);
  const unique = new Map<string, Point2D>();

  sourcePolygons.forEach((polygon) => {
    polygon.forEach((point) => {
      unique.set(`${point.x.toFixed(3)}|${point.y.toFixed(3)}`, point);
    });
  });

  return Array.from(unique.values());
};


