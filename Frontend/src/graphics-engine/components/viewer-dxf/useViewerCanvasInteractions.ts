import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { calculateDistance, calculatePolygonArea, findNearestPoint } from '@/graphics-engine/shared/geometry';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { DXFData, DXFEntity } from '@/graphics-engine/shared/dxf';
import type { CorrectiveTool, ViewerMode } from '@/graphics-engine/shared/corrective';
import {
  buildEntitySelectionId,
  getEntityBounds,
  buildSelectedTextId,
  extractTextPosition,
  isTextLikeEntity
} from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import {
  findSelectionHandle,
  getSelectionHandleCursor,
  type SelectionHandleInfo,
  type SelectionHandleKind
} from '@/graphics-engine/components/viewer-dxf/selectionTransformUtils';
import {
  getPolygonEdges,
  getSegmentSnapCandidates,
  isPointInPolygon,
  pointToSegmentDistance
} from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import {
  extractLotNumberFromTexts,
  summarizePolygonTexts
} from '@/graphics-engine/components/viewer-dxf/lotSelectionUtils';
import {
  buildDistanceAnnotationEntities,
  buildCircleEntity,
  buildLineEntity,
  buildPointEntity,
  buildPolylineEntity,
  buildRectangleVertices,
  buildTextEntity,
  DEFAULT_DRAWING_LAYER,
  getTextHorizontalAlignCode,
  getTextVerticalAlignCode,
  isDrawingToolMode,
  sampleQuadraticBezier
} from '@/graphics-engine/components/viewer-dxf/cadDrawingUtils';
import type {
  HoverConfrontationText,
  HoverReferencePoint,
  SegmentConfrontationAnnotation,
  SelectedConfrontationText,
  ViewerSelectedEntityInfo
} from '@/graphics-engine/components/viewer-dxf/viewerState';
import type {
  DrawingTextAlignment,
  DrawingTextVerticalAlignment,
  EmbeddedCadToolMode,
  ViewerEntitiesDrawnPayload,
  ViewerSnapGuide,
  ViewerTextPlacementRequest
} from '@/graphics-engine/components/viewer-dxf/viewerContracts';
import type { ManualReviewLotSelectionPayload } from '@/graphics-engine/shared/viewer-corrective';
import { sendSelectionDebug } from '@/utils/memorialDocument';

const SHIFT_CLICK_DEDUP_MS = 300;
const SHIFT_CLICK_DEDUP_DISTANCE = 1.5;
const CONFRONTATION_SEGMENT_SNAP_PX = 12;
const CONFRONTATION_SEGMENT_CONTINUITY_SNAP_PX = 7;
const ENTITY_DRAG_START_THRESHOLD_PX = 4;
const POST_DRAW_OBJECT_SNAP_COOLDOWN_MS = 220;
const GUIDE_SNAP_DISTANCE_PX = 20;
const BOX_SELECTION_START_THRESHOLD_PX = 6;
const DIRECT_SEGMENT_TEXT = 'Sem confrontante definido';
const DIRECT_SEGMENT_LAYER = 'CONFRONTACAO_DIRETA';
const DIRECT_SEGMENT_ENTITY_TYPE = 'SEGMENTO_DIRETO';
const DETECTED_VERTEX_CANONICAL_TOLERANCE = 0.01;

interface SegmentContextMenuState {
  open: boolean;
  x: number;
  y: number;
  nearestSegmentId: string | null;
}

const buildDirectSegmentAnnotation = (startPoint: Point2D, endPoint: Point2D): SegmentConfrontationAnnotation => ({
  id: `direct-segment|${startPoint.x.toFixed(3)}|${startPoint.y.toFixed(3)}|${endPoint.x.toFixed(3)}|${endPoint.y.toFixed(3)}`,
  sourceTextId: `direct-segment|${startPoint.x.toFixed(3)}|${startPoint.y.toFixed(3)}|${endPoint.x.toFixed(3)}|${endPoint.y.toFixed(3)}`,
  text: DIRECT_SEGMENT_TEXT,
  layer: DIRECT_SEGMENT_LAYER,
  entityType: DIRECT_SEGMENT_ENTITY_TYPE,
  selectionMode: 'segment-direct',
  startPoint,
  endPoint
});
const POINT_EQUALITY_TOLERANCE = 0.001;

export interface ViewerCanvasInteractionsMessages {
  selectSegmentsBeforeCheckNotice: string;
  buildContourClosedNotice: (params: { segmentCount: number }) => string;
  buildContourOpenNotice: (params: { openNodeCount: number; closestGapDistance: number | null }) => string;
  invalidContourNotice: string;
  selectSegmentsBeforeCloseNotice: string;
  alreadyClosedNotice: string;
  buildAutoCloseFailureNotice: (params: { openNodeCount: number }) => string;
  buildBridgeCreatedNotice: (params: { distance: number }) => string;
  cancelEmbeddedDrawingNotice: string;
  buildPointToPointCreatedNotice: (params: {
    isClosed: boolean;
    vertexCount: number;
    layerName: string;
  }) => string;
  pointToPointClosedAtFirstVertexNotice: string;
  buildPointCreatedNotice: (params: { point: Point2D }) => string;
  defaultTextValue: string;
  buildTextInsertedNotice: (params: {
    layerName: string;
    height: number;
    rotation: number;
    alignment: string;
    verticalAlignment: string;
  }) => string;
  buildDistanceCreatedNotice: (params: { distance: number; layerName: string }) => string;
  buildLineCreatedNotice: (params: { layerName: string }) => string;
  buildCircleCreatedNotice: (params: { layerName: string }) => string;
  buildRectangleCreatedNotice: (params: { layerName: string }) => string;
  buildBezierCreatedNotice: (params: { layerName: string }) => string;
  defaultAnnotationLayerName: string;
  defaultTextAnnotationLayerName: string;
}

interface UseViewerCanvasInteractionsParams {
  activeToolId?: string;
  activeConfrontationTextId: string | null;
  activeCorrectiveTool: CorrectiveTool;
  activeLayerName?: string;
  annotationLayerName?: string;
  textAnnotationLayerName?: string;
  textUsesAnnotationLayer?: boolean;
  drawingTextHeight?: number;
  drawingTextRotation?: number;
  drawingTextAlignment?: DrawingTextAlignment;
  drawingTextVerticalAlignment?: DrawingTextVerticalAlignment;
  analyzeSegmentSet: (segmentsToAnalyze: Array<{ p1: Point2D; p2: Point2D }>) => {
    isClosed: boolean;
    openNodes: Point2D[];
    invalidNodes: Point2D[];
    closestGap: { a: Point2D; b: Point2D; distance: number } | null;
  };
  applyCloseGapGuidedCorrection: (params: {
    polygonIndex: number;
    firstIndex: number;
    secondIndex: number;
    lotNumber: number | null;
    operationId: string;
    label: string;
  }) => boolean;
  applyJoinEndpointsCorrection: (params: {
    polygonIndex: number;
    firstIndex: number;
    secondIndex: number;
    lotNumber: number | null;
    operationId: string;
    label: string;
  }) => boolean;
  applyMoveVertexCorrection: (params: {
    polygonIndex: number;
    vertexIndex: number;
    targetPoint: Point2D;
    lotNumber: number | null;
    operationId: string;
    label: string;
  }) => boolean;
  activeEditNodeDrag: { currentPoint: Point2D } | null;
  beginEditNodeDragAtPoint: (point: Point2D) => boolean;
  beginEntityDrag: (nearestEntity: ViewerSelectedEntityInfo, startPoint: Point2D) => void;
  beginEntityTransform: (params: {
    entity: ViewerSelectedEntityInfo;
    startPoint: Point2D;
    handle: SelectionHandleKind;
  }) => boolean;
  cancelEditNodeDrag: () => void;
  commitEditNodeDrag: () => boolean;
  updateEditNodeDrag: (point: Point2D) => void;
  commitMirrorSelection: () => boolean;
  commitOffsetPreviewAtPoint: (point: Point2D) => boolean;
  commitExtendPreviewAtPoint: (point: Point2D) => boolean;
  commitTrimPreviewAtPoint: (point: Point2D) => boolean;
  hasExtendPreview: boolean;
  hasTrimPreview: boolean;
  commitWeldSelection: () => boolean;
  commitEntityCopy: (endPoint: Point2D) => { deltaX: number; deltaY: number } | null;
  commitEntityDrag: (endPoint: Point2D) => { deltaX: number; deltaY: number } | null;
  commitEntityTransform: () => boolean;
  correctiveFocusLotNumber: number | null;
  correctiveFocusPolygon: Point2D[] | null;
  correctiveFocusPolygonIndex: number;
  closePointToPointShape?: boolean;
  canInteractWithEntity?: (entity: DXFEntity) => boolean;
  detectedPolygons: Point2D[][];
  activeEntityTransform: {
    handle: SelectionHandleKind;
  } | null;
  draggingSelectedEntities: { startPoint: Point2D } | null;
  drawingTextValue: string;
  dxfData: DXFData | null;
  entityMultiSelectModeActive: boolean;
  embeddedMode: boolean;
  embeddedDrawingPoints: Point2D[];
  embeddedToolMode: EmbeddedCadToolMode;
  enableGridSnap?: boolean;
  enableObjectSnap?: boolean;
  endEntityTransform: () => void;
  endEntityDrag: () => void;
  findNearestRawSegment: (point: Point2D) => { id: string } | null;
  findNearestSelectableEntity: (point: Point2D) => ViewerSelectedEntityInfo | null;
  getDxfCoords: (clientX: number, clientY: number) => Point2D | null;
  handleEmbeddedEntitySelection: (nearestEntity: ViewerSelectedEntityInfo | null, additiveSelection: boolean) => void;
  hoverPoint: Point2D | null;
  hoverPolygon: Point2D[] | null;
  hoverSegmentTargetPoint: Point2D | null;
  interactive?: boolean;
  isDragging: boolean;
  isEditNodeHandleAtPoint: (point: Point2D) => boolean;
  lastShiftInteractionRef: React.MutableRefObject<{ x: number; y: number; ts: number } | null>;
  manualReviewLotNumbers?: number[];
  manualPolygon: Point2D[];
  partialScopePolygons: Point2D[][];
  primaryBoundaryReady?: boolean;
  allowLotSelectionWithoutPrimaryBoundary?: boolean;
  matchedReferencePoints: HoverReferencePoint[];
  scale: number;
  gridSnapSize?: number;
  gridOrigin?: Point2D;
  segmentContextMenu: SegmentContextMenuState;
  selectedConfrontationTexts: SelectedConfrontationText[];
  selectedCorrectiveVertex: { polygonIndex: number; vertexIndex: number } | null;
  selectedCorrectiveVertexPoint: Point2D | null;
  selectedEntities: ViewerSelectedEntityInfo[];
  selectedEntityIds: string[];
  selectedSegments: Array<{ p1: Point2D; p2: Point2D }>;
  pendingConfrontationSegmentPoints: Point2D[];
  segmentAnnotations: SegmentConfrontationAnnotation[];
  setSelectedEntityIds: React.Dispatch<React.SetStateAction<string[]>>;
  setEntitySelectionBox: React.Dispatch<React.SetStateAction<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>>;
  setZoomSelectionBox: React.Dispatch<React.SetStateAction<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>>;
  snapGuides?: ViewerSnapGuide[];
  onEntitiesDrawn?: (payload: ViewerEntitiesDrawnPayload) => void;
  onManualReviewLotSelectionChange?: (payload: ManualReviewLotSelectionPayload) => void;
  onTextPlacementRequest?: (payload: ViewerTextPlacementRequest) => void;
  setActiveConfrontationTextId: React.Dispatch<React.SetStateAction<string | null>>;
  setCorrectiveTargetPoint: React.Dispatch<React.SetStateAction<Point2D | null>>;
  setEmbeddedDrawingPoints: React.Dispatch<React.SetStateAction<Point2D[]>>;
  setHoverConfrontationText: React.Dispatch<React.SetStateAction<HoverConfrontationText | null>>;
  setHoverPoint: React.Dispatch<React.SetStateAction<Point2D | null>>;
  setHoverPolygon: React.Dispatch<React.SetStateAction<Point2D[] | null>>;
  setHoverReferencePoint: React.Dispatch<React.SetStateAction<HoverReferencePoint | null>>;
  setHoverSegmentTargetPoint: React.Dispatch<React.SetStateAction<Point2D | null>>;
  setIsHoveringText: React.Dispatch<React.SetStateAction<boolean>>;
  setManualBridgeSegments: React.Dispatch<React.SetStateAction<Array<{ p1: Point2D; p2: Point2D }>>>;
  setManualPolygon: React.Dispatch<React.SetStateAction<Point2D[]>>;
  setPartialScopePolygons: React.Dispatch<React.SetStateAction<Point2D[][]>>;
  setPendingConfrontationSegmentPoints: React.Dispatch<React.SetStateAction<Point2D[]>>;
  setSegmentAnnotations: React.Dispatch<React.SetStateAction<SegmentConfrontationAnnotation[]>>;
  setSegmentContextMenu: React.Dispatch<React.SetStateAction<SegmentContextMenuState>>;
  setSegmentInspectorMessage: React.Dispatch<React.SetStateAction<string>>;
  setSelectedCloseGapVertices: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedConfrontationTexts: React.Dispatch<React.SetStateAction<SelectedConfrontationText[]>>;
  setSelectedCorrectiveVertex: React.Dispatch<React.SetStateAction<{ polygonIndex: number; vertexIndex: number } | null>>;
  setSelectedJoinVertices: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedPolygons: React.Dispatch<React.SetStateAction<Point2D[][]>>;
  setSelectedSegmentIds: React.Dispatch<React.SetStateAction<string[]>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  zoomToArea: (startPoint: Point2D, endPoint: Point2D) => boolean;
  zoomToPoint: (point: Point2D, factor: number) => boolean;
  startPanDrag: (clientX: number, clientY: number) => void;
  stopPanDrag: () => void;
  suppressNextCanvasClickRef: React.MutableRefObject<boolean>;
  updateEntityDragPreview: (currentPoint: Point2D) => void;
  updateEntityTransformPreview: (currentPoint: Point2D, forceRotate?: boolean, proportional?: boolean, snapRotation?: boolean) => void;
  updatePanDrag: (clientX: number, clientY: number) => void;
  validPoints: Point2D[];
  viewerMode: ViewerMode;
  messages?: ViewerCanvasInteractionsMessages;
}

