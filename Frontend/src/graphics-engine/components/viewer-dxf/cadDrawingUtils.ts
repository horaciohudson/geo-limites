import type { DXFEntity, DXFVertex } from '@/graphics-engine/shared/dxf';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type {
  DrawingTextAlignment,
  DrawingTextVerticalAlignment,
  EmbeddedCadToolMode
} from '@/graphics-engine/components/viewer-dxf/viewerContracts';

export const DRAWING_TOOL_MODES = new Set<EmbeddedCadToolMode>([
  'rectangle',
  'circle',
  'bezier',
  'point',
  'distance',
  'line',
  'point-to-point',
  'text'
]);

export const DEFAULT_DRAWING_LAYER = 'PRINCIPAL';

export const buildLineEntity = (start: Point2D, end: Point2D, layer: string): DXFEntity => ({
  type: 'LINE',
  layer,
  properties: {
    x: start.x,
    y: start.y,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y
  }
});

export const buildPointEntity = (point: Point2D, layer: string): DXFEntity => ({
  type: 'POINT',
  layer,
  properties: {
    x: point.x,
    y: point.y
  }
});

export const buildRectangleVertices = (start: Point2D, end: Point2D): DXFVertex[] => ([
  { x: start.x, y: start.y },
  { x: end.x, y: start.y },
  { x: end.x, y: end.y },
  { x: start.x, y: end.y }
]);

export const buildPolylineEntity = (vertices: DXFVertex[], layer: string, closed = false): DXFEntity => ({
  type: 'LWPOLYLINE',
  layer,
  properties: {
    x: vertices[0]?.x,
    y: vertices[0]?.y,
    closed,
    polylineFlag: closed ? 1 : 0,
    vertexCount: vertices.length,
    vertices
  }
});

export const sampleCubicBezier = (
  start: Point2D,
  control1: Point2D,
  control2: Point2D,
  end: Point2D,
  steps = 24
): DXFVertex[] => {
  const vertices: DXFVertex[] = [];

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const mt = 1 - t;
    vertices.push({
      x: (mt ** 3 * start.x)
        + (3 * mt * mt * t * control1.x)
        + (3 * mt * t * t * control2.x)
        + (t ** 3 * end.x),
      y: (mt ** 3 * start.y)
        + (3 * mt * mt * t * control1.y)
        + (3 * mt * t * t * control2.y)
        + (t ** 3 * end.y)
    });
  }

  return vertices;
};

export const buildBezierControlPointsFromQuadratic = (
  start: Point2D,
  control: Point2D,
  end: Point2D
): { control1: Point2D; control2: Point2D } => ({
  control1: {
    x: start.x + ((2 / 3) * (control.x - start.x)),
    y: start.y + ((2 / 3) * (control.y - start.y))
  },
  control2: {
    x: end.x + ((2 / 3) * (control.x - end.x)),
    y: end.y + ((2 / 3) * (control.y - end.y))
  }
});

export const buildBezierEntity = (
  start: Point2D,
  control1: Point2D,
  control2: Point2D,
  end: Point2D,
  layer: string
): DXFEntity => {
  const vertices = sampleCubicBezier(start, control1, control2, end);
  return {
    type: 'LWPOLYLINE',
    layer,
    properties: {
      x: vertices[0]?.x,
      y: vertices[0]?.y,
      closed: false,
      polylineFlag: 0,
      vertexCount: vertices.length,
      vertices,
      editorCurveKind: 'bezier-cubic',
      editorCurveControl1X: control1.x,
      editorCurveControl1Y: control1.y,
      editorCurveControl2X: control2.x,
      editorCurveControl2Y: control2.y
    }
  };
};

export const buildCircleEntity = (center: Point2D, edge: Point2D, layer: string): DXFEntity => ({
  type: 'CIRCLE',
  layer,
  properties: {
    x: center.x,
    y: center.y,
    centerX: center.x,
    centerY: center.y,
    radius: Math.hypot(edge.x - center.x, edge.y - center.y),
    rotation: 0
  }
});

