import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { DXFData, DXFEntity, DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';
import type { EntityBounds } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import { buildPolylineSamplePoints, polylineHasBulgeVertices } from '@/graphics-engine/components/viewer-dxf/dxfGeometryUtils';

export type SelectionHandleKind = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

export type EntityPreviewTransform =
  | {
      mode: 'translate';
      deltaX: number;
      deltaY: number;
    }
  | {
      mode: 'scale';
      origin: Point2D;
      scaleX: number;
      scaleY: number;
    }
  | {
      mode: 'rotate';
      origin: Point2D;
      rotationDegrees: number;
    };

export interface SelectionFrame {
  rectLeft: number;
  rectTop: number;
  rectWidth: number;
  rectHeight: number;
  handleRadius: number;
  rotationHandleOffset: number;
  center: Point2D;
}

export interface SelectionHandleInfo {
  kind: SelectionHandleKind;
  point: Point2D;
  cursor: string;
}

const MIN_SCALE_ABS = 0.05;
const MAX_SCALE_ABS = 100;
const ROTATION_SNAP_STEP_DEGREES = 15;

const buildCursorDataUri = (svg: string, fallback: string): string => (
  `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 12 12, ${fallback}`
);

const buildCornerResizeCursor = (direction: 'nwse' | 'nesw'): string => {
  const diagonalPath = direction === 'nwse'
    ? 'M6 18 L18 6'
    : 'M6 6 L18 18';
  const startArrow = direction === 'nwse'
    ? 'M6 18 L6 13 M6 18 L11 18'
    : 'M6 6 L6 11 M6 6 L11 6';
  const endArrow = direction === 'nwse'
    ? 'M18 6 L13 6 M18 6 L18 11'
    : 'M18 18 L13 18 M18 18 L18 13';

  return buildCursorDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <rect x="0" y="0" width="24" height="24" fill="white" fill-opacity="0"/>
      <path d="${diagonalPath}" stroke="#2563eb" stroke-width="1.9" stroke-linecap="round"/>
      <path d="${startArrow}" stroke="#2563eb" stroke-width="1.9" stroke-linecap="round"/>
      <path d="${endArrow}" stroke="#2563eb" stroke-width="1.9" stroke-linecap="round"/>
      <circle cx="12" cy="12" r="1.6" fill="#2563eb"/>
    </svg>`,
    direction === 'nwse' ? 'nwse-resize' : 'nesw-resize'
  );
};

const buildRotateCursor = (): string => (
  buildCursorDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <rect x="0" y="0" width="24" height="24" fill="white" fill-opacity="0"/>
      <path d="M8.5 8.5a5 5 0 1 1-1 7.7" fill="none" stroke="#c2410c" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M6.2 8.2 L10.2 8.2 L10.2 4.2" fill="none" stroke="#c2410c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="1.5" fill="#c2410c"/>
    </svg>`,
    'grab'
  )
);

const CORNER_CURSOR_NWSE = buildCornerResizeCursor('nwse');
const CORNER_CURSOR_NESW = buildCornerResizeCursor('nesw');
const ROTATE_CURSOR = buildRotateCursor();

const clampScaleComponent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  const sign = value < 0 ? -1 : 1;
  const magnitude = Math.min(MAX_SCALE_ABS, Math.max(MIN_SCALE_ABS, Math.abs(value)));
  return magnitude * sign;
};

const toRadians = (degrees: number) => degrees * (Math.PI / 180);

export const applyPreviewTransformToPoint = (point: Point2D, previewTransform?: EntityPreviewTransform | null): Point2D => {
  if (!previewTransform) {
    return point;
  }

  if (previewTransform.mode === 'translate') {
    return {
      x: point.x + previewTransform.deltaX,
      y: point.y + previewTransform.deltaY
    };
  }

  if (previewTransform.mode === 'scale') {
    return {
      x: previewTransform.origin.x + (point.x - previewTransform.origin.x) * previewTransform.scaleX,
      y: previewTransform.origin.y + (point.y - previewTransform.origin.y) * previewTransform.scaleY
    };
  }

  const angle = toRadians(previewTransform.rotationDegrees);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - previewTransform.origin.x;
  const dy = point.y - previewTransform.origin.y;
  return {
    x: previewTransform.origin.x + dx * cos - dy * sin,
    y: previewTransform.origin.y + dx * sin + dy * cos
  };
};

