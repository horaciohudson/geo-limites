import type { DXFData, DXFEntityProperties } from '@/graphics-engine/shared/dxf';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { HoverReferencePoint, ViewerGeoreferencingTransform } from '@/graphics-engine/components/viewer-dxf/viewerState';
import { pointKey } from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';

const REFERENCE_LABEL_PATTERN = /^\s*(?:P|PT|PONTO|V|VERTICE|VERTEX|ESTACA|E)\s*[-_:/# ]*0*(\d{1,4})\s*$/i;

export const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const arePointListsEqual = (left: Point2D[], right: Point2D[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((point, index) => {
    const other = right[index];
    return other && point.x === other.x && point.y === other.y;
  });
};

export const canonicalizeReferenceLabel = (rawLabel?: string | null): string => {
  if (!rawLabel || rawLabel.trim().length === 0) {
    return '';
  }

  const normalized = rawLabel
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[-_:/#]/g, ' ')
    .trim();

  const matcher = normalized.match(REFERENCE_LABEL_PATTERN);
  if (!matcher) {
    return normalized;
  }

  const number = Number.parseInt(matcher[1], 10);
  const prefix = normalized.replace(/\d+/g, '').trim();
  if (!prefix || prefix === 'P' || prefix === 'PT' || prefix === 'PONTO' || prefix === 'V' || prefix === 'VERTICE' || prefix === 'VERTEX') {
    return `POINT:${number.toString().padStart(2, '0')}`;
  }
  if (prefix === 'ESTACA' || prefix === 'E') {
    return `ESTACA:${number.toString().padStart(2, '0')}`;
  }
  return `${prefix}:${number.toString().padStart(2, '0')}`;
};

export const extractGeometryVertices = (dxfData: DXFData | null): Point2D[] => {
  if (!dxfData) {
    return [];
  }

  const unique = new Map<string, Point2D>();
  const addPoint = (x?: number, y?: number) => {
    if (typeof x !== 'number' || typeof y !== 'number') {
      return;
    }
    const point = { x, y, id: `V_${x.toFixed(3)}_${y.toFixed(3)}` };
    unique.set(pointKey(point), point);
  };

  dxfData.entities.forEach((entity) => {
    const props = entity.properties as DXFEntityProperties;
    if (entity.type === 'LINE') {
      addPoint(props.x1, props.y1);
      addPoint(props.x2, props.y2);
      return;
    }

    if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices) {
      props.vertices.forEach((vertex) => addPoint(vertex.x, vertex.y));
    }
  });

  return Array.from(unique.values());
};

export const buildViewerGeoreferencingTransform = (matches: HoverReferencePoint[]): ViewerGeoreferencingTransform | null => {
  if (matches.length < 2) {
    return null;
  }

  const first = matches[0];
  const second = matches[1];
  const localDx = second.originalX - first.originalX;
  const localDy = second.originalY - first.originalY;
  const realDx = second.georeferencedX - first.georeferencedX;
  const realDy = second.georeferencedY - first.georeferencedY;
  const localDistance = Math.hypot(localDx, localDy);
  const realDistance = Math.hypot(realDx, realDy);

  if (localDistance < 0.000001 || realDistance < 0.000001) {
    return null;
  }

  const scale = realDistance / localDistance;
  const rotationRadians = Math.atan2(realDy, realDx) - Math.atan2(localDy, localDx);
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  const translateX = first.georeferencedX - scale * (first.originalX * cos - first.originalY * sin);
  const translateY = first.georeferencedY - scale * (first.originalX * sin + first.originalY * cos);

  const averageResidualMeters = matches.reduce((sum, match) => {
    const projectedX = scale * (match.originalX * cos - match.originalY * sin) + translateX;
    const projectedY = scale * (match.originalX * sin + match.originalY * cos) + translateY;
    return sum + Math.hypot(projectedX - match.georeferencedX, projectedY - match.georeferencedY);
  }, 0) / matches.length;

  return {
    rotationRadians,
    rotationDegrees: rotationRadians * (180 / Math.PI),
    scale,
    translateX,
    translateY,
    averageResidualMeters,
    matchedPoints: matches.length
  };
};

export const applyViewerTransform = (point: Point2D, transform: ViewerGeoreferencingTransform | null): Point2D => {
  if (!transform) {
    return point;
  }

  const cos = Math.cos(transform.rotationRadians);
  const sin = Math.sin(transform.rotationRadians);
  return {
    x: transform.scale * (point.x * cos - point.y * sin) + transform.translateX,
    y: transform.scale * (point.x * sin + point.y * cos) + transform.translateY,
    id: point.id
  };
};