export const buildTextEntity = (
  point: Point2D,
  text: string,
  layer: string,
  options?: {
    height?: number;
    rotation?: number;
    horizontalAlign?: number;
    verticalAlign?: number;
    alignmentPoint?: Point2D;
  }
): DXFEntity => ({
  type: 'TEXT',
  layer,
  properties: {
    x: point.x,
    y: point.y,
    text,
    height: options?.height ?? 2.5,
    rotation: options?.rotation,
    horizontalAlign: options?.horizontalAlign,
    verticalAlign: options?.verticalAlign,
    alignmentX: options?.alignmentPoint?.x,
    alignmentY: options?.alignmentPoint?.y
  }
});

type PreviewSegment = {
  start: Point2D;
  end: Point2D;
  color?: string;
  dashed?: boolean;
};

type PreviewPoint = {
  point: Point2D;
  color?: string;
  radius?: number;
};

type PreviewText = {
  point: Point2D;
  text: string;
  color?: string;
  fontSize?: number;
  rotationDegrees?: number;
  alignment?: DrawingTextAlignment;
  verticalAlignment?: DrawingTextVerticalAlignment;
};

export const getTextHorizontalAlignCode = (alignment: DrawingTextAlignment): number => {
  switch (alignment) {
    case 'center':
      return 1;
    case 'right':
      return 2;
    default:
      return 0;
  }
};

export const getTextVerticalAlignCode = (alignment: DrawingTextVerticalAlignment): number => {
  switch (alignment) {
    case 'middle':
      return 2;
    case 'top':
      return 3;
    default:
      return 0;
  }
};

const buildDistanceAnnotationGeometry = (start: Point2D, end: Point2D) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const angleRadians = Math.atan2(dy, dx);
  const angleDegrees = angleRadians * (180 / Math.PI);
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };
  const offset = Math.max(2.5, Math.min(distance * 0.08, 20));
  const textHeight = Math.max(1.6, Math.min(distance * 0.03, 4.2));
  const arrowLength = Math.max(1.8, Math.min(distance * 0.05, 7));
  const arrowSpread = Math.max(0.8, Math.min(arrowLength * 0.45, 3.2));
  const extensionOvershoot = Math.max(0.8, Math.min(distance * 0.015, 2.5));
  const tangent = distance > 0.001
    ? { x: dx / distance, y: dy / distance }
    : { x: 1, y: 0 };
  const normal = distance > 0.001
    ? { x: -dy / distance, y: dx / distance }
    : { x: 0, y: 1 };
  const extensionOffset = {
    x: normal.x * (offset + extensionOvershoot),
    y: normal.y * (offset + extensionOvershoot)
  };
  const dimensionStart = {
    x: start.x + normal.x * offset,
    y: start.y + normal.y * offset
  };
  const dimensionEnd = {
    x: end.x + normal.x * offset,
    y: end.y + normal.y * offset
  };
  const startArrowBase = {
    x: dimensionStart.x + tangent.x * arrowLength,
    y: dimensionStart.y + tangent.y * arrowLength
  };
  const endArrowBase = {
    x: dimensionEnd.x - tangent.x * arrowLength,
    y: dimensionEnd.y - tangent.y * arrowLength
  };
  const textPoint = {
    x: midpoint.x + normal.x * (offset + textHeight * 0.65),
    y: midpoint.y + normal.y * (offset + textHeight * 0.65)
  };

  return {
    angleDegrees,
    arrowSpread,
    dimensionEnd,
    dimensionStart,
    distance,
    end,
    endArrowBase,
    extensionOffset,
    normal,
    start,
    startArrowBase,
    textHeight,
    textPoint
  };
};