const cloneTransformedVertex = (vertex: DXFVertex, previewTransform?: EntityPreviewTransform | null): DXFVertex => {
  const transformedPoint = applyPreviewTransformToPoint(vertex, previewTransform);
  return {
    ...vertex,
    x: transformedPoint.x,
    y: transformedPoint.y
  };
};

const isUniformScaleTransform = (previewTransform?: EntityPreviewTransform | null): boolean => (
  previewTransform?.mode !== 'scale'
  || Math.abs(Math.abs(previewTransform.scaleX) - Math.abs(previewTransform.scaleY)) <= 0.001
);

const buildTransformedPolylineVertices = (
  vertices: DXFVertex[] | undefined,
  previewTransform?: EntityPreviewTransform | null
): { vertices: DXFVertex[] | undefined; materializedFromBulge: boolean } => {
  if (!vertices) {
    return { vertices: undefined, materializedFromBulge: false };
  }

  if (polylineHasBulgeVertices(vertices) && !isUniformScaleTransform(previewTransform)) {
    const sampledPoints = buildPolylineSamplePoints(vertices, false);
    return {
      vertices: sampledPoints.map((point) => {
        const transformedPoint = applyPreviewTransformToPoint(point, previewTransform);
        return { x: transformedPoint.x, y: transformedPoint.y };
      }),
      materializedFromBulge: true
    };
  }

  return {
    vertices: vertices.map((vertex) => cloneTransformedVertex(vertex, previewTransform)),
    materializedFromBulge: false
  };
};

const transformPointFields = (
  props: DXFEntityProperties,
  previewTransform?: EntityPreviewTransform | null
): Pick<DXFEntityProperties, 'x' | 'y' | 'x1' | 'y1' | 'x2' | 'y2' | 'centerX' | 'centerY' | 'alignmentX' | 'alignmentY' | 'editorCurveControl1X' | 'editorCurveControl1Y' | 'editorCurveControl2X' | 'editorCurveControl2Y'> => {
  const transformXY = (x?: number, y?: number) => {
    if (typeof x !== 'number' || typeof y !== 'number') {
      return null;
    }
    return applyPreviewTransformToPoint({ x, y }, previewTransform);
  };

  const point = transformXY(props.x, props.y);
  const p1 = transformXY(props.x1, props.y1);
  const p2 = transformXY(props.x2, props.y2);
  const center = transformXY(props.centerX, props.centerY);
  const alignment = transformXY(props.alignmentX, props.alignmentY);
  const curveControl1 = transformXY(props.editorCurveControl1X, props.editorCurveControl1Y);
  const curveControl2 = transformXY(props.editorCurveControl2X, props.editorCurveControl2Y);

  return {
    x: point?.x ?? props.x,
    y: point?.y ?? props.y,
    x1: p1?.x ?? props.x1,
    y1: p1?.y ?? props.y1,
    x2: p2?.x ?? props.x2,
    y2: p2?.y ?? props.y2,
    centerX: center?.x ?? props.centerX,
    centerY: center?.y ?? props.centerY,
    alignmentX: alignment?.x ?? props.alignmentX,
    alignmentY: alignment?.y ?? props.alignmentY,
    editorCurveControl1X: curveControl1?.x ?? props.editorCurveControl1X,
    editorCurveControl1Y: curveControl1?.y ?? props.editorCurveControl1Y,
    editorCurveControl2X: curveControl2?.x ?? props.editorCurveControl2X,
    editorCurveControl2Y: curveControl2?.y ?? props.editorCurveControl2Y
  };
};

const getUniformScaleMagnitude = (previewTransform?: EntityPreviewTransform | null): number => {
  if (!previewTransform || previewTransform.mode !== 'scale') {
    return 1;
  }

  return (Math.abs(previewTransform.scaleX) + Math.abs(previewTransform.scaleY)) / 2;
};