const DEFAULT_VIEWER_INTERACTION_MESSAGES: NonNullable<UseViewerCanvasInteractionsParams['messages']> = {
  selectSegmentsBeforeCheckNotice: 'Selecione um ou mais segmentos antes de verificar.',
  buildContourClosedNotice: ({ segmentCount }) => `Contorno fechado ✅ (${segmentCount} segmento(s))`,
  buildContourOpenNotice: ({ openNodeCount, closestGapDistance }) => `Contorno aberto ❌ (${openNodeCount} ponta(s) solta(s)).${closestGapDistance !== null ? ` Gap ~${closestGapDistance.toFixed(3)}` : ''}`,
  invalidContourNotice: 'Contorno invalido (ramificacoes ou cruzamentos).',
  selectSegmentsBeforeCloseNotice: 'Selecione segmentos do contorno antes de fechar.',
  alreadyClosedNotice: 'Ja esta fechado ✅',
  buildAutoCloseFailureNotice: ({ openNodeCount }) => `Nao foi possivel fechar automaticamente (pontas soltas: ${openNodeCount}).`,
  buildBridgeCreatedNotice: ({ distance }) => `Ponte criada para fechar (distancia ${distance.toFixed(3)}).`,
  cancelEmbeddedDrawingNotice: 'Rascunho de desenho cancelado.',
  buildPointToPointCreatedNotice: ({ isClosed, vertexCount, layerName }) => `${isClosed ? 'Contorno fechado' : 'Polilinha'} criado com ${vertexCount} vertices na camada ${layerName}.`,
  pointToPointClosedAtFirstVertexNotice: 'Contorno fechado ao retornar ao primeiro vertice.',
  buildPointCreatedNotice: ({ point }) => `Ponto criado em X ${point.x.toFixed(3)} / Y ${point.y.toFixed(3)}.`,
  defaultTextValue: 'Texto',
  buildTextInsertedNotice: ({ layerName, height, rotation, alignment, verticalAlignment }) => `Texto inserido na camada ${layerName} com altura ${height.toFixed(2)}, rotacao ${rotation.toFixed(1)}°, alinhamento ${alignment} e ancoragem ${verticalAlignment}.`,
  buildDistanceCreatedNotice: ({ distance, layerName }) => `Cota criada: ${distance.toFixed(3)} na camada ${layerName}.`,
  buildLineCreatedNotice: ({ layerName }) => `Linha criada na camada ${layerName}.`,
  buildCircleCreatedNotice: ({ layerName }) => `Circulo criado na camada ${layerName}.`,
  buildRectangleCreatedNotice: ({ layerName }) => `Retangulo criado na camada ${layerName}.`,
  buildBezierCreatedNotice: ({ layerName }) => `Curva Bezier criada na camada ${layerName}.`,
  defaultAnnotationLayerName: 'COTAS',
  defaultTextAnnotationLayerName: 'TEXTOS'
};

const getNearestHoverText = (
  dxfData: DXFData | null,
  dxfCoords: Point2D
): (HoverConfrontationText & { distance: number }) | null => {
  return (dxfData?.entities ?? [])
    .filter(isTextLikeEntity)
    .map((entity) => {
      const position = extractTextPosition(entity);
      const text = String(entity.properties.text || '').trim();
      if (!position || !text) {
        return null;
      }

      return {
        id: buildSelectedTextId(entity, position),
        text,
        x: position.x,
        y: position.y,
        distance: calculateDistance(dxfCoords, position)
      };
    })
    .filter((candidate): candidate is HoverConfrontationText & { distance: number } => candidate !== null)
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
};

const findNearestPointWithDistance = (
  referencePoint: Point2D,
  candidates: Point2D[],
  maxDistance: number
): { point: Point2D; distance: number } | null => {
  let nearestPoint: Point2D | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    const distance = calculateDistance(referencePoint, candidate);
    if (distance <= maxDistance && distance < nearestDistance) {
      nearestPoint = candidate;
      nearestDistance = distance;
    }
  });

  if (!nearestPoint) {
    return null;
  }

  return {
    point: nearestPoint,
    distance: nearestDistance
  };
};

const buildPointToleranceKey = (point: Point2D, tolerance: number): string => (
  `${Math.round(point.x / tolerance)}|${Math.round(point.y / tolerance)}`
);

const isPointInsideOrNearPolygon = (
  point: Point2D,
  polygon: Point2D[],
  tolerance: number = 1.2
): boolean => (
  isPointInPolygon(point, polygon)
  || getPolygonEdges(polygon).some((edge) => pointToSegmentDistance(point, edge.start, edge.end) <= tolerance)
);

const looksLikeStreetReference = (text: string): boolean => {
  const normalized = text.trim().toUpperCase();
  if (!normalized) {
    return false;
  }

  return normalized.includes('RUA ')
    || normalized.startsWith('RUA')
    || normalized.includes('AVENIDA')
    || normalized.startsWith('AV ')
    || normalized.startsWith('AV.')
    || normalized.includes('TRAVESSA')
    || normalized.includes('ALAMEDA')
    || normalized.includes('RODOVIA')
    || normalized.includes('ESTRADA')
    || normalized.includes('VIA ');
};

const snapPointToGrid = (
  point: Point2D,
  gridSnapSize: number,
  gridOrigin: Point2D = { x: 0, y: 0 }
): Point2D => ({
  x: gridOrigin.x + Math.round((point.x - gridOrigin.x) / gridSnapSize) * gridSnapSize,
  y: gridOrigin.y + Math.round((point.y - gridOrigin.y) / gridSnapSize) * gridSnapSize
});

const snapPointToGuides = (
  point: Point2D,
  guides: Array<{ orientation: 'vertical' | 'horizontal'; position: number }>,
  scale: number
): { point: Point2D; snappedX: boolean; snappedY: boolean } => {
  if (guides.length === 0) {
    return { point, snappedX: false, snappedY: false };
  }

  const snapDistance = GUIDE_SNAP_DISTANCE_PX / Math.max(scale, 0.0001);
  let snappedX = point.x;
  let snappedY = point.y;
  let snappedXAxis = false;
  let snappedYAxis = false;
  let bestDx = Number.POSITIVE_INFINITY;
  let bestDy = Number.POSITIVE_INFINITY;

  guides.forEach((guide) => {
    if (guide.orientation === 'vertical') {
      const dx = Math.abs(point.x - guide.position);
      if (dx < snapDistance && dx < bestDx) {
        bestDx = dx;
        snappedX = guide.position;
        snappedXAxis = true;
      }
      return;
    }

    const dy = Math.abs(point.y - guide.position);
    if (dy < snapDistance && dy < bestDy) {
      bestDy = dy;
      snappedY = guide.position;
      snappedYAxis = true;
    }
  });

  return {
    point: { x: snappedX, y: snappedY },
    snappedX: snappedXAxis,
    snappedY: snappedYAxis
  };
};

const getResolvedDrawingPoint = (
  point: Point2D,
  validPoints: Point2D[],
  scale: number,
  options: {
    enableObjectSnap?: boolean;
    enableGridSnap?: boolean;
    gridSnapSize?: number;
    gridOrigin?: Point2D;
    snapGuides?: ViewerSnapGuide[];
  }
) => {
  const {
    enableGridSnap = false,
    enableObjectSnap = true,
    gridSnapSize = 10,
    gridOrigin = { x: 0, y: 0 },
    snapGuides = []
  } = options;

  let nextPoint = point;
  const guideSnapResult = snapPointToGuides(nextPoint, snapGuides, scale);
  const hasGuideSnap = guideSnapResult.snappedX || guideSnapResult.snappedY;

  if (enableObjectSnap) {
    const objectSnappedPoint = findNearestPoint(point, validPoints, 20 / Math.max(scale, 0.0001));

    if (objectSnappedPoint && hasGuideSnap) {
      const combinedPoint = {
        x: guideSnapResult.snappedX ? guideSnapResult.point.x : objectSnappedPoint.x,
        y: guideSnapResult.snappedY ? guideSnapResult.point.y : objectSnappedPoint.y
      };
      return combinedPoint;
    }

    if (objectSnappedPoint) {
      return objectSnappedPoint;
    }
  }

  if (hasGuideSnap) {
    return guideSnapResult.point;
  }

  if (enableGridSnap && Number.isFinite(gridSnapSize) && gridSnapSize > 0) {
    nextPoint = snapPointToGrid(nextPoint, gridSnapSize, gridOrigin);
  }

  return nextPoint;
};

const toDraftVertices = (points: Point2D[]) => points.map((point) => ({ x: point.x, y: point.y }));

const normalizeSelectionRect = (startPoint: Point2D, endPoint: Point2D) => ({
  minX: Math.min(startPoint.x, endPoint.x),
  minY: Math.min(startPoint.y, endPoint.y),
  maxX: Math.max(startPoint.x, endPoint.x),
  maxY: Math.max(startPoint.y, endPoint.y)
});

const boundsIntersectSelectionRect = (
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  selectionRect: { minX: number; minY: number; maxX: number; maxY: number }
) => !(
  bounds.maxX < selectionRect.minX
  || bounds.minX > selectionRect.maxX
  || bounds.maxY < selectionRect.minY
  || bounds.minY > selectionRect.maxY
);

const mergeBounds = (
  current: { minX: number; minY: number; maxX: number; maxY: number } | null,
  next: { minX: number; minY: number; maxX: number; maxY: number } | null
) => {
  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  return {
    minX: Math.min(current.minX, next.minX),
    minY: Math.min(current.minY, next.minY),
    maxX: Math.max(current.maxX, next.maxX),
    maxY: Math.max(current.maxY, next.maxY)
  };
};