export const buildDistanceAnnotationEntities = (start: Point2D, end: Point2D, layer: string): DXFEntity[] => {
  const geometry = buildDistanceAnnotationGeometry(start, end);

  return [
    buildLineEntity(
      geometry.start,
      { x: geometry.start.x + geometry.extensionOffset.x, y: geometry.start.y + geometry.extensionOffset.y },
      layer
    ),
    buildLineEntity(
      geometry.end,
      { x: geometry.end.x + geometry.extensionOffset.x, y: geometry.end.y + geometry.extensionOffset.y },
      layer
    ),
    buildLineEntity(geometry.dimensionStart, geometry.dimensionEnd, layer),
    buildLineEntity(
      geometry.dimensionStart,
      {
        x: geometry.startArrowBase.x + geometry.normal.x * geometry.arrowSpread,
        y: geometry.startArrowBase.y + geometry.normal.y * geometry.arrowSpread
      },
      layer
    ),
    buildLineEntity(
      geometry.dimensionStart,
      {
        x: geometry.startArrowBase.x - geometry.normal.x * geometry.arrowSpread,
        y: geometry.startArrowBase.y - geometry.normal.y * geometry.arrowSpread
      },
      layer
    ),
    buildLineEntity(
      geometry.dimensionEnd,
      {
        x: geometry.endArrowBase.x + geometry.normal.x * geometry.arrowSpread,
        y: geometry.endArrowBase.y + geometry.normal.y * geometry.arrowSpread
      },
      layer
    ),
    buildLineEntity(
      geometry.dimensionEnd,
      {
        x: geometry.endArrowBase.x - geometry.normal.x * geometry.arrowSpread,
        y: geometry.endArrowBase.y - geometry.normal.y * geometry.arrowSpread
      },
      layer
    ),
    buildTextEntity(geometry.textPoint, geometry.distance.toFixed(3), layer, {
      height: geometry.textHeight,
      rotation: geometry.angleDegrees,
      horizontalAlign: 1,
      verticalAlign: 2,
      alignmentPoint: geometry.textPoint
    })
  ];
};

export const buildDistanceAnnotationPreview = (start: Point2D, end: Point2D): {
  points: PreviewPoint[];
  segments: PreviewSegment[];
} => {
  const geometry = buildDistanceAnnotationGeometry(start, end);
  const previewColor = '#f59e0b';
  const previewPointColor = '#2563eb';

  return {
    segments: [
      {
        start: geometry.start,
        end: { x: geometry.start.x + geometry.extensionOffset.x, y: geometry.start.y + geometry.extensionOffset.y },
        color: previewColor,
        dashed: true
      },
      {
        start: geometry.end,
        end: { x: geometry.end.x + geometry.extensionOffset.x, y: geometry.end.y + geometry.extensionOffset.y },
        color: previewColor,
        dashed: true
      },
      { start: geometry.dimensionStart, end: geometry.dimensionEnd, color: previewColor, dashed: true },
      {
        start: geometry.dimensionStart,
        end: {
          x: geometry.startArrowBase.x + geometry.normal.x * geometry.arrowSpread,
          y: geometry.startArrowBase.y + geometry.normal.y * geometry.arrowSpread
        },
        color: previewColor,
        dashed: true
      },
      {
        start: geometry.dimensionStart,
        end: {
          x: geometry.startArrowBase.x - geometry.normal.x * geometry.arrowSpread,
          y: geometry.startArrowBase.y - geometry.normal.y * geometry.arrowSpread
        },
        color: previewColor,
        dashed: true
      },
      {
        start: geometry.dimensionEnd,
        end: {
          x: geometry.endArrowBase.x + geometry.normal.x * geometry.arrowSpread,
          y: geometry.endArrowBase.y + geometry.normal.y * geometry.arrowSpread
        },
        color: previewColor,
        dashed: true
      },
      {
        start: geometry.dimensionEnd,
        end: {
          x: geometry.endArrowBase.x - geometry.normal.x * geometry.arrowSpread,
          y: geometry.endArrowBase.y - geometry.normal.y * geometry.arrowSpread
        },
        color: previewColor,
        dashed: true
      }
    ],
    points: [
      { point: geometry.start, color: previewPointColor, radius: 6 },
      { point: geometry.end, color: previewPointColor, radius: 6 },
      { point: geometry.textPoint, color: previewColor, radius: 4 }
    ]
  };
};