export const applyPreviewTransformToEntity = (entity: DXFEntity, previewTransform?: EntityPreviewTransform | null): DXFEntity => {
  if (!previewTransform) {
    return entity;
  }

  const props = entity.properties as DXFEntityProperties;
  const transformedPoints = transformPointFields(props, previewTransform);
  const uniformScale = getUniformScaleMagnitude(previewTransform);
  const transformedPolyline = buildTransformedPolylineVertices(props.vertices, previewTransform);
  const nextProperties: DXFEntityProperties = {
    ...props,
    ...transformedPoints,
    vertices: transformedPolyline.vertices
  };

  if (transformedPolyline.materializedFromBulge) {
    delete nextProperties.code_42;
  }

  if (transformedPolyline.vertices) {
    nextProperties.vertexCount = transformedPolyline.vertices.length;
  }

  if (typeof props.radius === 'number') {
    nextProperties.radius = props.radius * uniformScale;
  }

  if (typeof props.height === 'number' && previewTransform.mode === 'scale') {
    nextProperties.height = props.height * uniformScale;
  }

  if (typeof props.textHeight === 'number' && previewTransform.mode === 'scale') {
    nextProperties.textHeight = props.textHeight * uniformScale;
  }

  if (typeof props.mtextWidth === 'number' && previewTransform.mode === 'scale') {
    nextProperties.mtextWidth = props.mtextWidth * Math.abs(previewTransform.scaleX);
  }

  if (typeof props.widthFactor === 'number' && previewTransform.mode === 'scale') {
    nextProperties.widthFactor = props.widthFactor * Math.abs(previewTransform.scaleX);
  }

  if (previewTransform.mode === 'rotate' && typeof props.rotation === 'number') {
    nextProperties.rotation = (props.rotation + previewTransform.rotationDegrees + 360) % 360;
  }

  if (previewTransform.mode === 'rotate' && typeof props.startAngle === 'number') {
    nextProperties.startAngle = props.startAngle + previewTransform.rotationDegrees;
  }

  if (previewTransform.mode === 'rotate' && typeof props.endAngle === 'number') {
    nextProperties.endAngle = props.endAngle + previewTransform.rotationDegrees;
  }

  return {
    ...entity,
    properties: nextProperties
  };
};

const collectEntityPoints = (entity: DXFEntity): Point2D[] => {
  const props = entity.properties as DXFEntityProperties;

  if (props.vertices?.length) {
    return props.vertices;
  }

  const points: Point2D[] = [];
  if (typeof props.x1 === 'number' && typeof props.y1 === 'number') {
    points.push({ x: props.x1, y: props.y1 });
  }
  if (typeof props.x2 === 'number' && typeof props.y2 === 'number') {
    points.push({ x: props.x2, y: props.y2 });
  }
  if (typeof props.x === 'number' && typeof props.y === 'number') {
    points.push({ x: props.x, y: props.y });
  }
  if (typeof props.alignmentX === 'number' && typeof props.alignmentY === 'number') {
    points.push({ x: props.alignmentX, y: props.alignmentY });
  }
  if (typeof props.centerX === 'number' && typeof props.centerY === 'number') {
    const center = { x: props.centerX, y: props.centerY };
    points.push(center);
    if (typeof props.radius === 'number' && props.radius > 0) {
      points.push({ x: center.x - props.radius, y: center.y });
      points.push({ x: center.x + props.radius, y: center.y });
      points.push({ x: center.x, y: center.y - props.radius });
      points.push({ x: center.x, y: center.y + props.radius });
    }
  }
  return points;
};

export const getEntityBoundsWithPreview = (entity: DXFEntity, previewTransform?: EntityPreviewTransform | null): EntityBounds | null => {
  const points = collectEntityPoints(entity).map((point) => applyPreviewTransformToPoint(point, previewTransform));
  if (points.length === 0) {
    return null;
  }

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y))
  };
};