export const useViewerCanvasInteractions = ({
  activeToolId,
  activeConfrontationTextId,
  activeCorrectiveTool,
  activeEntityTransform,
  activeLayerName,
  annotationLayerName,
  textAnnotationLayerName,
  textUsesAnnotationLayer,
  drawingTextHeight,
  drawingTextRotation,
  drawingTextAlignment,
  drawingTextVerticalAlignment,
  analyzeSegmentSet,
  applyCloseGapGuidedCorrection,
  applyJoinEndpointsCorrection,
  applyMoveVertexCorrection,
  activeEditNodeDrag,
  beginEditNodeDragAtPoint,
  beginEntityDrag,
  beginEntityTransform,
  cancelEditNodeDrag,
  commitEditNodeDrag,
  updateEditNodeDrag,
  commitMirrorSelection,
  commitOffsetPreviewAtPoint,
  commitExtendPreviewAtPoint,
  commitTrimPreviewAtPoint,
  hasExtendPreview,
  hasTrimPreview,
  commitWeldSelection,
  commitEntityCopy,
  commitEntityDrag,
  commitEntityTransform,
  correctiveFocusLotNumber,
  correctiveFocusPolygon,
  correctiveFocusPolygonIndex,
  closePointToPointShape,
  canInteractWithEntity,
  detectedPolygons,
  draggingSelectedEntities,
  drawingTextValue,
  dxfData,
  entityMultiSelectModeActive,
  embeddedMode,
  embeddedDrawingPoints,
  embeddedToolMode,
  enableGridSnap,
  enableObjectSnap,
  endEntityTransform,
  endEntityDrag,
  findNearestRawSegment,
  findNearestSelectableEntity,
  getDxfCoords,
  handleEmbeddedEntitySelection,
  hoverPoint,
  hoverPolygon,
  hoverSegmentTargetPoint,
  interactive,
  isDragging,
  isEditNodeHandleAtPoint,
  lastShiftInteractionRef,
  manualReviewLotNumbers = [],
  manualPolygon,
  partialScopePolygons,
  primaryBoundaryReady = false,
  allowLotSelectionWithoutPrimaryBoundary = false,
  matchedReferencePoints,
  scale,
  gridSnapSize,
  gridOrigin = { x: 0, y: 0 },
  segmentContextMenu,
  selectedConfrontationTexts,
  selectedCorrectiveVertex,
  selectedCorrectiveVertexPoint,
  selectedEntities,
  selectedEntityIds,
  selectedSegments,
  pendingConfrontationSegmentPoints,
  segmentAnnotations,
  setSelectedEntityIds,
  setEntitySelectionBox,
  setZoomSelectionBox,
  snapGuides = [],
  onEntitiesDrawn,
  onManualReviewLotSelectionChange,
  onTextPlacementRequest,
  setActiveConfrontationTextId,
  setCorrectiveTargetPoint,
  setEmbeddedDrawingPoints,
  setHoverConfrontationText,
  setHoverPoint,
  setHoverPolygon,
  setHoverReferencePoint,
  setHoverSegmentTargetPoint,
  setIsHoveringText,
  setManualBridgeSegments,
  setManualPolygon,
  setPartialScopePolygons,
  setPendingConfrontationSegmentPoints,
  setSegmentAnnotations,
  setSegmentContextMenu,
  setSegmentInspectorMessage,
  setSelectedCloseGapVertices,
  setSelectedConfrontationTexts,
  setSelectedCorrectiveVertex,
  setSelectedJoinVertices,
  setSelectedPolygons,
  setSelectedSegmentIds,
  setZoom,
  zoomToArea,
  zoomToPoint,
  startPanDrag,
  stopPanDrag,
  suppressNextCanvasClickRef,
  updateEntityDragPreview,
  updateEntityTransformPreview,
  updatePanDrag,
  validPoints,
  viewerMode,
  messages
}: UseViewerCanvasInteractionsParams) => {
  const resolvedMessages = messages ?? DEFAULT_VIEWER_INTERACTION_MESSAGES;
  const [selectHoverCursor, setSelectHoverCursor] = useState<'default' | 'move' | 'grab' | string>('default');
  const [hoverSelectionHandle, setHoverSelectionHandle] = useState<SelectionHandleKind | null>(null);
  const [hoverSelectionMode, setHoverSelectionMode] = useState<'scale' | 'rotate' | null>(null);
  const [copyPlacementLocked, setCopyPlacementLocked] = useState(false);
  const isEntityAdditiveSelectionActive = useCallback((event: Pick<React.MouseEvent<HTMLCanvasElement>, 'ctrlKey' | 'metaKey'>) => (
    entityMultiSelectModeActive || event.ctrlKey || event.metaKey
  ), [entityMultiSelectModeActive]);
  const isTemporaryPanModifierActive = useCallback((event: Pick<React.MouseEvent<HTMLCanvasElement>, 'ctrlKey' | 'metaKey' | 'shiftKey'>) => (
    embeddedMode
    && !interactive
    && embeddedToolMode === 'select'
    && (event.ctrlKey || event.metaKey)
    && !event.shiftKey
    && !primaryBoundaryReady
  ), [embeddedMode, embeddedToolMode, interactive, primaryBoundaryReady]);
  const detectedVertexRepresentativeMap = useMemo(() => {
    const representatives = new Map<string, Point2D>();
    detectedPolygons.forEach((polygon) => {
      polygon.forEach((vertex) => {
        const key = buildPointToleranceKey(vertex, DETECTED_VERTEX_CANONICAL_TOLERANCE);
        if (!representatives.has(key)) {
          representatives.set(key, vertex);
        }
      });
    });
    return representatives;
  }, [detectedPolygons]);
  const resolveCanonicalDetectedVertex = useCallback((point: Point2D | null, maxDistance = DETECTED_VERTEX_CANONICAL_TOLERANCE * 1.5): Point2D | null => {
    if (!point) {
      return null;
    }

    const tolerance = DETECTED_VERTEX_CANONICAL_TOLERANCE;
    const baseGridX = Math.round(point.x / tolerance);
    const baseGridY = Math.round(point.y / tolerance);
    let nearestVertex: Point2D | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const candidate = detectedVertexRepresentativeMap.get(`${baseGridX + offsetX}|${baseGridY + offsetY}`);
        if (!candidate) {
          continue;
        }

        const distance = calculateDistance(point, candidate);
        if (distance <= maxDistance && distance < nearestDistance) {
          nearestVertex = candidate;
          nearestDistance = distance;
        }
      }
    }

    return nearestVertex;
  }, [detectedVertexRepresentativeMap]);
  const resolveConfrontationSnapPoint = useCallback((point: Point2D): Point2D => {
    const snapDist = CONFRONTATION_SEGMENT_SNAP_PX / scale;
    const continuitySnapDist = CONFRONTATION_SEGMENT_CONTINUITY_SNAP_PX / scale;
    const containingPolys = detectedPolygons.filter((polygon) => isPointInPolygon(point, polygon));
    const preferredPolygon = containingPolys.length > 0
      ? [...containingPolys].sort((a, b) => calculatePolygonArea(a) - calculatePolygonArea(b))[0]
      : hoverPolygon;

    const continuityCandidates = [
      ...pendingConfrontationSegmentPoints,
      ...segmentAnnotations.flatMap((annotation) => [annotation.startPoint, annotation.endPoint])
    ].reduce<Point2D[]>((points, candidate) => {
      if (!points.some((pointItem) => calculateDistance(pointItem, candidate) <= 0.001)) {
        points.push(candidate);
      }
      return points;
    }, []);

    const preferredCandidates = preferredPolygon
      ? getSegmentSnapCandidates(point, detectedPolygons, snapDist, preferredPolygon)
      : [];
    const preferredMatch = findNearestPointWithDistance(point, preferredCandidates, snapDist);
    const continuityMatch = findNearestPointWithDistance(point, continuityCandidates, continuitySnapDist);

    // Prioriza o vertice real do contorno quando ele estiver tao perto quanto a continuidade.
    if (preferredMatch && (!continuityMatch || preferredMatch.distance <= continuityMatch.distance)) {
      return resolveCanonicalDetectedVertex(preferredMatch.point, Math.max(DETECTED_VERTEX_CANONICAL_TOLERANCE * 1.5, snapDist * 0.2))
        ?? preferredMatch.point;
    }

    if (continuityMatch) {
      return continuityMatch.point;
    }

    const segmentSnapCandidates = getSegmentSnapCandidates(
      point,
      detectedPolygons,
      snapDist,
      preferredPolygon
    );
    const fallbackMatch = findNearestPointWithDistance(point, segmentSnapCandidates, snapDist);
    if (!fallbackMatch) {
      return point;
    }

    return resolveCanonicalDetectedVertex(fallbackMatch.point, Math.max(DETECTED_VERTEX_CANONICAL_TOLERANCE * 1.5, snapDist * 0.2))
      ?? fallbackMatch.point;
  }, [detectedPolygons, hoverPolygon, pendingConfrontationSegmentPoints, resolveCanonicalDetectedVertex, scale, segmentAnnotations]);
  const appendManualReviewPolygonPoint = useCallback((point: Point2D): boolean => {
    if (!dxfData || !onManualReviewLotSelectionChange) {
      return false;
    }

    const firstPoint = manualPolygon[0];
    if (manualPolygon.length > 2 && firstPoint && calculateDistance(firstPoint, point) <= POINT_EQUALITY_TOLERANCE) {
      const polygon = [...manualPolygon];
      const textsInside = summarizePolygonTexts(polygon, dxfData);
      const lotNumber = extractLotNumberFromTexts(textsInside);

      setManualPolygon([]);
      setHoverPoint(null);
      setHoverPolygon(null);
      setHoverSegmentTargetPoint(null);

      if (lotNumber === null) {
        setSegmentInspectorMessage('O contorno fechado nao revelou um numero de lote reconhecivel.');
        return true;
      }

      const isSelected = manualReviewLotNumbers.includes(lotNumber);
      const nextLotNumbers = isSelected
        ? manualReviewLotNumbers.filter((value) => value !== lotNumber)
        : [...manualReviewLotNumbers, lotNumber];
      const normalizedLotNumbers = Array.from(new Set(nextLotNumbers)).sort((left, right) => left - right);

      onManualReviewLotSelectionChange({
        lotNumber,
        selected: !isSelected,
        lotNumbers: normalizedLotNumbers,
        source: 'alt-click'
      });

      setSegmentInspectorMessage(
        isSelected
          ? `Lote ${lotNumber} removido da revisao manual.`
          : `Lote ${lotNumber} marcado para revisao manual pelo contorno manual.`
      );
      return true;
    }

    const lastPoint = manualPolygon[manualPolygon.length - 1];
    if (lastPoint && calculateDistance(lastPoint, point) <= POINT_EQUALITY_TOLERANCE) {
      // #region debug-point E:partial-click-duplicate-point
      sendSelectionDebug('E', 'useViewerCanvasInteractions:appendPartialScopePolygonPoint', '[DEBUG] Alt click ignorado por ponto repetido', {
        point,
        lastPoint,
        manualPolygonLength: manualPolygon.length
      });
      // #endregion
      return true;
    }

    // #region debug-point F:partial-click-point-appended
    sendSelectionDebug('F', 'useViewerCanvasInteractions:appendPartialScopePolygonPoint', '[DEBUG] Alt click adicionou ponto ao contorno parcial', {
      point,
      manualPolygonLengthBeforeAppend: manualPolygon.length,
      primaryBoundaryReady,
      partialScopePolygonCount: partialScopePolygons.length
    });
    // #endregion
    setManualPolygon((prev) => [...prev, point]);
    setSegmentInspectorMessage(
      manualPolygon.length === 0
        ? 'Revisao manual iniciada. Continue marcando os vertices do lote e clique no primeiro ponto para fechar.'
        : `Revisao manual em andamento: ${manualPolygon.length + 1} ponto(s). Clique no primeiro ponto para fechar.`
    );
    return true;
  }, [dxfData, manualPolygon, manualReviewLotNumbers, onManualReviewLotSelectionChange, setHoverPoint, setHoverPolygon, setHoverSegmentTargetPoint, setManualPolygon, setSegmentInspectorMessage]);
  const appendPartialScopePolygonPoint = useCallback((point: Point2D): boolean => {
    if (!primaryBoundaryReady && !allowLotSelectionWithoutPrimaryBoundary) {
      // #region debug-point B:partial-click-blocked-before-primary
      sendSelectionDebug('B', 'useViewerCanvasInteractions:appendPartialScopePolygonPoint', '[DEBUG] Alt click bloqueado antes das primarias', {
        point,
        primaryBoundaryReady,
        allowLotSelectionWithoutPrimaryBoundary,
        manualPolygonLength: manualPolygon.length,
        partialScopePolygonCount: partialScopePolygons.length
      });
      // #endregion
      setSegmentInspectorMessage('Salve as Primarias antes de iniciar o recorte parcial dos lotes.');
      return true;
    }

    const firstPoint = manualPolygon[0];
    if (manualPolygon.length > 2 && firstPoint && calculateDistance(firstPoint, point) <= POINT_EQUALITY_TOLERANCE) {
      const polygon = [...manualPolygon];
      const isAlreadySelected = partialScopePolygons.some((selectedPolygon) => (
        selectedPolygon.length === polygon.length
        && selectedPolygon.every((selectedPoint, index) => (
          calculateDistance(selectedPoint, polygon[index]!) <= POINT_EQUALITY_TOLERANCE
        ))
      ));
      setHoverPoint(null);
      setHoverPolygon(null);
      setHoverSegmentTargetPoint(null);
      setManualPolygon([]);

      if (isAlreadySelected) {
        // #region debug-point C:partial-click-duplicate-polygon
        sendSelectionDebug('C', 'useViewerCanvasInteractions:appendPartialScopePolygonPoint', '[DEBUG] Alt click fechou poligono ja confirmado', {
          point,
          manualPolygonLength: manualPolygon.length,
          partialScopePolygonCount: partialScopePolygons.length
        });
        // #endregion
        setSegmentInspectorMessage('Esse contorno parcial ja estava confirmado.');
        return true;
      }

      setPartialScopePolygons((prev) => [...prev, polygon]);
      setSelectedPolygons((prev) => [...prev, polygon]);

      const textsInside = dxfData ? summarizePolygonTexts(polygon, dxfData) : [];
      const lotNumber = extractLotNumberFromTexts(textsInside);
      // #region debug-point D:partial-click-polygon-confirmed
      sendSelectionDebug('D', 'useViewerCanvasInteractions:appendPartialScopePolygonPoint', '[DEBUG] Alt click confirmou poligono parcial', {
        point,
        lotNumber,
        manualPolygonLength: manualPolygon.length,
        polygonVertexCount: polygon.length,
        textsInside
      });
      // #endregion
      setSegmentInspectorMessage(
        lotNumber !== null
          ? `Escopo parcial confirmado para o lote ${lotNumber}. Agora selecione ruas e confrontacoes em roxo.`
          : 'Escopo parcial confirmado. Agora selecione ruas e confrontacoes em roxo.'
      );
      return true;
    }

    const lastPoint = manualPolygon[manualPolygon.length - 1];
    if (lastPoint && calculateDistance(lastPoint, point) <= POINT_EQUALITY_TOLERANCE) {
      return true;
    }

    setManualPolygon((prev) => [...prev, point]);
    setSegmentInspectorMessage(
      manualPolygon.length === 0
        ? 'Escopo parcial iniciado. Marque os pontos amarelos do lote e clique no primeiro ponto para fechar em laranja.'
        : `Escopo parcial em andamento: ${manualPolygon.length + 1} ponto(s). Clique no primeiro ponto para fechar o contorno laranja.`
    );
    return true;
  }, [
    dxfData,
    manualPolygon,
    partialScopePolygons,
    allowLotSelectionWithoutPrimaryBoundary,
    primaryBoundaryReady,
    setHoverPoint,
    setHoverPolygon,
    setHoverSegmentTargetPoint,
    setManualPolygon,
    setPartialScopePolygons,
    setSegmentInspectorMessage,
    setSelectedPolygons
  ]);
  const isPointInsidePartialScope = useCallback((point: Point2D | null): boolean => {
    if (!point) {
      return false;
    }

    if (partialScopePolygons.length === 0) {
      return true;
    }

    return partialScopePolygons.some((polygon) => isPointInsideOrNearPolygon(point, polygon));
  }, [partialScopePolygons]);
  const pendingEntityDragRef = useRef<{
    entity: ViewerSelectedEntityInfo;
    startPoint: Point2D;
    startClientX: number;
    startClientY: number;
  } | null>(null);
  const pendingEntityBoxSelectionRef = useRef<{
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
    additiveSelection: boolean;
  } | null>(null);
  const pendingZoomBoxRef = useRef<{
    startClientX: number;
    startClientY: number;
    currentClientX: number;
    currentClientY: number;
  } | null>(null);
  const lastDrawingCommitTsRef = useRef(0);
  const getSelectedEntityBounds = useCallback(() => {
    if (!dxfData || selectedEntities.length === 0) {
      return null;
    }

    return selectedEntities.reduce<{
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    } | null>((bounds, entityInfo) => {
      const sourceEntity = dxfData.entities[entityInfo.index];
      if (!sourceEntity) {
        return bounds;
      }

      return mergeBounds(bounds, getEntityBounds(sourceEntity));
    }, null);
  }, [dxfData, selectedEntities]);
  const isMoveToolActive = embeddedMode && !interactive && embeddedToolMode === 'select' && activeToolId === 'move';
  const isCopyToolActive = embeddedMode && !interactive && embeddedToolMode === 'select' && activeToolId === 'copy';
  const isRotateToolActive = embeddedMode && !interactive && embeddedToolMode === 'select' && activeToolId === 'rotate';
  const isScaleToolActive = embeddedMode && !interactive && embeddedToolMode === 'select' && activeToolId === 'scale';
  const isEditNodesToolActive = embeddedMode && !interactive && embeddedToolMode === 'select' && activeToolId === 'edit-nodes';
  const isOffsetToolActive = embeddedMode && !interactive && embeddedToolMode === 'select' && activeToolId === 'offset';
  const isExtendToolActive = embeddedMode && !interactive && embeddedToolMode === 'select' && activeToolId === 'extend';
  const isTrimToolActive = embeddedMode && !interactive && embeddedToolMode === 'select' && activeToolId === 'trim';
  const isMirrorToolActive = embeddedMode && !interactive && embeddedToolMode === 'select' && activeToolId === 'mirror';
  const isJoinToolActive = embeddedMode && !interactive && embeddedToolMode === 'select' && activeToolId === 'join';
  const isGuidedTranslateToolActive = isMoveToolActive || isCopyToolActive;
  const isCopyPreviewLocked = isCopyToolActive && draggingSelectedEntities && copyPlacementLocked;
  useEffect(() => {
    if (!draggingSelectedEntities || !isCopyToolActive) {
      setCopyPlacementLocked(false);
    }
  }, [draggingSelectedEntities, isCopyToolActive]);

  const resolveHoveredSelectionHandle = useCallback((point: Point2D): SelectionHandleInfo | null => {
    const selectionBounds = getSelectedEntityBounds();
    if (!selectionBounds) {
      return null;
    }

    return findSelectionHandle(selectionBounds, scale, point);
  }, [getSelectedEntityBounds, scale]);
  const closeSegmentContextMenu = useCallback(() => {
    setSegmentContextMenu((current) => (current.open ? { ...current, open: false } : current));
  }, [setSegmentContextMenu]);

  const isPostDrawObjectSnapCooldownActive = useCallback(
    () => Date.now() - lastDrawingCommitTsRef.current < POST_DRAW_OBJECT_SNAP_COOLDOWN_MS,
    []
  );

  const emitEntitiesDrawn = useCallback((payload: {
    entities: DXFEntity[];
    mode: EmbeddedCadToolMode;
    notice?: string;
  }) => {
    if (payload.entities.length > 0) {
      lastDrawingCommitTsRef.current = Date.now();
      setHoverPoint(null);
      setHoverReferencePoint(null);
      setHoverPolygon(null);
      setHoverConfrontationText(null);
      setHoverSegmentTargetPoint(null);
    }

    onEntitiesDrawn?.(payload);
  }, [
    onEntitiesDrawn,
    setHoverConfrontationText,
    setHoverPoint,
    setHoverPolygon,
    setHoverReferencePoint,
    setHoverSegmentTargetPoint
  ]);

  const toggleSegmentSelection = useCallback((segmentId: string) => {
    setSelectedSegmentIds((current) => (
      current.includes(segmentId) ? current.filter((id) => id !== segmentId) : [...current, segmentId]
    ));
  }, [setSelectedSegmentIds]);

  const clearSegmentSelection = useCallback(() => {
    setSelectedSegmentIds([]);
  }, [setSelectedSegmentIds]);

  const handleCheckSelectedSegments = useCallback(() => {
    if (selectedSegments.length === 0) {
      setSegmentInspectorMessage(resolvedMessages.selectSegmentsBeforeCheckNotice);
      closeSegmentContextMenu();
      return;
    }

    const analysis = analyzeSegmentSet(selectedSegments);
    if (analysis.isClosed) {
      setSegmentInspectorMessage(resolvedMessages.buildContourClosedNotice({
        segmentCount: selectedSegments.length
      }));
      closeSegmentContextMenu();
      return;
    }

    if (analysis.openNodes.length > 0) {
      setSegmentInspectorMessage(resolvedMessages.buildContourOpenNotice({
        openNodeCount: analysis.openNodes.length,
        closestGapDistance: analysis.closestGap?.distance ?? null
      }));
      closeSegmentContextMenu();
      return;
    }

    setSegmentInspectorMessage(resolvedMessages.invalidContourNotice);
    closeSegmentContextMenu();
  }, [analyzeSegmentSet, closeSegmentContextMenu, resolvedMessages, selectedSegments, setSegmentInspectorMessage]);

  const handleCloseGapFromSelectedSegments = useCallback(() => {
    if (selectedSegments.length === 0) {
      setSegmentInspectorMessage(resolvedMessages.selectSegmentsBeforeCloseNotice);
      closeSegmentContextMenu();
      return;
    }

    const analysis = analyzeSegmentSet(selectedSegments);
    if (analysis.isClosed) {
      setSegmentInspectorMessage(resolvedMessages.alreadyClosedNotice);
      closeSegmentContextMenu();
      return;
    }

    if (analysis.openNodes.length !== 2) {
      setSegmentInspectorMessage(resolvedMessages.buildAutoCloseFailureNotice({
        openNodeCount: analysis.openNodes.length
      }));
      closeSegmentContextMenu();
      return;
    }

    const [p1, p2] = analysis.openNodes;
    setManualBridgeSegments((current) => [...current, { p1, p2 }]);
    setSegmentInspectorMessage(resolvedMessages.buildBridgeCreatedNotice({ distance: calculateDistance(p1, p2) }));
    closeSegmentContextMenu();
  }, [analyzeSegmentSet, closeSegmentContextMenu, resolvedMessages, selectedSegments, setManualBridgeSegments, setSegmentInspectorMessage]);

  const handleRemoveLastBridge = useCallback(() => {
    setManualBridgeSegments((current) => current.slice(0, -1));
    closeSegmentContextMenu();
  }, [closeSegmentContextMenu, setManualBridgeSegments]);

  const handleClearBridges = useCallback(() => {
    setManualBridgeSegments([]);
    closeSegmentContextMenu();
  }, [closeSegmentContextMenu, setManualBridgeSegments]);

  const cancelEmbeddedDrawing = useCallback((notice = resolvedMessages.cancelEmbeddedDrawingNotice) => {
    if (embeddedDrawingPoints.length === 0) {
      return false;
    }

    setEmbeddedDrawingPoints([]);
    emitEntitiesDrawn({
      entities: [],
      mode: embeddedToolMode,
      notice
    });
    return true;
  }, [embeddedDrawingPoints.length, embeddedToolMode, emitEntitiesDrawn, resolvedMessages.cancelEmbeddedDrawingNotice, setEmbeddedDrawingPoints]);

  const commitPointToPointDrawing = useCallback((notice?: string) => {
    if (embeddedToolMode !== 'point-to-point' || embeddedDrawingPoints.length < 2) {
      return false;
    }

    const layerName = activeLayerName || DEFAULT_DRAWING_LAYER;
    const isClosed = Boolean(closePointToPointShape && embeddedDrawingPoints.length >= 3);
    emitEntitiesDrawn({
      entities: [buildPolylineEntity(toDraftVertices(embeddedDrawingPoints), layerName, isClosed)],
      mode: embeddedToolMode,
      notice: notice || resolvedMessages.buildPointToPointCreatedNotice({
        isClosed,
        vertexCount: embeddedDrawingPoints.length,
        layerName
      })
    });
    setEmbeddedDrawingPoints([]);
    return true;
  }, [activeLayerName, closePointToPointShape, embeddedDrawingPoints, embeddedToolMode, emitEntitiesDrawn, resolvedMessages, setEmbeddedDrawingPoints]);

  const appendPointToPointVertex = useCallback((point: Point2D) => {
    if (embeddedToolMode !== 'point-to-point') {
      return false;
    }

    if (embeddedDrawingPoints.length === 0) {
      setEmbeddedDrawingPoints([point]);
      return true;
    }

    const firstPoint = embeddedDrawingPoints[0];
    if (
      closePointToPointShape &&
      embeddedDrawingPoints.length >= 3 &&
      firstPoint &&
      calculateDistance(firstPoint, point) <= 0.001
    ) {
      commitPointToPointDrawing(resolvedMessages.pointToPointClosedAtFirstVertexNotice);
      return true;
    }

    const lastPoint = embeddedDrawingPoints[embeddedDrawingPoints.length - 1];
    if (calculateDistance(lastPoint, point) <= 0.001) {
      return false;
    }

    setEmbeddedDrawingPoints((current) => [...current, point]);
    return true;
  }, [
    closePointToPointShape,
    commitPointToPointDrawing,
    embeddedDrawingPoints,
    embeddedToolMode,
    resolvedMessages.pointToPointClosedAtFirstVertexNotice,
    setEmbeddedDrawingPoints
  ]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!embeddedMode || interactive || embeddedToolMode !== 'select') {
      return;
    }

    if (isTemporaryPanModifierActive(e)) {
      return;
    }

    if (suppressNextCanvasClickRef.current) {
      suppressNextCanvasClickRef.current = false;
      return;
    }

    const dxfCoords = getDxfCoords(e.clientX, e.clientY);
    if (!dxfCoords) {
      return;
    }

    if (isOffsetToolActive) {
      const nearestEntity = findNearestSelectableEntity(dxfCoords);
      if (selectedEntities.length !== 1) {
        handleEmbeddedEntitySelection(nearestEntity, false);
        return;
      }

      if (nearestEntity && !selectedEntityIds.includes(nearestEntity.id)) {
        handleEmbeddedEntitySelection(nearestEntity, false);
        return;
      }

      if (commitOffsetPreviewAtPoint(dxfCoords)) {
        suppressNextCanvasClickRef.current = true;
      }
      return;
    }

    if (isExtendToolActive) {
      if (commitExtendPreviewAtPoint(dxfCoords)) {
        suppressNextCanvasClickRef.current = true;
      }
      return;
    }

    if (isTrimToolActive) {
      if (commitTrimPreviewAtPoint(dxfCoords)) {
        suppressNextCanvasClickRef.current = true;
      }
      return;
    }

    if (isMirrorToolActive) {
      const nearestEntity = findNearestSelectableEntity(dxfCoords);
      if (selectedEntities.length !== 1) {
        handleEmbeddedEntitySelection(nearestEntity, false);
        return;
      }

      if (nearestEntity && !selectedEntityIds.includes(nearestEntity.id)) {
        handleEmbeddedEntitySelection(nearestEntity, false);
        return;
      }

      if (commitMirrorSelection()) {
        suppressNextCanvasClickRef.current = true;
      }
      return;
    }

    if (isJoinToolActive) {
      const nearestEntity = findNearestSelectableEntity(dxfCoords);
      if (!nearestEntity) {
        if (selectedEntities.length >= 2 && commitWeldSelection()) {
          suppressNextCanvasClickRef.current = true;
        }
        return;
      }

      if (!selectedEntityIds.includes(nearestEntity.id)) {
        handleEmbeddedEntitySelection(nearestEntity, true);
        return;
      }

      if (selectedEntities.length < 2) {
        return;
      }

      if (commitWeldSelection()) {
        suppressNextCanvasClickRef.current = true;
      }
      return;
    }

    if (isEditNodesToolActive) {
      const nearestEntity = findNearestSelectableEntity(dxfCoords);
      const additiveSelection = isEntityAdditiveSelectionActive(e);
      handleEmbeddedEntitySelection(nearestEntity, additiveSelection);
      return;
    }

    if (isGuidedTranslateToolActive) {
      if (draggingSelectedEntities) {
        if (isCopyToolActive) {
          updateEntityDragPreview(dxfCoords);
          setCopyPlacementLocked(true);
          return;
        }

        commitEntityDrag(dxfCoords);
        endEntityDrag();
        return;
      }

      const nearestEntity = findNearestSelectableEntity(dxfCoords);
      if (selectedEntities.length === 0) {
        handleEmbeddedEntitySelection(nearestEntity, false);
        return;
      }

      if (nearestEntity && !selectedEntityIds.includes(nearestEntity.id)) {
        handleEmbeddedEntitySelection(nearestEntity, false);
        return;
      }

      const primarySelectedEntity = selectedEntities[selectedEntities.length - 1] || nearestEntity;
      if (!primarySelectedEntity) {
        handleEmbeddedEntitySelection(null, false);
        return;
      }

      beginEntityDrag(primarySelectedEntity, dxfCoords);
      if (isCopyToolActive) {
        setCopyPlacementLocked(false);
      }
      return;
    }

    const nearestEntity = findNearestSelectableEntity(dxfCoords);
    const additiveSelection = isEntityAdditiveSelectionActive(e);
    handleEmbeddedEntitySelection(nearestEntity, additiveSelection);
  }, [
    beginEntityDrag,
    commitEntityDrag,
    commitEntityCopy,
    commitExtendPreviewAtPoint,
    commitMirrorSelection,
    commitOffsetPreviewAtPoint,
    commitTrimPreviewAtPoint,
    commitWeldSelection,
    draggingSelectedEntities,
    endEntityDrag,
    embeddedMode,
    interactive,
    embeddedToolMode,
    findNearestSelectableEntity,
    getDxfCoords,
    handleEmbeddedEntitySelection,
    hasExtendPreview,
    hasTrimPreview,
    isEditNodesToolActive,
    isCopyPreviewLocked,
    isCopyToolActive,
    isExtendToolActive,
    isGuidedTranslateToolActive,
    isJoinToolActive,
    isMirrorToolActive,
    isMoveToolActive,
    isEntityAdditiveSelectionActive,
    isOffsetToolActive,
    isTemporaryPanModifierActive,
    isTrimToolActive,
    selectedEntities,
    selectedEntityIds,
    suppressNextCanvasClickRef
  ]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (segmentContextMenu.open) {
      closeSegmentContextMenu();
    }
    pendingEntityDragRef.current = null;

    if (embeddedMode && !interactive) {
      if (e.button !== 0) {
        return;
      }

      if (embeddedToolMode === 'select') {
        if (isTemporaryPanModifierActive(e)) {
          setHoverSelectionHandle(null);
          setHoverSelectionMode(null);
          setSelectHoverCursor('grabbing');
          startPanDrag(e.clientX, e.clientY);
          return;
        }

        const dxfCoords = getDxfCoords(e.clientX, e.clientY);
        if (!dxfCoords) {
          return;
        }
        const isShiftTextSelection = e.shiftKey && !e.ctrlKey && !e.metaKey;
        const isShiftSegmentSelection = e.shiftKey && (e.ctrlKey || e.metaKey);
        const isPartialScopeSelection = e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey;
        const isManualReviewSelection = e.altKey && !e.shiftKey && (e.ctrlKey || e.metaKey);

        if (isShiftTextSelection && !primaryBoundaryReady) {
          suppressNextCanvasClickRef.current = true;
          setSegmentInspectorMessage('Salve as Primarias primeiro. A selecao de ruas e confrontacoes so libera depois disso.');
          return;
        }

        if ((isShiftTextSelection || (isShiftSegmentSelection && primaryBoundaryReady)) && manualPolygon.length > 0) {
          suppressNextCanvasClickRef.current = true;
          setSegmentInspectorMessage('Feche primeiro o contorno laranja do escopo parcial antes de seguir para as selecoes roxas.');
          return;
        }

        if (isPartialScopeSelection) {
          e.preventDefault();
          e.stopPropagation();
          const draftPoint = hoverSegmentTargetPoint ?? hoverPoint ?? dxfCoords;
          // #region debug-point A:alt-mousedown-entry
          sendSelectionDebug('A', 'useViewerCanvasInteractions:onMouseDown', '[DEBUG] Alt click recebido no canvas', {
            dxfCoords,
            draftPoint,
            primaryBoundaryReady,
            manualPolygonLength: manualPolygon.length,
            hasHoverPoint: Boolean(hoverPoint),
            hasHoverSegmentTargetPoint: Boolean(hoverSegmentTargetPoint)
          });
          // #endregion
          if (appendPartialScopePolygonPoint(draftPoint)) {
            suppressNextCanvasClickRef.current = true;
            return;
          }
        }

        if (isShiftTextSelection && dxfData) {
          suppressNextCanvasClickRef.current = true;
          const now = Date.now();
          const lastShiftInteraction = lastShiftInteractionRef.current;
          if (
            lastShiftInteraction &&
            now - lastShiftInteraction.ts <= SHIFT_CLICK_DEDUP_MS &&
            calculateDistance(dxfCoords, { x: lastShiftInteraction.x, y: lastShiftInteraction.y }) <= SHIFT_CLICK_DEDUP_DISTANCE
          ) {
            return;
          }
          lastShiftInteractionRef.current = { x: dxfCoords.x, y: dxfCoords.y, ts: now };

          const nearestText = dxfData.entities
            .filter(isTextLikeEntity)
            .map((entity: DXFEntity) => {
              const position = extractTextPosition(entity);
              const text = String(entity.properties.text || '').trim();
              if (!position || !text) {
                return null;
              }

              return {
                entity,
                position,
                text,
                distance: calculateDistance(dxfCoords, position)
              };
            })
            .filter((candidate): candidate is { entity: DXFEntity; position: Point2D; text: string; distance: number } => candidate !== null)
            .sort((a, b) => a.distance - b.distance)[0];

          if (nearestText && nearestText.distance <= 25 / scale) {
            const isStreetReference = looksLikeStreetReference(nearestText.text);
            if (!isStreetReference && !isPointInsidePartialScope(nearestText.position)) {
              setSegmentInspectorMessage('Essa rua/confrontacao esta fora do escopo parcial confirmado.');
              return;
            }

            const selectedText: SelectedConfrontationText = {
              id: buildSelectedTextId(nearestText.entity, nearestText.position),
              text: nearestText.text,
              layer: nearestText.entity.layer,
              entityType: nearestText.entity.type,
              x: nearestText.position.x,
              y: nearestText.position.y
            };

            setSelectedConfrontationTexts((prev) => {
              const isAlreadySelected = prev.some((item) => item.id === selectedText.id);
              if (isAlreadySelected) {
                setSegmentAnnotations((annotations) => annotations.filter((item) => item.sourceTextId !== selectedText.id));
                setPendingConfrontationSegmentPoints([]);
                setActiveConfrontationTextId((current) => current === selectedText.id ? null : current);
                return prev.filter((item) => item.id !== selectedText.id);
              }
              setActiveConfrontationTextId(selectedText.id);
              return [...prev, selectedText];
            });
          }
          return;
        }

        if (isShiftSegmentSelection && dxfData) {
          suppressNextCanvasClickRef.current = true;
          const now = Date.now();
          const lastShiftInteraction = lastShiftInteractionRef.current;
          if (
            lastShiftInteraction &&
            now - lastShiftInteraction.ts <= SHIFT_CLICK_DEDUP_MS &&
            calculateDistance(dxfCoords, { x: lastShiftInteraction.x, y: lastShiftInteraction.y }) <= SHIFT_CLICK_DEDUP_DISTANCE
          ) {
            return;
          }
          lastShiftInteractionRef.current = { x: dxfCoords.x, y: dxfCoords.y, ts: now };
          const pickedPoint = resolveConfrontationSnapPoint(dxfCoords);
          if (primaryBoundaryReady && !isPointInsidePartialScope(pickedPoint)) {
            setSegmentInspectorMessage('Esse trecho esta fora do escopo parcial confirmado.');
            return;
          }
          setPendingConfrontationSegmentPoints((prev) => {
            if (prev.length === 0) {
              return [pickedPoint];
            }

            const startPoint = prev[0];
            if (calculateDistance(startPoint, pickedPoint) < 0.001) {
              return prev;
            }

            const activeText = selectedConfrontationTexts.find((item) => item.id === activeConfrontationTextId);
            const annotation: SegmentConfrontationAnnotation = activeText
              ? {
                  id: `${activeText.id}|${startPoint.x.toFixed(3)}|${startPoint.y.toFixed(3)}|${pickedPoint.x.toFixed(3)}|${pickedPoint.y.toFixed(3)}`,
                  sourceTextId: activeText.id,
                  text: activeText.text,
                  layer: activeText.layer,
                  entityType: activeText.entityType,
                  selectionMode: 'segment',
                  startPoint,
                  endPoint: pickedPoint
                }
              : buildDirectSegmentAnnotation(startPoint, pickedPoint);

            setSegmentAnnotations((annotations) => [
              ...annotations.filter((item) => item.id !== annotation.id),
              annotation
            ]);
            setActiveConfrontationTextId(null);
            return [];
          });
          return;
        }

        if (isManualReviewSelection) {
          e.preventDefault();
          e.stopPropagation();
          const draftPoint = hoverSegmentTargetPoint ?? hoverPoint ?? dxfCoords;
          if (appendManualReviewPolygonPoint(draftPoint)) {
            suppressNextCanvasClickRef.current = true;
            return;
          }
        }

        if (isGuidedTranslateToolActive) {
          return;
        }

        if (isOffsetToolActive) {
          return;
        }

        if (isExtendToolActive) {
          return;
        }

        if (isTrimToolActive) {
          return;
        }

        if (isMirrorToolActive) {
          return;
        }

        if (isJoinToolActive) {
          return;
        }

        if (isEditNodesToolActive) {
          if (beginEditNodeDragAtPoint(dxfCoords)) {
            suppressNextCanvasClickRef.current = true;
            setSelectHoverCursor('grabbing');
          }
          return;
        }

        const nearestEntity = findNearestSelectableEntity(dxfCoords);
        if (
          isRotateToolActive
          && nearestEntity
          && selectedEntityIds.includes(nearestEntity.id)
        ) {
          const primarySelectedEntity = selectedEntities.find((entity) => entity.id === nearestEntity.id)
            || selectedEntities[selectedEntities.length - 1]
            || nearestEntity;
          const didStartTransform = beginEntityTransform({
            entity: primarySelectedEntity,
            startPoint: dxfCoords,
            handle: 'rotate'
          });
          if (didStartTransform) {
            suppressNextCanvasClickRef.current = true;
            setSelectHoverCursor('grabbing');
            return;
          }
        }

        const hoveredHandle = resolveHoveredSelectionHandle(dxfCoords);
        const primarySelectedEntity = selectedEntities[selectedEntities.length - 1] || null;
        if (hoveredHandle && primarySelectedEntity) {
          const handleKind = (e.ctrlKey || e.metaKey) && hoveredHandle.kind !== 'rotate'
            ? 'rotate'
            : hoveredHandle.kind;
          const didStartTransform = beginEntityTransform({
            entity: primarySelectedEntity,
            startPoint: dxfCoords,
            handle: handleKind
          });
          if (didStartTransform) {
            suppressNextCanvasClickRef.current = true;
            setSelectHoverCursor(handleKind === 'rotate' ? 'grabbing' : hoveredHandle.cursor);
            return;
          }
        }

        if (
          nearestEntity &&
          selectedEntityIds.includes(nearestEntity.id) &&
          !entityMultiSelectModeActive &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.shiftKey &&
          !isScaleToolActive &&
          !isEditNodesToolActive
        ) {
          pendingEntityDragRef.current = {
            entity: nearestEntity,
            startPoint: dxfCoords,
            startClientX: e.clientX,
            startClientY: e.clientY
          };
        }
        if (!nearestEntity) {
          pendingEntityBoxSelectionRef.current = {
            startClientX: e.clientX,
            startClientY: e.clientY,
            currentClientX: e.clientX,
            currentClientY: e.clientY,
            additiveSelection: isEntityAdditiveSelectionActive(e)
          };
        }
        return;
      }

      if (embeddedToolMode === 'pan') {
        startPanDrag(e.clientX, e.clientY);
        return;
      }

      if (embeddedToolMode === 'zoom') {
        pendingZoomBoxRef.current = {
          startClientX: e.clientX,
          startClientY: e.clientY,
          currentClientX: e.clientX,
          currentClientY: e.clientY
        };
        setZoomSelectionBox(null);
        return;
      }

      if (isDrawingToolMode(embeddedToolMode)) {
        const layerName = activeLayerName || DEFAULT_DRAWING_LAYER;
        const annotationTargetLayerName = annotationLayerName || resolvedMessages.defaultAnnotationLayerName;
        const textAnnotationTargetLayerName = textAnnotationLayerName || resolvedMessages.defaultTextAnnotationLayerName;
        const textLayerName = textUsesAnnotationLayer ? textAnnotationTargetLayerName : layerName;
        const dxfCoords = getDxfCoords(e.clientX, e.clientY);
        if (!dxfCoords) {
          return;
        }

        let point = getResolvedDrawingPoint(dxfCoords, validPoints, scale, {
          enableGridSnap,
          enableObjectSnap: Boolean(enableObjectSnap && !isPostDrawObjectSnapCooldownActive()),
          gridSnapSize,
          gridOrigin,
          snapGuides
        });

        if (
          embeddedToolMode === 'point-to-point' &&
          closePointToPointShape &&
          embeddedDrawingPoints.length >= 3
        ) {
          const firstDraftPoint = embeddedDrawingPoints[0];
          if (firstDraftPoint && calculateDistance(dxfCoords, firstDraftPoint) <= 20 / Math.max(scale, 0.0001)) {
            point = firstDraftPoint;
          }
        }

        if (embeddedToolMode === 'point') {
          emitEntitiesDrawn({
            entities: [buildPointEntity(point, layerName)],
            mode: embeddedToolMode,
            notice: resolvedMessages.buildPointCreatedNotice({ point })
          });
          setEmbeddedDrawingPoints([]);
          return;
        }

        if (embeddedToolMode === 'text') {
          if (onTextPlacementRequest) {
            onTextPlacementRequest({
              point,
              layerName: textLayerName
            });
            setEmbeddedDrawingPoints([]);
            return;
          }
          const nextTextValue = drawingTextValue.trim() || resolvedMessages.defaultTextValue;
          emitEntitiesDrawn({
            entities: [buildTextEntity(point, nextTextValue, textLayerName, {
              height: drawingTextHeight,
              rotation: drawingTextRotation,
              horizontalAlign: getTextHorizontalAlignCode(drawingTextAlignment || 'left'),
              verticalAlign: getTextVerticalAlignCode(drawingTextVerticalAlignment || 'baseline'),
              alignmentPoint: point
            })],
            mode: embeddedToolMode,
            notice: resolvedMessages.buildTextInsertedNotice({
              layerName: textLayerName,
              height: drawingTextHeight ?? 2.5,
              rotation: drawingTextRotation ?? 0,
              alignment: drawingTextAlignment || 'left',
              verticalAlignment: drawingTextVerticalAlignment || 'baseline'
            })
          });
          setEmbeddedDrawingPoints([]);
          return;
        }

        if (embeddedToolMode === 'line' || embeddedToolMode === 'distance') {
          if (embeddedDrawingPoints.length === 0) {
            setEmbeddedDrawingPoints([point]);
            return;
          }

          const startPoint = embeddedDrawingPoints[0];
          if (calculateDistance(startPoint, point) <= 0.001) {
            return;
          }

          if (embeddedToolMode === 'distance') {
            emitEntitiesDrawn({
              entities: buildDistanceAnnotationEntities(startPoint, point, annotationTargetLayerName),
              mode: embeddedToolMode,
              notice: resolvedMessages.buildDistanceCreatedNotice({
                distance: calculateDistance(startPoint, point),
                layerName: annotationTargetLayerName
              })
            });
          } else {
            emitEntitiesDrawn({
              entities: [buildLineEntity(startPoint, point, layerName)],
              mode: embeddedToolMode,
              notice: resolvedMessages.buildLineCreatedNotice({ layerName })
            });
          }
          setEmbeddedDrawingPoints([]);
          return;
        }

        if (embeddedToolMode === 'point-to-point') {
          appendPointToPointVertex(point);
          return;
        }

        if (embeddedToolMode === 'rectangle' || embeddedToolMode === 'circle') {
          if (embeddedDrawingPoints.length === 0) {
            setEmbeddedDrawingPoints([point]);
            return;
          }

          const startPoint = embeddedDrawingPoints[0];
          if (calculateDistance(startPoint, point) <= 0.001) {
            return;
          }

          emitEntitiesDrawn({
            entities: [embeddedToolMode === 'circle'
              ? buildCircleEntity(startPoint, point, layerName)
              : buildPolylineEntity(buildRectangleVertices(startPoint, point), layerName, true)],
            mode: embeddedToolMode,
            notice: embeddedToolMode === 'circle'
              ? resolvedMessages.buildCircleCreatedNotice({ layerName })
              : resolvedMessages.buildRectangleCreatedNotice({ layerName })
          });
          setEmbeddedDrawingPoints([]);
          return;
        }

        if (embeddedToolMode === 'bezier') {
          if (embeddedDrawingPoints.length < 2) {
            setEmbeddedDrawingPoints((current) => [...current, point]);
            return;
          }

          const [startPoint, controlPoint] = embeddedDrawingPoints;
          const vertices = sampleQuadraticBezier(startPoint, controlPoint, point);
          emitEntitiesDrawn({
            entities: [buildPolylineEntity(vertices, layerName, false)],
            mode: embeddedToolMode,
            notice: resolvedMessages.buildBezierCreatedNotice({ layerName })
          });
          setEmbeddedDrawingPoints([]);
          return;
        }
      }

      return;
    }

    const isShiftTextSelection = e.shiftKey && !(e.ctrlKey || e.metaKey);
    const isShiftSegmentSelection = e.shiftKey && (e.ctrlKey || e.metaKey);

    if (e.button === 0 && interactive && viewerMode === 'correct' && activeCorrectiveTool === 'close-gap-guided' && correctiveFocusPolygon) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (!dxfCoords || correctiveFocusPolygonIndex < 0) {
        return;
      }

      const snapDist = 20 / scale;
      const nearestFocusVertex = findNearestPoint(dxfCoords, correctiveFocusPolygon, snapDist * 1.2);
      if (!nearestFocusVertex) {
        return;
      }

      const vertexIndex = correctiveFocusPolygon.findIndex((point) => point.x === nearestFocusVertex.x && point.y === nearestFocusVertex.y);
      if (vertexIndex < 0) {
        return;
      }

      setSelectedCloseGapVertices((current) => {
        if (current.length === 0) {
          return [vertexIndex];
        }

        if (current.length === 1) {
          if (current[0] === vertexIndex) {
            return current;
          }

          const firstIndex = current[0];
          const firstPoint = correctiveFocusPolygon[firstIndex];
          const secondPoint = correctiveFocusPolygon[vertexIndex];
          if (!firstPoint || !secondPoint) {
            return [];
          }

          applyCloseGapGuidedCorrection({
            polygonIndex: correctiveFocusPolygonIndex,
            firstIndex,
            secondIndex: vertexIndex,
            lotNumber: correctiveFocusLotNumber,
            operationId: 'close-gap',
            label: `Fechar lacuna guiada do Lote ${correctiveFocusLotNumber ?? '?'} entre os vertices ${firstIndex + 1} e ${vertexIndex + 1}`
          });
          return [];
        }

        return [vertexIndex];
      });
      return;
    }

    if (e.button === 0 && interactive && viewerMode === 'correct' && activeCorrectiveTool === 'join-endpoints' && correctiveFocusPolygon) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (!dxfCoords || correctiveFocusPolygonIndex < 0) {
        return;
      }

      const snapDist = 20 / scale;
      const nearestFocusVertex = findNearestPoint(dxfCoords, correctiveFocusPolygon, snapDist * 1.2);
      if (!nearestFocusVertex) {
        return;
      }

      const vertexIndex = correctiveFocusPolygon.findIndex((point) => point.x === nearestFocusVertex.x && point.y === nearestFocusVertex.y);
      if (vertexIndex < 0) {
        return;
      }

      setSelectedJoinVertices((current) => {
        if (current.length === 0) {
          return [vertexIndex];
        }

        if (current.length === 1) {
          if (current[0] === vertexIndex) {
            return current;
          }

          const firstIndex = current[0];
          const firstPoint = correctiveFocusPolygon[firstIndex];
          const secondPoint = correctiveFocusPolygon[vertexIndex];
          if (!firstPoint || !secondPoint) {
            return [];
          }

          applyJoinEndpointsCorrection({
            polygonIndex: correctiveFocusPolygonIndex,
            firstIndex,
            secondIndex: vertexIndex,
            lotNumber: correctiveFocusLotNumber,
            operationId: 'join-endpoints',
            label: `Unir pontas do Lote ${correctiveFocusLotNumber ?? '?'} entre os vertices ${firstIndex + 1} e ${vertexIndex + 1}`
          });
          return [];
        }

        return [vertexIndex];
      });
      return;
    }

    if (e.button === 0 && interactive && viewerMode === 'correct' && activeCorrectiveTool === 'move-vertex' && correctiveFocusPolygon) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (!dxfCoords || correctiveFocusPolygonIndex < 0) {
        return;
      }

      const snapDist = 20 / scale;
      if (!selectedCorrectiveVertex) {
        const nearestFocusVertex = findNearestPoint(dxfCoords, correctiveFocusPolygon, snapDist * 1.2);
        if (!nearestFocusVertex) {
          return;
        }

        const vertexIndex = correctiveFocusPolygon.findIndex((point) => point.x === nearestFocusVertex.x && point.y === nearestFocusVertex.y);
        if (vertexIndex >= 0) {
          setSelectedCorrectiveVertex({ polygonIndex: correctiveFocusPolygonIndex, vertexIndex });
          setCorrectiveTargetPoint(null);
        }
        return;
      }

      const currentVertex = correctiveFocusPolygon[selectedCorrectiveVertex.vertexIndex];
      const snapCandidates = validPoints.filter((point) => calculateDistance(point, currentVertex) > 0.001);
      const nearestTargetPoint = findNearestPoint(dxfCoords, snapCandidates, snapDist * 1.2);
      if (!nearestTargetPoint) {
        return;
      }

      applyMoveVertexCorrection({
        polygonIndex: correctiveFocusPolygonIndex,
        vertexIndex: selectedCorrectiveVertex.vertexIndex,
        targetPoint: nearestTargetPoint,
        lotNumber: correctiveFocusLotNumber,
        operationId: 'move-vertex',
        label: `Mover vertice do Lote ${correctiveFocusLotNumber ?? '?'} para X ${nearestTargetPoint.x.toFixed(3)} / Y ${nearestTargetPoint.y.toFixed(3)}`
      });

      return;
    }

    if (e.button === 0 && interactive && isShiftTextSelection && dxfData) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (!dxfCoords) {
        return;
      }

      const now = Date.now();
      const lastShiftInteraction = lastShiftInteractionRef.current;
      if (
        lastShiftInteraction &&
        now - lastShiftInteraction.ts <= SHIFT_CLICK_DEDUP_MS &&
        calculateDistance(dxfCoords, { x: lastShiftInteraction.x, y: lastShiftInteraction.y }) <= SHIFT_CLICK_DEDUP_DISTANCE
      ) {
        return;
      }
      lastShiftInteractionRef.current = { x: dxfCoords.x, y: dxfCoords.y, ts: now };

      const nearestText = dxfData.entities
        .filter(isTextLikeEntity)
        .map((entity: DXFEntity) => {
          const position = extractTextPosition(entity);
          const text = String(entity.properties.text || '').trim();
          if (!position || !text) {
            return null;
          }

          return {
            entity,
            position,
            text,
            distance: calculateDistance(dxfCoords, position)
          };
        })
        .filter((candidate): candidate is { entity: DXFEntity; position: Point2D; text: string; distance: number } => candidate !== null)
        .sort((a, b) => a.distance - b.distance)[0];

      if (nearestText && nearestText.distance <= 25 / scale) {
        const isStreetReference = looksLikeStreetReference(nearestText.text);
        if (!isStreetReference && !isPointInsidePartialScope(nearestText.position)) {
          setSegmentInspectorMessage('Essa rua/confrontacao esta fora do escopo parcial confirmado.');
          return;
        }

        const selectedText: SelectedConfrontationText = {
          id: buildSelectedTextId(nearestText.entity, nearestText.position),
          text: nearestText.text,
          layer: nearestText.entity.layer,
          entityType: nearestText.entity.type,
          x: nearestText.position.x,
          y: nearestText.position.y
        };

        setSelectedConfrontationTexts((prev) => {
          const isAlreadySelected = prev.some((item) => item.id === selectedText.id);
          if (isAlreadySelected) {
            setSegmentAnnotations((annotations) => annotations.filter((item) => item.sourceTextId !== selectedText.id));
            setPendingConfrontationSegmentPoints([]);
            setActiveConfrontationTextId((current) => current === selectedText.id ? null : current);
            return prev.filter((item) => item.id !== selectedText.id);
          }
          setActiveConfrontationTextId(selectedText.id);
          return [...prev, selectedText];
        });
        return;
      }
      return;
    }

    if (e.button === 0 && interactive && isShiftSegmentSelection && dxfData) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (!dxfCoords) {
        return;
      }

      const now = Date.now();
      const lastShiftInteraction = lastShiftInteractionRef.current;
      if (
        lastShiftInteraction &&
        now - lastShiftInteraction.ts <= SHIFT_CLICK_DEDUP_MS &&
        calculateDistance(dxfCoords, { x: lastShiftInteraction.x, y: lastShiftInteraction.y }) <= SHIFT_CLICK_DEDUP_DISTANCE
      ) {
        return;
      }
      lastShiftInteractionRef.current = { x: dxfCoords.x, y: dxfCoords.y, ts: now };

      const pickedPoint = resolveConfrontationSnapPoint(dxfCoords);
      if (primaryBoundaryReady && !isPointInsidePartialScope(pickedPoint)) {
        setSegmentInspectorMessage('Esse trecho esta fora do escopo parcial confirmado.');
        return;
      }

      setPendingConfrontationSegmentPoints((prev) => {
        if (prev.length === 0) {
          return [pickedPoint];
        }

        const [startPoint] = prev;
        if (!startPoint) {
          return [];
        }

        const activeText = selectedConfrontationTexts.find((item) => item.id === activeConfrontationTextId);
        const annotation: SegmentConfrontationAnnotation = activeText
          ? {
              id: `${activeText.id}|${startPoint.x.toFixed(3)}|${startPoint.y.toFixed(3)}|${pickedPoint.x.toFixed(3)}|${pickedPoint.y.toFixed(3)}`,
              sourceTextId: activeText.id,
              text: activeText.text,
              layer: activeText.layer,
              entityType: activeText.entityType,
              selectionMode: 'segment',
              startPoint,
              endPoint: pickedPoint
            }
          : buildDirectSegmentAnnotation(startPoint, pickedPoint);

        setSegmentAnnotations((annotations) => [
          ...annotations.filter((item) => item.id !== annotation.id),
          annotation
        ]);
        setActiveConfrontationTextId(null);

        return [];
      });
      return;
    }

    if (e.button === 0 && e.altKey && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      const draftPoint = hoverSegmentTargetPoint ?? hoverPoint ?? dxfCoords;
      if (draftPoint && appendManualReviewPolygonPoint(draftPoint)) {
        suppressNextCanvasClickRef.current = true;
        return;
      }
    }

    startPanDrag(e.clientX, e.clientY);
  }, [
    activeConfrontationTextId,
    activeToolId,
    activeCorrectiveTool,
    activeLayerName,
    annotationLayerName,
    textAnnotationLayerName,
    textUsesAnnotationLayer,
    drawingTextHeight,
    drawingTextRotation,
    drawingTextAlignment,
    drawingTextVerticalAlignment,
    applyCloseGapGuidedCorrection,
    applyJoinEndpointsCorrection,
    applyMoveVertexCorrection,
    beginEntityDrag,
    beginEntityTransform,
    closePointToPointShape,
    closeSegmentContextMenu,
    correctiveFocusLotNumber,
    correctiveFocusPolygon,
    correctiveFocusPolygonIndex,
    detectedPolygons,
    drawingTextValue,
    dxfData,
    emitEntitiesDrawn,
    entityMultiSelectModeActive,
    embeddedMode,
    embeddedDrawingPoints,
    embeddedToolMode,
    enableGridSnap,
    enableObjectSnap,
    isPostDrawObjectSnapCooldownActive,
    findNearestSelectableEntity,
    getDxfCoords,
    hoverPoint,
    hoverPolygon,
    hoverSegmentTargetPoint,
    interactive,
    isGuidedTranslateToolActive,
    isEntityAdditiveSelectionActive,
    isPointInsidePartialScope,
    isTemporaryPanModifierActive,
    lastShiftInteractionRef,
    manualPolygon.length,
    onTextPlacementRequest,
    primaryBoundaryReady,
    resolveHoveredSelectionHandle,
    scale,
    segmentContextMenu.open,
    selectedConfrontationTexts,
    selectedCorrectiveVertex,
    selectedEntities,
    selectedEntityIds,
    setActiveConfrontationTextId,
    setCorrectiveTargetPoint,
    setEmbeddedDrawingPoints,
    setManualPolygon,
    setPendingConfrontationSegmentPoints,
    setSegmentInspectorMessage,
    setSegmentAnnotations,
    setSelectedCloseGapVertices,
    setSelectedConfrontationTexts,
    setSelectedCorrectiveVertex,
    setSelectedJoinVertices,
    setSelectedPolygons,
    setEntitySelectionBox,
    setSelectHoverCursor,
    setZoom,
    startPanDrag,
    appendPartialScopePolygonPoint,
    appendManualReviewPolygonPoint,
    validPoints
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingSelectedEntities && pendingEntityDragRef.current) {
      const deltaClientX = e.clientX - pendingEntityDragRef.current.startClientX;
      const deltaClientY = e.clientY - pendingEntityDragRef.current.startClientY;
      if (Math.hypot(deltaClientX, deltaClientY) >= ENTITY_DRAG_START_THRESHOLD_PX) {
        beginEntityDrag(pendingEntityDragRef.current.entity, pendingEntityDragRef.current.startPoint);
        suppressNextCanvasClickRef.current = true;
        pendingEntityDragRef.current = null;
      }
      return;
    }

    if (pendingEntityBoxSelectionRef.current) {
      const deltaClientX = e.clientX - pendingEntityBoxSelectionRef.current.startClientX;
      const deltaClientY = e.clientY - pendingEntityBoxSelectionRef.current.startClientY;
      const hasReachedThreshold = Math.hypot(deltaClientX, deltaClientY) >= BOX_SELECTION_START_THRESHOLD_PX;
      pendingEntityBoxSelectionRef.current.currentClientX = e.clientX;
      pendingEntityBoxSelectionRef.current.currentClientY = e.clientY;

      if (!hasReachedThreshold) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      suppressNextCanvasClickRef.current = true;
      setEntitySelectionBox({
        startX: pendingEntityBoxSelectionRef.current.startClientX - rect.left,
        startY: pendingEntityBoxSelectionRef.current.startClientY - rect.top,
        currentX: e.clientX - rect.left,
        currentY: e.clientY - rect.top
      });
      return;
    }

    if (pendingZoomBoxRef.current) {
      const deltaClientX = e.clientX - pendingZoomBoxRef.current.startClientX;
      const deltaClientY = e.clientY - pendingZoomBoxRef.current.startClientY;
      const hasReachedThreshold = Math.hypot(deltaClientX, deltaClientY) >= BOX_SELECTION_START_THRESHOLD_PX;
      pendingZoomBoxRef.current.currentClientX = e.clientX;
      pendingZoomBoxRef.current.currentClientY = e.clientY;

      if (!hasReachedThreshold) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      setZoomSelectionBox({
        startX: pendingZoomBoxRef.current.startClientX - rect.left,
        startY: pendingZoomBoxRef.current.startClientY - rect.top,
        currentX: e.clientX - rect.left,
        currentY: e.clientY - rect.top
      });
      return;
    }

    if (activeEditNodeDrag) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (dxfCoords) {
        updateEditNodeDrag(dxfCoords);
        const deltaX = dxfCoords.x - activeEditNodeDrag.currentPoint.x;
        const deltaY = dxfCoords.y - activeEditNodeDrag.currentPoint.y;
        if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
          suppressNextCanvasClickRef.current = true;
        }
      }
      return;
    }

    if (draggingSelectedEntities) {
      if (isCopyPreviewLocked) {
        return;
      }
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (dxfCoords) {
        updateEntityDragPreview(dxfCoords);
        const deltaX = dxfCoords.x - draggingSelectedEntities.startPoint.x;
        const deltaY = dxfCoords.y - draggingSelectedEntities.startPoint.y;
        if (!isGuidedTranslateToolActive && (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001)) {
          suppressNextCanvasClickRef.current = true;
        }
      }
      return;
    }

    if (activeEntityTransform) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (dxfCoords) {
        updateEntityTransformPreview(
          dxfCoords,
          activeEntityTransform.handle === 'rotate',
          e.shiftKey && activeEntityTransform.handle !== 'rotate',
          e.shiftKey && activeEntityTransform.handle === 'rotate'
        );
        suppressNextCanvasClickRef.current = true;
      }
      return;
    }

    if (isDragging) {
      updatePanDrag(e.clientX, e.clientY);
      setIsHoveringText(false);
      return;
    }

    if (embeddedMode && !interactive && embeddedToolMode === 'select') {
      if (isTemporaryPanModifierActive(e)) {
        setHoverSelectionHandle(null);
        setHoverSelectionMode(null);
        setHoverReferencePoint(null);
        setHoverPoint(null);
        setHoverSegmentTargetPoint(null);
        setHoverConfrontationText(null);
        setHoverPolygon(null);
        setIsHoveringText(false);
        setSelectHoverCursor('grab');
        return;
      }

      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (!dxfCoords) {
        setHoverSelectionHandle(null);
        setHoverSelectionMode(null);
        setHoverReferencePoint(null);
        setHoverPoint(null);
        setHoverSegmentTargetPoint(null);
        setHoverConfrontationText(null);
        setSelectHoverCursor('default');
        return;
      }

      const isShiftPressed = e.shiftKey;
      const isCtrlPressed = e.ctrlKey || e.metaKey;
      const isAltPressed = e.altKey;
      const shiftSegmentMode = isShiftPressed && isCtrlPressed;
      const shiftTextHoverMode = isShiftPressed && !isCtrlPressed;
      if (shiftSegmentMode || shiftTextHoverMode || (isShiftPressed && isCtrlPressed)) {
        const containingPolys = detectedPolygons.filter((polygon) => isPointInPolygon(dxfCoords, polygon));

        setHoverSelectionHandle(null);
        setHoverSelectionMode(null);
        setHoverPolygon(containingPolys.length > 0 ? containingPolys[0] : null);
        setHoverReferencePoint(null);
        setHoverPoint(null);
        setIsHoveringText(false);

        if (shiftSegmentMode) {
          setHoverSegmentTargetPoint(resolveConfrontationSnapPoint(dxfCoords));
          setHoverConfrontationText(null);
          setSelectHoverCursor('crosshair');
          return;
        }

        setHoverSegmentTargetPoint(null);
        if (shiftTextHoverMode) {
          const nearestText = getNearestHoverText(dxfData, dxfCoords);
          if (nearestText && nearestText.distance <= 25 / scale) {
            const { distance: _distance, ...hoverText } = nearestText;
            setHoverConfrontationText(hoverText);
            setIsHoveringText(true);
            setSelectHoverCursor('cell');
          } else {
            setHoverConfrontationText(null);
            setSelectHoverCursor('default');
          }
          return;
        }

        setHoverConfrontationText(null);
        setSelectHoverCursor('default');
        return;
      }

      const snapDist = 20 / scale;
      const manualSelectionHoverMode = isAltPressed && !isShiftPressed;
      const manualSelectionHoverPolygon = manualSelectionHoverMode
        ? (
          detectedPolygons
            .filter((polygon) => isPointInPolygon(dxfCoords, polygon))
            .sort((left, right) => calculatePolygonArea(left) - calculatePolygonArea(right))[0] ?? null
        )
        : null;
      const nearestReferencePoint = findNearestPoint(
        dxfCoords,
        matchedReferencePoints,
        Math.max(snapDist, 25 / scale)
      ) as HoverReferencePoint | null;
      const nearestHoverPoint = nearestReferencePoint ? null : findNearestPoint(dxfCoords, validPoints, snapDist);
      const canonicalHoverPoint = nearestReferencePoint
        ? null
        : (resolveCanonicalDetectedVertex(nearestHoverPoint, Math.max(DETECTED_VERTEX_CANONICAL_TOLERANCE * 1.5, snapDist * 0.2))
          ?? nearestHoverPoint
          ?? dxfCoords);
      setHoverReferencePoint(nearestReferencePoint);
      setHoverPoint(canonicalHoverPoint);
      setHoverSegmentTargetPoint(null);
      setHoverConfrontationText(null);
      setHoverPolygon(manualSelectionHoverPolygon);

      if (manualSelectionHoverMode) {
        const manualSelectionTargetPoint = resolveConfrontationSnapPoint(dxfCoords);
        setHoverSelectionHandle(null);
        setHoverSelectionMode(null);
        setHoverReferencePoint(null);
        setHoverPoint(null);
        setHoverSegmentTargetPoint(manualSelectionTargetPoint);
        setIsHoveringText(false);
        setSelectHoverCursor(manualSelectionHoverPolygon ? 'crosshair' : 'default');
        return;
      }

      if (isOffsetToolActive) {
        setHoverSelectionHandle(null);
        setHoverSelectionMode(null);
        setHoverPoint(nearestReferencePoint ? null : dxfCoords);
        const nearestEntity = findNearestSelectableEntity(dxfCoords);
        if (nearestEntity && selectedEntityIds.includes(nearestEntity.id)) {
          setSelectHoverCursor('copy');
          return;
        }
        setSelectHoverCursor('default');
        return;
      }

      if (isExtendToolActive) {
        setHoverSelectionHandle(null);
        setHoverSelectionMode(null);
        setHoverPoint(nearestReferencePoint ? null : dxfCoords);
        setSelectHoverCursor(hasExtendPreview ? 'alias' : 'default');
        return;
      }

      if (isTrimToolActive) {
        setHoverSelectionHandle(null);
        setHoverSelectionMode(null);
        setHoverPoint(nearestReferencePoint ? null : dxfCoords);
        setSelectHoverCursor(hasTrimPreview ? 'crosshair' : 'default');
        return;
      }

      if (isMirrorToolActive) {
        setHoverSelectionHandle(null);
        setHoverSelectionMode(null);
        const nearestEntity = findNearestSelectableEntity(dxfCoords);
        if (nearestEntity && selectedEntityIds.includes(nearestEntity.id)) {
          setSelectHoverCursor('crosshair');
          return;
        }
        setSelectHoverCursor('default');
        return;
      }

      if (isJoinToolActive) {
        setHoverSelectionHandle(null);
        setHoverSelectionMode(null);
        const nearestEntity = findNearestSelectableEntity(dxfCoords);
        if (nearestEntity && selectedEntityIds.includes(nearestEntity.id)) {
          setSelectHoverCursor('crosshair');
          return;
        }
        setSelectHoverCursor(selectedEntities.length >= 2 ? 'crosshair' : 'default');
        return;
      }

      if (isEditNodesToolActive) {
        setHoverSelectionHandle(null);
        setHoverSelectionMode(null);
        if (isEditNodeHandleAtPoint(dxfCoords)) {
          setSelectHoverCursor('crosshair');
          return;
        }
        const nearestEntity = findNearestSelectableEntity(dxfCoords);
        if (nearestEntity) {
          setSelectHoverCursor(selectedEntityIds.includes(nearestEntity.id) ? 'move' : 'default');
          return;
        }
        setSelectHoverCursor('default');
        return;
      }

      const hoveredHandle = resolveHoveredSelectionHandle(dxfCoords);
      if (hoveredHandle) {
        const rotationMode = hoveredHandle.kind === 'rotate' || isRotateToolActive || e.ctrlKey || e.metaKey;
        setHoverSelectionHandle(hoveredHandle.kind);
        setHoverSelectionMode(rotationMode ? 'rotate' : 'scale');
        setSelectHoverCursor(getSelectionHandleCursor(hoveredHandle.kind, rotationMode));
        return;
      }

      setHoverSelectionHandle(null);
      setHoverSelectionMode(null);
      const nearestEntity = findNearestSelectableEntity(dxfCoords);
      if (nearestEntity) {
        if (isRotateToolActive && selectedEntityIds.includes(nearestEntity.id)) {
          setHoverSelectionMode('rotate');
          setSelectHoverCursor(getSelectionHandleCursor('rotate', true));
          return;
        }
        if (isScaleToolActive && selectedEntityIds.includes(nearestEntity.id)) {
          setHoverSelectionMode('scale');
          setSelectHoverCursor('default');
          return;
        }
        setSelectHoverCursor(selectedEntityIds.includes(nearestEntity.id) ? 'move' : 'default');
        return;
      }

      setSelectHoverCursor('default');
      return;
    }

    if (embeddedMode && !interactive && isDrawingToolMode(embeddedToolMode)) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (!dxfCoords) {
        return;
      }

      const point = getResolvedDrawingPoint(dxfCoords, validPoints, scale, {
        enableGridSnap,
        enableObjectSnap: Boolean(enableObjectSnap && !isPostDrawObjectSnapCooldownActive()),
        gridSnapSize,
        gridOrigin,
        snapGuides
      });
      setHoverPoint(point);
      setHoverReferencePoint(null);
      setHoverSegmentTargetPoint(null);
      setHoverConfrontationText(null);
      setHoverPolygon(null);
      setIsHoveringText(false);
      return;
    }

    if (!interactive) {
      return;
    }

    const dxfCoords = getDxfCoords(e.clientX, e.clientY);
    if (!dxfCoords) {
      return;
    }

    const snapDist = 20 / scale;
    if (viewerMode === 'correct' && activeCorrectiveTool === 'close-gap-guided' && correctiveFocusPolygon) {
      const nearestFocusVertex = findNearestPoint(dxfCoords, correctiveFocusPolygon, snapDist * 1.2);
      setHoverPoint(nearestFocusVertex);
      setHoverReferencePoint(null);
      setHoverSegmentTargetPoint(null);
      setHoverConfrontationText(null);
      setHoverPolygon(correctiveFocusPolygon);
      return;
    }

    if (viewerMode === 'correct' && activeCorrectiveTool === 'join-endpoints' && correctiveFocusPolygon) {
      const nearestFocusVertex = findNearestPoint(dxfCoords, correctiveFocusPolygon, snapDist * 1.2);
      setHoverPoint(nearestFocusVertex);
      setHoverReferencePoint(null);
      setHoverSegmentTargetPoint(null);
      setHoverConfrontationText(null);
      setHoverPolygon(correctiveFocusPolygon);
      return;
    }

    if (viewerMode === 'correct' && activeCorrectiveTool === 'move-vertex' && correctiveFocusPolygon) {
      const nearestFocusVertex = findNearestPoint(dxfCoords, correctiveFocusPolygon, snapDist * 1.2);
      const currentVertex = selectedCorrectiveVertexPoint;
      const snapCandidates = currentVertex
        ? validPoints.filter((point) => calculateDistance(point, currentVertex) > 0.001)
        : [];
      const nearestTarget = currentVertex
        ? findNearestPoint(dxfCoords, snapCandidates, snapDist * 1.2)
        : null;

      setHoverPoint(selectedCorrectiveVertex ? null : nearestFocusVertex);
      setCorrectiveTargetPoint(selectedCorrectiveVertex ? nearestTarget : null);
      setHoverReferencePoint(null);
      setHoverSegmentTargetPoint(null);
      setHoverConfrontationText(null);
      setHoverPolygon(correctiveFocusPolygon);
      return;
    }

    const isShiftPressed = e.shiftKey;
    const isCtrlPressed = e.ctrlKey || e.metaKey;
    const shiftSegmentMode = isShiftPressed && isCtrlPressed;
    const shiftTextHoverMode = isShiftPressed && !isCtrlPressed;
    const containingPolys = detectedPolygons.filter((polygon) => isPointInPolygon(dxfCoords, polygon));

    if (shiftSegmentMode) {
      setHoverSegmentTargetPoint(resolveConfrontationSnapPoint(dxfCoords));
      setHoverConfrontationText(null);
      setHoverReferencePoint(null);
      setHoverPoint(null);
    } else if (shiftTextHoverMode) {
      setHoverPoint(null);
      setHoverReferencePoint(null);
      setHoverSegmentTargetPoint(null);

      const nearestText = getNearestHoverText(dxfData, dxfCoords);
      if (nearestText && nearestText.distance <= 25 / scale) {
        const { distance: _distance, ...hoverText } = nearestText;
        setHoverConfrontationText(hoverText);
      } else {
        setHoverConfrontationText(null);
      }
    } else if (isShiftPressed && isCtrlPressed) {
      setHoverPoint(null);
      setHoverReferencePoint(null);
      setHoverSegmentTargetPoint(null);
      setHoverConfrontationText(null);
    } else {
      lastShiftInteractionRef.current = null;
      const nearestReferencePoint = findNearestPoint(dxfCoords, matchedReferencePoints, Math.max(snapDist, 25 / scale)) as HoverReferencePoint | null;
      setHoverReferencePoint(nearestReferencePoint);
      const nearest = findNearestPoint(dxfCoords, validPoints, snapDist);
      setHoverPoint(
        nearestReferencePoint
          ? null
          : (resolveCanonicalDetectedVertex(nearest, Math.max(DETECTED_VERTEX_CANONICAL_TOLERANCE * 1.5, snapDist * 0.2)) ?? nearest)
      );
      setHoverSegmentTargetPoint(null);
      setHoverConfrontationText(null);
    }

    const nearestTextForCursor = getNearestHoverText(dxfData, dxfCoords);
    setIsHoveringText(Boolean(nearestTextForCursor && nearestTextForCursor.distance <= 25 / scale));

    if (containingPolys.length > 0) {
      containingPolys.sort((a, b) => calculatePolygonArea(a) - calculatePolygonArea(b));
      setHoverPolygon(containingPolys[0]);
    } else {
      setHoverPolygon(null);
    }
  }, [
    activeConfrontationTextId,
    activeCorrectiveTool,
    activeEditNodeDrag,
    activeEntityTransform,
    beginEntityDrag,
    correctiveFocusPolygon,
    detectedPolygons,
    draggingSelectedEntities,
    dxfData,
    embeddedMode,
    embeddedToolMode,
    enableGridSnap,
    enableObjectSnap,
    findNearestSelectableEntity,
    getDxfCoords,
    hoverPolygon,
    interactive,
    isEditNodeHandleAtPoint,
    isEditNodesToolActive,
    isExtendToolActive,
    hasExtendPreview,
    hasTrimPreview,
    isJoinToolActive,
    isMirrorToolActive,
    isOffsetToolActive,
    isTrimToolActive,
    isOffsetToolActive,
    isRotateToolActive,
    isScaleToolActive,
    isScaleToolActive,
    isTemporaryPanModifierActive,
    isPostDrawObjectSnapCooldownActive,
    isPostDrawObjectSnapCooldownActive,
    isDragging,
    lastShiftInteractionRef,
    matchedReferencePoints,
    resolveConfrontationSnapPoint,
    scale,
    gridOrigin,
    gridSnapSize,
    resolveHoveredSelectionHandle,
    selectedEntityIds,
    selectedCorrectiveVertex,
    selectedCorrectiveVertexPoint,
    setCorrectiveTargetPoint,
    setHoverConfrontationText,
    setHoverPoint,
    setHoverPolygon,
    setHoverReferencePoint,
    setHoverSegmentTargetPoint,
    setEntitySelectionBox,
    setIsHoveringText,
    setSelectHoverCursor,
    suppressNextCanvasClickRef,
    updateEditNodeDrag,
    updateEntityTransformPreview,
    updatePanDrag,
    validPoints,
    viewerMode
  ]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (embeddedMode && !interactive && isDrawingToolMode(embeddedToolMode)) {
      e.preventDefault();
      if (embeddedToolMode === 'point-to-point' && commitPointToPointDrawing('Polilinha finalizada pelo menu contextual.')) {
        return;
      }
      cancelEmbeddedDrawing();
      return;
    }

    if (!interactive) {
      return;
    }

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const dxfCoords = getDxfCoords(e.clientX, e.clientY);
    const nearestSegment = dxfCoords ? findNearestRawSegment(dxfCoords) : null;
    setSegmentContextMenu({
      open: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      nearestSegmentId: nearestSegment?.id || null
    });
  }, [
    cancelEmbeddedDrawing,
    appendPointToPointVertex,
    commitPointToPointDrawing,
    embeddedMode,
    embeddedToolMode,
    findNearestRawSegment,
    getDxfCoords,
    interactive,
    setSegmentContextMenu
  ]);

  const handleMouseUp = useCallback((e?: React.MouseEvent<HTMLCanvasElement>) => {
    pendingEntityDragRef.current = null;
    if (pendingEntityBoxSelectionRef.current) {
      const { additiveSelection, currentClientX, currentClientY, startClientX, startClientY } = pendingEntityBoxSelectionRef.current;
      if (e && dxfData) {
        const startPoint = getDxfCoords(startClientX, startClientY);
        const endPoint = getDxfCoords(currentClientX, currentClientY);
        if (startPoint && endPoint) {
          const selectionRect = normalizeSelectionRect(startPoint, endPoint);
          const nextSelectedIds = dxfData.entities
            .map((entity, index) => {
              if (canInteractWithEntity && !canInteractWithEntity(entity)) {
                return null;
              }
              const bounds = getEntityBounds(entity);
              if (!bounds || !boundsIntersectSelectionRect(bounds, selectionRect)) {
                return null;
              }
              return buildEntitySelectionId(entity, index);
            })
            .filter((entityId): entityId is string => entityId !== null);

          setSelectedEntityIds((current) => {
            if (additiveSelection) {
              return Array.from(new Set([...current, ...nextSelectedIds]));
            }
            return nextSelectedIds;
          });
          if (nextSelectedIds.length > 0 || !additiveSelection) {
            suppressNextCanvasClickRef.current = true;
          }
        }
      }
      pendingEntityBoxSelectionRef.current = null;
      setEntitySelectionBox(null);
    }
    if (pendingZoomBoxRef.current) {
      const { currentClientX, currentClientY, startClientX, startClientY } = pendingZoomBoxRef.current;
      if (e) {
        const startPoint = getDxfCoords(startClientX, startClientY);
        const endPoint = getDxfCoords(currentClientX, currentClientY);
        const dragDistance = Math.hypot(currentClientX - startClientX, currentClientY - startClientY);
        if (startPoint && endPoint) {
          const didApplyZoom = dragDistance >= BOX_SELECTION_START_THRESHOLD_PX
            ? zoomToArea(startPoint, endPoint)
            : zoomToPoint(endPoint, e.shiftKey ? 1 / 1.2 : 1.2);
          if (didApplyZoom) {
            suppressNextCanvasClickRef.current = true;
          }
        }
      }
      pendingZoomBoxRef.current = null;
      setZoomSelectionBox(null);
    }
    if (activeEditNodeDrag) {
      const didCommitEditNode = commitEditNodeDrag();
      if (didCommitEditNode) {
        suppressNextCanvasClickRef.current = true;
      }
      cancelEditNodeDrag();
    }
    if (draggingSelectedEntities && e) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (dxfCoords && !isGuidedTranslateToolActive) {
        const move = commitEntityDrag(dxfCoords);
        if (move) {
          suppressNextCanvasClickRef.current = true;
        }
      }
    }
    if (activeEntityTransform) {
      const didCommitTransform = commitEntityTransform();
      if (didCommitTransform) {
        suppressNextCanvasClickRef.current = true;
      }
    }
    endEntityTransform();
    if (!isGuidedTranslateToolActive) {
      endEntityDrag();
    }
    setHoverSelectionHandle(null);
    setHoverSelectionMode(null);
    setSelectHoverCursor('default');
    stopPanDrag();
  }, [
    activeEditNodeDrag,
    activeEntityTransform,
    canInteractWithEntity,
    cancelEditNodeDrag,
    commitEntityDrag,
    commitEditNodeDrag,
    commitEntityTransform,
    dxfData,
    draggingSelectedEntities,
    endEntityTransform,
    endEntityDrag,
    getDxfCoords,
    isExtendToolActive,
    isGuidedTranslateToolActive,
    setEntitySelectionBox,
    setZoomSelectionBox,
    setHoverSelectionHandle,
    setHoverSelectionMode,
    setSelectedEntityIds,
    setSelectHoverCursor,
    stopPanDrag,
    suppressNextCanvasClickRef,
    zoomToArea,
    zoomToPoint
  ]);

  const embeddedCursor = activeEntityTransform
    ? (activeEntityTransform.handle === 'rotate' ? 'grabbing' : selectHoverCursor)
    : draggingSelectedEntities
    ? (isCopyToolActive ? 'copy' : 'move')
    : embeddedToolMode === 'pan'
      ? (isDragging ? 'grabbing' : 'grab')
      : (embeddedToolMode === 'zoom'
        ? 'zoom-in'
        : (isDrawingToolMode(embeddedToolMode)
          ? 'crosshair'
          : (embeddedToolMode === 'select' ? selectHoverCursor : 'default')));

  return {
    cancelEmbeddedDrawing,
    appendPointToPointVertex,
    copyPlacementLocked,
    commitPointToPointDrawing,
    clearSegmentSelection,
    closeSegmentContextMenu,
    embeddedCursor,
    hoverSelectionHandle,
    hoverSelectionMode,
    handleCanvasClick,
    handleCheckSelectedSegments,
    handleClearBridges,
    handleCloseGapFromSelectedSegments,
    handleContextMenu,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleRemoveLastBridge,
    toggleSegmentSelection
  };
};