export const buildTextDrawingPreview = (
  point: Point2D,
  text: string,
  options?: {
    height?: number;
    rotationDegrees?: number;
    alignment?: DrawingTextAlignment;
    verticalAlignment?: DrawingTextVerticalAlignment;
  }
): PreviewText => ({
  point,
  text: text.trim() || 'Texto',
  color: '#f59e0b',
  fontSize: options?.height ?? 2.5,
  rotationDegrees: options?.rotationDegrees ?? 0,
  alignment: options?.alignment ?? 'left',
  verticalAlignment: options?.verticalAlignment ?? 'baseline'
});

export const buildDraftSegments = (vertices: Point2D[]) => {
  const segments: Array<{ start: Point2D; end: Point2D; color?: string; dashed?: boolean }> = [];
  for (let index = 0; index < vertices.length - 1; index += 1) {
    segments.push({
      start: vertices[index],
      end: vertices[index + 1],
      color: '#f59e0b',
      dashed: true
    });
  }
  return segments;
};

export const sampleQuadraticBezier = (start: Point2D, control: Point2D, end: Point2D, steps = 24): DXFVertex[] => {
  const vertices: DXFVertex[] = [];

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const invT = 1 - t;
    vertices.push({
      x: invT * invT * start.x + 2 * invT * t * control.x + t * t * end.x,
      y: invT * invT * start.y + 2 * invT * t * control.y + t * t * end.y
    });
  }

  return vertices;
};

const buildCirclePreviewPoints = (center: Point2D, edge: Point2D, steps = 48): Point2D[] => {
  const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
  if (radius <= 0.001) {
    return [];
  }

  return Array.from({ length: steps }, (_, index) => {
    const angle = (Math.PI * 2 * index) / steps;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    };
  });
};

export const isDrawingToolMode = (mode: EmbeddedCadToolMode) => DRAWING_TOOL_MODES.has(mode);