export const getSelectionFrame = (bounds: EntityBounds, viewScale: number): SelectionFrame => {
  const safeScale = Math.max(viewScale, 0.0001);
  const selectionPadding = 10 / safeScale;
  const rectLeft = bounds.minX - selectionPadding;
  const rectTop = bounds.minY - selectionPadding;
  const rectWidth = Math.max(bounds.maxX - bounds.minX, 0) + selectionPadding * 2;
  const rectHeight = Math.max(bounds.maxY - bounds.minY, 0) + selectionPadding * 2;
  return {
    rectLeft,
    rectTop,
    rectWidth,
    rectHeight,
    handleRadius: 4.5 / safeScale,
    rotationHandleOffset: 18 / safeScale,
    center: {
      x: rectLeft + rectWidth / 2,
      y: rectTop + rectHeight / 2
    }
  };
};

export const getSelectionHandleCursor = (
  handleKind: SelectionHandleKind,
  rotationMode = false
): string => {
  if (rotationMode || handleKind === 'rotate') {
    return ROTATE_CURSOR;
  }

  switch (handleKind) {
    case 'nw':
    case 'se':
      return CORNER_CURSOR_NWSE;
    case 'ne':
    case 'sw':
      return CORNER_CURSOR_NESW;
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    default:
      return 'default';
  }
};

export const getSelectionHandleInfos = (
  bounds: EntityBounds,
  viewScale: number,
  rotationMode = false
): SelectionHandleInfo[] => {
  const frame = getSelectionFrame(bounds, viewScale);
  const right = frame.rectLeft + frame.rectWidth;
  const bottom = frame.rectTop + frame.rectHeight;
  const centerX = frame.center.x;
  const centerY = frame.center.y;

  return [
    { kind: 'nw', point: { x: frame.rectLeft, y: frame.rectTop }, cursor: getSelectionHandleCursor('nw', rotationMode) },
    { kind: 'n', point: { x: centerX, y: frame.rectTop }, cursor: getSelectionHandleCursor('n', rotationMode) },
    { kind: 'ne', point: { x: right, y: frame.rectTop }, cursor: getSelectionHandleCursor('ne', rotationMode) },
    { kind: 'e', point: { x: right, y: centerY }, cursor: getSelectionHandleCursor('e', rotationMode) },
    { kind: 'se', point: { x: right, y: bottom }, cursor: getSelectionHandleCursor('se', rotationMode) },
    { kind: 's', point: { x: centerX, y: bottom }, cursor: getSelectionHandleCursor('s', rotationMode) },
    { kind: 'sw', point: { x: frame.rectLeft, y: bottom }, cursor: getSelectionHandleCursor('sw', rotationMode) },
    { kind: 'w', point: { x: frame.rectLeft, y: centerY }, cursor: getSelectionHandleCursor('w', rotationMode) },
    { kind: 'rotate', point: { x: centerX, y: frame.rectTop - frame.rotationHandleOffset }, cursor: getSelectionHandleCursor('rotate', true) }
  ];
};

export const findSelectionHandle = (bounds: EntityBounds, viewScale: number, point: Point2D): SelectionHandleInfo | null => {
  const frame = getSelectionFrame(bounds, viewScale);
  const pickRadius = Math.max(frame.handleRadius * 1.85, 8 / Math.max(viewScale, 0.0001));
  const handles = getSelectionHandleInfos(bounds, viewScale);

  let nearestHandle: SelectionHandleInfo | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  handles.forEach((handle) => {
    const dx = handle.point.x - point.x;
    const dy = handle.point.y - point.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= pickRadius && distance < nearestDistance) {
      nearestHandle = handle;
      nearestDistance = distance;
    }
  });

  return nearestHandle;
};

