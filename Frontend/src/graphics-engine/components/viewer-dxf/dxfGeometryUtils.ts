import type { DXFVertex } from '@/graphics-engine/shared/dxf';
import { calculateDistance, type Point2D } from '@/graphics-engine/shared/geometry';
import { getArcSweepDegrees, normalizeAngleDegrees } from '@/graphics-engine/components/viewer-dxf/trimExtendGeometryUtils';

const BULGE_EPSILON = 0.000001;
const MAX_SAMPLE_ANGLE_DEGREES = 12;

export interface GeometryBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface BulgeArcDefinition {
  center: Point2D;
  radius: number;
  startAngle: number;
  endAngle: number;
  sweepDegrees: number;
  clockwise: boolean;
}

export interface BulgeSplitResult {
  arc: BulgeArcDefinition;
  splitAngle: number;
  firstBulge: number | undefined;
  secondBulge: number | undefined;
}

export const polylineHasBulgeVertices = (vertices: DXFVertex[] | undefined): boolean => (
  Array.isArray(vertices)
  && vertices.some((vertex) => typeof vertex.bulge === 'number' && Number.isFinite(vertex.bulge) && Math.abs(vertex.bulge) > BULGE_EPSILON)
);

export const getSampledPointBounds = (points: Point2D[]): GeometryBounds | null => {
  if (points.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  return { minX, minY, maxX, maxY };
};

export const buildArcSamplePoints = (
  center: Point2D,
  radius: number,
  startAngle: number,
  endAngle: number,
  maxStepDegrees = MAX_SAMPLE_ANGLE_DEGREES,
  clockwise = false
): Point2D[] => {
  if (!Number.isFinite(radius) || radius <= 0) {
    return [];
  }

  const sweepDegrees = clockwise
    ? getArcSweepDegrees(endAngle, startAngle)
    : getArcSweepDegrees(startAngle, endAngle);
  const segmentCount = Math.max(2, Math.ceil(Math.max(sweepDegrees, 1) / Math.max(maxStepDegrees, 1)));
  const points: Point2D[] = [];

  for (let index = 0; index <= segmentCount; index += 1) {
    const direction = clockwise ? -1 : 1;
    const angle = normalizeAngleDegrees(startAngle + (direction * ((sweepDegrees * index) / segmentCount)));
    const radians = (angle * Math.PI) / 180;
    points.push({
      x: center.x + (Math.cos(radians) * radius),
      y: center.y + (Math.sin(radians) * radius)
    });
  }

  return points;
};

export const getBulgeArcDefinition = (
  start: Point2D,
  end: Point2D,
  bulge: number | undefined
): BulgeArcDefinition | null => {
  if (typeof bulge !== 'number' || !Number.isFinite(bulge) || Math.abs(bulge) <= BULGE_EPSILON) {
    return null;
  }

  const chordLength = calculateDistance(start, end);
  if (chordLength <= BULGE_EPSILON) {
    return null;
  }

  const sweepRadians = 4 * Math.atan(bulge);
  const radius = (chordLength * (1 + (bulge * bulge))) / (4 * Math.abs(bulge));
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };
  const unitLeftNormal = {
    x: -(end.y - start.y) / chordLength,
    y: (end.x - start.x) / chordLength
  };
  const centerOffset = (chordLength * (1 - (bulge * bulge))) / (4 * bulge);
  const center = {
    x: midpoint.x + (unitLeftNormal.x * centerOffset),
    y: midpoint.y + (unitLeftNormal.y * centerOffset)
  };
  const startAngle = normalizeAngleDegrees((Math.atan2(start.y - center.y, start.x - center.x) * 180) / Math.PI);
  const endAngle = normalizeAngleDegrees((Math.atan2(end.y - center.y, end.x - center.x) * 180) / Math.PI);

  return {
    center,
    radius,
    startAngle,
    endAngle,
    sweepDegrees: Math.abs((sweepRadians * 180) / Math.PI),
    clockwise: bulge < 0
  };
};