export const buildDrawingPreview = (
  mode: EmbeddedCadToolMode,
  draftPoints: Point2D[],
  hoverPoint: Point2D | null,
  options?: {
    closePointToPointShape?: boolean;
    drawingTextValue?: string;
    drawingTextHeight?: number;
    drawingTextRotation?: number;
    drawingTextAlignment?: DrawingTextAlignment;
    drawingTextVerticalAlignment?: DrawingTextVerticalAlignment;
  }
): {
  segments: PreviewSegment[];
  points: PreviewPoint[];
  textPreview: PreviewText | null;
} => {
  const closePointToPointShape = options?.closePointToPointShape ?? false;
  const drawingTextValue = options?.drawingTextValue ?? 'Texto';
  const drawingTextHeight = options?.drawingTextHeight ?? 2.5;
  const drawingTextRotation = options?.drawingTextRotation ?? 0;
  const drawingTextAlignment = options?.drawingTextAlignment ?? 'left';
  const drawingTextVerticalAlignment = options?.drawingTextVerticalAlignment ?? 'baseline';
  const points: PreviewPoint[] = draftPoints.map((point, index) => ({
    point,
    color: index === 0 ? '#2563eb' : '#f59e0b',
    radius: 6
  }));
  const segments: Array<{ start: Point2D; end: Point2D; color?: string; dashed?: boolean }> = [];

  if (!hoverPoint) {
    return { segments: [...segments, ...buildDraftSegments(draftPoints)], points, textPreview: null };
  }

  if (mode === 'line' || mode === 'distance') {
    const start = draftPoints[0];
    if (start) {
      if (mode === 'distance') {
        const distancePreview = buildDistanceAnnotationPreview(start, hoverPoint);
        segments.push(...distancePreview.segments);
        points.push(...distancePreview.points);
      } else {
        segments.push({ start, end: hoverPoint, color: '#f59e0b', dashed: true });
        points.push({ point: hoverPoint, color: '#f59e0b', radius: 6 });
      }
    }
    return { segments, points, textPreview: null };
  }

  if (mode === 'point-to-point') {
    segments.push(...buildDraftSegments(draftPoints));
    const start = draftPoints[draftPoints.length - 1];
    if (start) {
      segments.push({ start, end: hoverPoint, color: '#f59e0b', dashed: true });
      points.push({ point: hoverPoint, color: '#f59e0b', radius: 6 });
    }
    if (closePointToPointShape && draftPoints.length >= 2) {
      const firstPoint = draftPoints[0];
      const closingTarget = hoverPoint ?? firstPoint;
      const lastDraftPoint = hoverPoint ?? draftPoints[draftPoints.length - 1];
      if (firstPoint && lastDraftPoint && (firstPoint.x !== lastDraftPoint.x || firstPoint.y !== lastDraftPoint.y)) {
        segments.push({ start: lastDraftPoint, end: closingTarget, color: '#2563eb', dashed: true });
      }
    }
    return { segments, points, textPreview: null };
  }

  if (mode === 'rectangle') {
    const start = draftPoints[0];
    if (start) {
      const vertices = buildRectangleVertices(start, hoverPoint);
      for (let index = 0; index < vertices.length; index += 1) {
        segments.push({
          start: vertices[index],
          end: vertices[(index + 1) % vertices.length],
          color: '#f59e0b',
          dashed: true
        });
      }
      vertices.forEach((vertex) => points.push({ point: vertex, color: '#f59e0b', radius: 5 }));
    }
    return { segments, points, textPreview: null };
  }

  if (mode === 'circle') {
    const center = draftPoints[0];
    if (center) {
      const circlePoints = buildCirclePreviewPoints(center, hoverPoint);
      for (let index = 0; index < circlePoints.length; index += 1) {
        segments.push({
          start: circlePoints[index],
          end: circlePoints[(index + 1) % circlePoints.length],
          color: '#f59e0b',
          dashed: true
        });
      }
      segments.push({ start: center, end: hoverPoint, color: '#94a3b8', dashed: true });
      points.push({ point: hoverPoint, color: '#f59e0b', radius: 5 });
    }
    return { segments, points, textPreview: null };
  }

  if (mode === 'bezier') {
    const [start, control] = draftPoints;
    if (start && !control) {
      segments.push({ start, end: hoverPoint, color: '#f59e0b', dashed: true });
      points.push({ point: hoverPoint, color: '#f59e0b', radius: 5 });
      return { segments, points, textPreview: null };
    }

    if (start && control) {
      const curveVertices = sampleQuadraticBezier(start, control, hoverPoint);
      for (let index = 0; index < curveVertices.length - 1; index += 1) {
        segments.push({
          start: curveVertices[index],
          end: curveVertices[index + 1],
          color: '#f59e0b',
          dashed: true
        });
      }
      segments.push({ start, end: control, color: '#94a3b8', dashed: true });
      segments.push({ start: control, end: hoverPoint, color: '#94a3b8', dashed: true });
      points.push({ point: control, color: '#2563eb', radius: 5 });
      points.push({ point: hoverPoint, color: '#f59e0b', radius: 5 });
    }
    return { segments, points, textPreview: null };
  }

  if (mode === 'text') {
    points.push({ point: hoverPoint, color: '#f59e0b', radius: 5 });
    return {
      segments,
      points,
      textPreview: buildTextDrawingPreview(hoverPoint, drawingTextValue, {
        height: drawingTextHeight,
        rotationDegrees: drawingTextRotation,
        alignment: drawingTextAlignment,
        verticalAlignment: drawingTextVerticalAlignment
      })
    };
  }

  return { segments, points, textPreview: null };
};