const getScaleAnchorPoint = (frame: SelectionFrame, handleKind: Exclude<SelectionHandleKind, 'rotate'>): Point2D => {
  const right = frame.rectLeft + frame.rectWidth;
  const bottom = frame.rectTop + frame.rectHeight;
  const centerX = frame.center.x;
  const centerY = frame.center.y;

  switch (handleKind) {
    case 'nw':
      return { x: right, y: bottom };
    case 'n':
      return { x: centerX, y: bottom };
    case 'ne':
      return { x: frame.rectLeft, y: bottom };
    case 'e':
      return { x: frame.rectLeft, y: centerY };
    case 'se':
      return { x: frame.rectLeft, y: frame.rectTop };
    case 's':
      return { x: centerX, y: frame.rectTop };
    case 'sw':
      return { x: right, y: frame.rectTop };
    case 'w':
      return { x: right, y: centerY };
    default:
      return frame.center;
  }
};

const getHandlePointByKind = (bounds: EntityBounds, viewScale: number, handleKind: Exclude<SelectionHandleKind, 'rotate'>): Point2D => (
  getSelectionHandleInfos(bounds, viewScale).find((handle) => handle.kind === handleKind)?.point || getSelectionFrame(bounds, viewScale).center
);

export const buildScalePreviewTransform = (
  bounds: EntityBounds,
  viewScale: number,
  handleKind: Exclude<SelectionHandleKind, 'rotate'>,
  currentPoint: Point2D,
  proportional = false
): EntityPreviewTransform => {
  const frame = getSelectionFrame(bounds, viewScale);
  const anchor = getScaleAnchorPoint(frame, handleKind);
  const initialHandlePoint = getHandlePointByKind(bounds, viewScale, handleKind);
  const usesXAxis = handleKind.includes('e') || handleKind.includes('w');
  const usesYAxis = handleKind.includes('n') || handleKind.includes('s');
  const initialDx = initialHandlePoint.x - anchor.x;
  const initialDy = initialHandlePoint.y - anchor.y;
  const currentDx = currentPoint.x - anchor.x;
  const currentDy = currentPoint.y - anchor.y;
  const rawScaleX = usesXAxis && Math.abs(initialDx) > 0.0001
    ? currentDx / initialDx
    : null;
  const rawScaleY = usesYAxis && Math.abs(initialDy) > 0.0001
    ? currentDy / initialDy
    : null;

  const getUniformScale = () => {
    const candidates = [rawScaleX, rawScaleY].filter((value): value is number => value !== null && Number.isFinite(value));
    if (candidates.length === 0) {
      return 1;
    }

    const dominantCandidate = candidates.reduce((best, candidate) => (
      Math.abs(Math.abs(candidate) - 1) > Math.abs(Math.abs(best) - 1) ? candidate : best
    ), candidates[0]);
    return clampScaleComponent(dominantCandidate);
  };

  const uniformScale = proportional ? getUniformScale() : 1;
  const scaleX = proportional
    ? uniformScale
    : (rawScaleX !== null ? clampScaleComponent(rawScaleX) : 1);
  const scaleY = proportional
    ? uniformScale
    : (rawScaleY !== null ? clampScaleComponent(rawScaleY) : 1);

  return {
    mode: 'scale',
    origin: anchor,
    scaleX,
    scaleY
  };
};

export const buildRotationPreviewTransform = (
  bounds: EntityBounds,
  startPoint: Point2D,
  currentPoint: Point2D,
  snapToStep = false
): EntityPreviewTransform => {
  const origin = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2
  };
  const startAngle = Math.atan2(startPoint.y - origin.y, startPoint.x - origin.x);
  const currentAngle = Math.atan2(currentPoint.y - origin.y, currentPoint.x - origin.x);
  const rawRotationDegrees = (currentAngle - startAngle) * (180 / Math.PI);
  const rotationDegrees = snapToStep
    ? Math.round(rawRotationDegrees / ROTATION_SNAP_STEP_DEGREES) * ROTATION_SNAP_STEP_DEGREES
    : rawRotationDegrees;

  return {
    mode: 'rotate',
    origin,
    rotationDegrees
  };
};

export const applyPreviewTransformToSelection = (
  data: DXFData,
  selectedIndexes: Set<number>,
  previewTransform?: EntityPreviewTransform | null
): DXFEntity[] => data.entities.map((entity, index) => (
  selectedIndexes.has(index)
    ? applyPreviewTransformToEntity(entity, previewTransform)
    : entity
));