const getBulgeDirectedSweepDegrees = (
  startAngle: number,
  endAngle: number,
  clockwise: boolean
): number => (
  clockwise
    ? getArcSweepDegrees(endAngle, startAngle)
    : getArcSweepDegrees(startAngle, endAngle)
);

const normalizeBulgeValue = (bulge: number): number | undefined => (
  Number.isFinite(bulge) && Math.abs(bulge) > BULGE_EPSILON ? bulge : undefined
);

export const splitBulgeSegmentAtPoint = (
  start: Point2D,
  end: Point2D,
  bulge: number | undefined,
  splitPoint: Point2D
): BulgeSplitResult | null => {
  const arc = getBulgeArcDefinition(start, end, bulge);
  if (!arc || typeof bulge !== 'number' || !Number.isFinite(bulge)) {
    return null;
  }

  const splitAngle = normalizeAngleDegrees((Math.atan2(splitPoint.y - arc.center.y, splitPoint.x - arc.center.x) * 180) / Math.PI);
  const firstSweepDegrees = getBulgeDirectedSweepDegrees(arc.startAngle, splitAngle, arc.clockwise);
  const secondSweepDegrees = getBulgeDirectedSweepDegrees(splitAngle, arc.endAngle, arc.clockwise);
  if (firstSweepDegrees <= BULGE_EPSILON || secondSweepDegrees <= BULGE_EPSILON) {
    return null;
  }

  const bulgeSign = bulge < 0 ? -1 : 1;
  return {
    arc,
    splitAngle,
    firstBulge: normalizeBulgeValue(bulgeSign * Math.tan(((firstSweepDegrees * Math.PI) / 180) / 4)),
    secondBulge: normalizeBulgeValue(bulgeSign * Math.tan(((secondSweepDegrees * Math.PI) / 180) / 4))
  };
};

export const buildBulgeSegmentSamplePoints = (
  start: Point2D,
  end: Point2D,
  bulge: number | undefined,
  maxStepDegrees = MAX_SAMPLE_ANGLE_DEGREES
): Point2D[] => {
  const arcDefinition = getBulgeArcDefinition(start, end, bulge);
  if (!arcDefinition) {
    return [start, end];
  }

  return buildArcSamplePoints(
    arcDefinition.center,
    arcDefinition.radius,
    arcDefinition.startAngle,
    arcDefinition.endAngle,
    maxStepDegrees,
    arcDefinition.clockwise
  );
};

export const buildPolylineSamplePoints = (
  vertices: DXFVertex[],
  closed: boolean | undefined,
  maxStepDegrees = MAX_SAMPLE_ANGLE_DEGREES
): Point2D[] => {
  if (vertices.length === 0) {
    return [];
  }

  const sampledPoints: Point2D[] = [];
  const segmentCount = closed ? vertices.length : vertices.length - 1;

  for (let index = 0; index < segmentCount; index += 1) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];
    const segmentPoints = buildBulgeSegmentSamplePoints(start, end, start.bulge, maxStepDegrees);
    if (segmentPoints.length === 0) {
      continue;
    }
    if (sampledPoints.length === 0) {
      sampledPoints.push(...segmentPoints);
    } else {
      sampledPoints.push(...segmentPoints.slice(1));
    }
  }

  if (sampledPoints.length === 0) {
    sampledPoints.push(...vertices.map((vertex) => ({ x: vertex.x, y: vertex.y })));
  }

  if (
    closed
    && sampledPoints.length > 1
    && Math.abs(sampledPoints[0].x - sampledPoints[sampledPoints.length - 1].x) <= BULGE_EPSILON
    && Math.abs(sampledPoints[0].y - sampledPoints[sampledPoints.length - 1].y) <= BULGE_EPSILON
  ) {
    sampledPoints.pop();
  }

  return sampledPoints;
};
