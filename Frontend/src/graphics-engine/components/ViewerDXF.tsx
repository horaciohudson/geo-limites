import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { type DXFData, type DXFEntity, type DXFEntityProperties } from '@/graphics-engine/shared/dxf';
import { calculateDistance, calculatePolygonArea, type Point2D } from '@/graphics-engine/shared/geometry';
import { parseDxfAsync } from '@/graphics-engine/shared/dxfParseAsync';
import {
  buildSelectedEntityInfo,
  findNearestSelectableEntityInfo,
  getEntityBounds
} from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import {
  extractGeometryVertices,
} from '@/graphics-engine/components/viewer-dxf/georeferencingUtils';
import {
  pointToSegmentDistance
} from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import {
  summarizePolygonTexts
} from '@/graphics-engine/components/viewer-dxf/lotSelectionUtils';
import { useCanvasViewport } from '@/graphics-engine/components/viewer-dxf/useCanvasViewport';
import { useEmbeddedEntitySelection } from '@/graphics-engine/components/viewer-dxf/useEmbeddedEntitySelection';
import { useViewerCanvasRenderer } from '@/graphics-engine/components/viewer-dxf/useViewerCanvasRenderer';
import { useViewerCanvasInteractions } from '@/graphics-engine/components/viewer-dxf/useViewerCanvasInteractions';
import {
  DEFAULT_DXF_TEXT_LOADER,
  DEFAULT_VIEWER_DXF_HOST_ADAPTER,
  DEFAULT_VIEWER_TEXTS,
  type ViewerDXFHostAdapter,
  type ViewerRawSegment
} from '@/graphics-engine/components/viewer-dxf/hostAdapter';
import {
  findEditableNodeHandleAtPoint,
  findNearestNodeSnapTarget,
  getEditableNodeHandles,
  type EditableNodeHandle
} from '@/graphics-engine/components/viewer-dxf/nodeEditUtils';
import { buildExtendEntityPreview, buildExtendHoverCandidate, isExtendSupportedEntity } from '@/graphics-engine/components/viewer-dxf/extendUtils';
import { buildOffsetEntityPreview, buildPreviewOverlaySegmentsFromEntity, isOffsetSupportedEntity } from '@/graphics-engine/components/viewer-dxf/offsetUtils';
import { buildTrimEntityPreview, isTrimSupportedEntity } from '@/graphics-engine/components/viewer-dxf/trimUtils';
import { getEntityMirrorAxisX, mirrorEntityAcrossVerticalAxis } from '@/graphics-engine/pages/cad-editor/cadEditorEntityUtils';
import { ViewerHeaderPanel } from '@/graphics-engine/components/viewer-dxf/ViewerHeaderPanel';
import { ViewerSegmentContextMenu } from '@/graphics-engine/components/viewer-dxf/ViewerSegmentContextMenu';
import { buildDrawingPreview, isDrawingToolMode } from '@/graphics-engine/components/viewer-dxf/cadDrawingUtils';
import type {
  HoverConfrontationText,
  HoverReferencePoint,
  SegmentConfrontationAnnotation,
  SelectedConfrontationText
} from '@/graphics-engine/components/viewer-dxf/viewerState';
import type { ViewerDXFProps } from '@/graphics-engine/components/viewer-dxf/types';

interface ErrorLike {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const errorLike = error as ErrorLike;
    if (errorLike.response?.status === 404) {
      return 'Arquivo DXF nao encontrado no servidor.';
    }
    return errorLike.response?.data?.message || errorLike.message || fallback;
  }

  return fallback;
};

const normalizeAngleDegrees = (value: number): number => {
  const normalized = ((value % 360) + 360) % 360;
  return normalized === 360 ? 0 : normalized;
};

const formatCadFieldValue = (value: number, decimals: number): string => (
  Number.isFinite(value) ? value.toFixed(decimals) : ''
);

const parseCadFieldValue = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildPolarPoint = (origin: Point2D, distance: number, angleDegrees: number): Point2D => {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: origin.x + Math.cos(angleRadians) * distance,
    y: origin.y + Math.sin(angleRadians) * distance
  };
};

const DEBUG_SELECTION_URL = 'http://127.0.0.1:7778/event';
const DEBUG_SELECTION_SESSION = 'lot-selection-mismatch';
const DEBUG_SELECTION_ENABLED = false;
const EXTEND_HOVER_PICK_RADIUS_PX = 28;
const EXTEND_RAY_PICK_RADIUS_PX = 16;

const getTrimEntityLabel = (entity: DXFEntity | null | undefined): string => {
  if (!entity) {
    return 'geometria';
  }

  if (entity.type === 'LINE') {
    return 'linha';
  }

  if (entity.type === 'ARC') {
    return 'arco';
  }

  if (entity.type === 'CIRCLE') {
    return 'circulo';
  }

  if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
    const props = entity.properties as DXFEntityProperties;
    return props.closed ? 'polilinha fechada' : 'polilinha aberta';
  }

  return 'geometria';
};

const getExtendEntityLabel = (entity: DXFEntity | null | undefined): string => {
  if (!entity) {
    return 'geometria';
  }

  if (entity.type === 'LINE') {
    return 'linha';
  }

  if (entity.type === 'ARC') {
    return 'arco';
  }

  if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
    return 'polilinha aberta';
  }

  return 'geometria';
};

const evaluateExtendHoverScore = (
  candidate: NonNullable<ReturnType<typeof buildExtendHoverCandidate>>,
  referencePoint: Point2D,
  scale: number
): number | null => {
  const endpointPickRadius = EXTEND_HOVER_PICK_RADIUS_PX / Math.max(scale, 0.0001);
  const rayPickRadius = EXTEND_RAY_PICK_RADIUS_PX / Math.max(scale, 0.0001);
  const deltaX = referencePoint.x - candidate.sourcePoint.x;
  const deltaY = referencePoint.y - candidate.sourcePoint.y;
  const alongDistance = (deltaX * candidate.direction.x) + (deltaY * candidate.direction.y);

  if (candidate.sourceDistance <= endpointPickRadius) {
    return candidate.sourceDistance;
  }

  if (alongDistance <= 0) {
    return null;
  }

  const closestPointOnRay = {
    x: candidate.sourcePoint.x + (candidate.direction.x * alongDistance),
    y: candidate.sourcePoint.y + (candidate.direction.y * alongDistance)
  };
  const perpendicularDistance = calculateDistance(referencePoint, closestPointOnRay);
  if (perpendicularDistance > rayPickRadius) {
    return null;
  }

  return endpointPickRadius + perpendicularDistance;
};

const sendSelectionDebug = (hypothesisId: string, location: string, msg: string, data: Record<string, unknown>) => {
  if (!DEBUG_SELECTION_ENABLED) {
    return;
  }
  // #region debug-point A:browser-selection-report
  fetch(DEBUG_SELECTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: DEBUG_SELECTION_SESSION,
      runId: 'pre-fix',
      hypothesisId,
      location,
      msg,
      data,
      ts: Date.now()
    })
  }).catch(() => {});
  // #endregion
};

interface ActiveEditNodeDrag {
  handle: EditableNodeHandle;
  currentPoint: Point2D;
  snappedHandle: EditableNodeHandle | null;
}

type ViewerDXFComponentProps = ViewerDXFProps & {
  hostAdapter?: ViewerDXFHostAdapter;
};

const ViewerDXF: React.FC<ViewerDXFComponentProps> = ({
  hostAdapter,
  fileId,
  dxfTextLoader: explicitDxfTextLoader,
  data,
  boundsData,
  className,
  embeddedMode = false,
  embeddedToolMode = 'select',
  activeToolId,
  entityMultiSelectModeActive = false,
  drawingTextValue: explicitDrawingTextValue,
  drawingTextHeight = 2.5,
  drawingTextRotation = 0,
  drawingTextAlignment = 'left',
  drawingTextVerticalAlignment = 'baseline',
  closePointToPointShape = false,
  annotationLayerName,
  textAnnotationLayerName,
  textUsesAnnotationLayer = false,
  showGrid = true,
  showHoverCoordinates = true,
  enableObjectSnap = true,
  enableGridSnap = false,
  gridSnapSize = 10,
  gridMajorStep,
  minimumWorkspaceSize,
  viewportCommand,
  onViewportStateChange,
  onEntitySelectionChange,
  onEntityCopy,
  onEntityEditNode,
  onEntityExtend,
  onEntityTrim,
  onEntityMirror,
  onEntityOffset,
  onEntityWeld,
  weldCanApply = false,
  weldReason,
  onEntityTranslate,
  onEntityTransform,
  onDXFDataLoaded,
  onInitialCanvasRendered,
  interactive,
  activeLayerName,
  selectedEntityIdsOverride,
  clearConfrontationSelectionNonce,
  overlaySegments = [],
  overlayPoints = [],
  snapGuides = [],
  onEntitiesDrawn,
  onTextPlacementRequest,
  onConfrontationSelectionChange,
  onReferencePointsChange,
  onPolygonConfirmed,
  onSelectionSummaryChange,
  onGenerateTechnicalSummary,
  isGeneratingTechnicalSummary,
  primaryBoundaryReady = false,
  allowLotSelectionWithoutPrimaryBoundary = false,
  showDetectedPolygonMeasurements = false,
  propertyLandmarks,
  viewerMode = 'view',
  correctiveFocusLotNumber = null,
  recentlyCorrectedLotNumber = null,
  activeCorrectiveTool = 'inspect',
  onRegisterCorrectiveDraftOperation,
  correctiveSnapshotFileId,
  onCorrectiveSnapshotChanged,
  correctiveHistoryCommand,
  correctiveSuggestionCommand,
  onCorrectiveHistoryStatusChange,
  correctiveIssues = [],
  onCorrectiveLotInspectionChange,
  manualReviewLotNumbers = [],
  onManualReviewLotSelectionChange,
  restoredCorrectiveSnapshot = null
}) => {
  const resolvedHostAdapter = hostAdapter ?? DEFAULT_VIEWER_DXF_HOST_ADAPTER;
  const resolvedViewerTexts = resolvedHostAdapter.viewerTexts ?? DEFAULT_VIEWER_TEXTS;
  const resolvedDxfTextLoader = explicitDxfTextLoader ?? resolvedHostAdapter.dxfTextLoader ?? DEFAULT_DXF_TEXT_LOADER;
  const drawingTextValue = explicitDrawingTextValue ?? resolvedViewerTexts.defaultTextValue;
  const useViewerLotDetection = resolvedHostAdapter.useLotDetection;
  const useViewerCorrectiveExecution = resolvedHostAdapter.useCorrectiveExecution;
  const useViewerIntegration = resolvedHostAdapter.useViewerIntegration;
  const useViewerSelectionSummary = resolvedHostAdapter.useSelectionSummary;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointToPointDistanceInputRef = useRef<HTMLInputElement>(null);
  const pointToPointAngleInputRef = useRef<HTMLInputElement>(null);
  const lastShiftInteractionRef = useRef<{ x: number; y: number; ts: number } | null>(null);
  const suppressNextCanvasClickRef = useRef(false);
  const [dxfData, setDxfData] = useState<DXFData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const canInteractWithEntity = useCallback((entity: DXFEntity) => (
    !activeLayerName || entity.layer === activeLayerName
  ), [activeLayerName]);
  const {
    drawingBounds,
    getDxfCoords,
    handleCenterDrawing,
    handleResetView,
    handleWheel,
    isDragging,
    pan,
    scale,
    setDrawingBounds,
    setScale,
    setValidPoints,
    setZoom,
    startPanDrag,
    stopPanDrag,
    updatePanDrag,
    validPoints,
    zoomToArea,
    zoomToPoint,
    zoom
  } = useCanvasViewport({
    canvasRef,
    viewportCommand,
    onViewportStateChange
  });
  const [manualPolygon, setManualPolygon] = useState<Point2D[]>([]);
  const [partialScopePolygons, setPartialScopePolygons] = useState<Point2D[][]>([]);
  const [selectedPolygons, setSelectedPolygons] = useState<Point2D[][]>([]);
  const [selectedConfrontationTexts, setSelectedConfrontationTexts] = useState<SelectedConfrontationText[]>([]);
  const [activeConfrontationTextId, setActiveConfrontationTextId] = useState<string | null>(null);
  const [pendingConfrontationSegmentPoints, setPendingConfrontationSegmentPoints] = useState<Point2D[]>([]);
  const [segmentAnnotations, setSegmentAnnotations] = useState<SegmentConfrontationAnnotation[]>([]);
  const [hoverPoint, setHoverPoint] = useState<Point2D | null>(null);
  const [hoverReferencePoint, setHoverReferencePoint] = useState<HoverReferencePoint | null>(null);
  const [hoverPolygon, setHoverPolygon] = useState<Point2D[] | null>(null);
  const [hoverConfrontationText, setHoverConfrontationText] = useState<HoverConfrontationText | null>(null);
  const [hoverSegmentTargetPoint, setHoverSegmentTargetPoint] = useState<Point2D | null>(null);
  const [correctedPolygons, setCorrectedPolygons] = useState<Point2D[][]>([]);
  const [gridOrigin, setGridOrigin] = useState<Point2D>({ x: 0, y: 0 });
  const [isHoveringText, setIsHoveringText] = useState(false);
  const [selectedCorrectiveVertex, setSelectedCorrectiveVertex] = useState<{ polygonIndex: number; vertexIndex: number } | null>(null);
  const [correctiveTargetPoint, setCorrectiveTargetPoint] = useState<Point2D | null>(null);
  const [selectedJoinVertices, setSelectedJoinVertices] = useState<number[]>([]);
  const [selectedCloseGapVertices, setSelectedCloseGapVertices] = useState<number[]>([]);
  const [manualBridgeSegments, setManualBridgeSegments] = useState<Array<{ p1: Point2D; p2: Point2D }>>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [segmentInspectorMessage, setSegmentInspectorMessage] = useState<string>('');
  const [embeddedDrawingPoints, setEmbeddedDrawingPoints] = useState<Point2D[]>([]);
  const [entitySelectionBox, setEntitySelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [zoomSelectionBox, setZoomSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const lastHandledClearConfrontationSelectionNonceRef = useRef<number>(0);
  const [activeEditNodeDrag, setActiveEditNodeDrag] = useState<ActiveEditNodeDrag | null>(null);
  const [segmentContextMenu, setSegmentContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    nearestSegmentId: string | null;
  }>({ open: false, x: 0, y: 0, nearestSegmentId: null });
  const [pointToPointDistanceInput, setPointToPointDistanceInput] = useState('');
  const [pointToPointAngleInput, setPointToPointAngleInput] = useState('');
  const [pointToPointDistanceDirty, setPointToPointDistanceDirty] = useState(false);
  const [pointToPointAngleDirty, setPointToPointAngleDirty] = useState(false);
  const [pointToPointActiveField, setPointToPointActiveField] = useState<'distance' | 'angle' | null>(null);

  const pointToPointBasePoint = useMemo(
    () => embeddedToolMode === 'point-to-point' && embeddedDrawingPoints.length > 0
      ? embeddedDrawingPoints[embeddedDrawingPoints.length - 1]
      : null,
    [embeddedDrawingPoints, embeddedToolMode]
  );
  const pointToPointVisualMetrics = useMemo(() => {
    if (!pointToPointBasePoint || !hoverPoint) {
      return null;
    }

    const deltaX = hoverPoint.x - pointToPointBasePoint.x;
    const deltaY = hoverPoint.y - pointToPointBasePoint.y;
    return {
      distance: calculateDistance(pointToPointBasePoint, hoverPoint),
      angleDegrees: normalizeAngleDegrees(Math.atan2(deltaY, deltaX) * (180 / Math.PI))
    };
  }, [hoverPoint, pointToPointBasePoint]);
  const pointToPointDistanceValue = pointToPointDistanceDirty
    ? parseCadFieldValue(pointToPointDistanceInput)
    : pointToPointVisualMetrics?.distance ?? null;
  const pointToPointAngleValue = pointToPointAngleDirty
    ? parseCadFieldValue(pointToPointAngleInput)
    : pointToPointVisualMetrics?.angleDegrees ?? null;
  const pointToPointPreviewPoint = useMemo(() => {
    if (
      !pointToPointBasePoint
      || pointToPointDistanceValue === null
      || pointToPointAngleValue === null
      || pointToPointDistanceValue <= 0.001
    ) {
      return null;
    }

    return buildPolarPoint(
      pointToPointBasePoint,
      pointToPointDistanceValue,
      normalizeAngleDegrees(pointToPointAngleValue)
    );
  }, [pointToPointAngleValue, pointToPointBasePoint, pointToPointDistanceValue]);
  const effectiveDrawingHoverPoint = embeddedToolMode === 'point-to-point'
    ? (pointToPointPreviewPoint ?? hoverPoint)
    : hoverPoint;

  const geometryVertices = useMemo(() => extractGeometryVertices(dxfData), [dxfData]);
  const {
    rawSegments,
    detectedPolygons,
    detectedPolygonEntries,
    extractionTolerance: segmentExtractionTolerance,
    segmentMedianLength
  } = useViewerLotDetection({
    dxfData,
    manualBridgeSegments
  });
  const selectedSegments = useMemo(
    () => rawSegments.filter((segment) => selectedSegmentIds.includes(segment.id)),
    [rawSegments, selectedSegmentIds]
  );
  const embeddedDrawingPreview = useMemo(
    () => buildDrawingPreview(embeddedToolMode, embeddedDrawingPoints, effectiveDrawingHoverPoint, {
      closePointToPointShape,
      drawingTextValue,
      drawingTextHeight,
      drawingTextRotation,
      drawingTextAlignment,
      drawingTextVerticalAlignment
    }),
    [
      closePointToPointShape,
      drawingTextAlignment,
      drawingTextHeight,
      drawingTextRotation,
      drawingTextValue,
      drawingTextVerticalAlignment,
      effectiveDrawingHoverPoint,
      embeddedDrawingPoints,
      embeddedToolMode
    ]
  );
  const drawingPreviewLabel = useMemo(() => {
    if (embeddedToolMode === 'distance' && embeddedDrawingPoints.length === 1 && hoverPoint) {
      return `Cota em curso: ${calculateDistance(embeddedDrawingPoints[0], hoverPoint).toFixed(3)}`;
    }

    if (embeddedToolMode === 'text' && hoverPoint) {
      return resolvedViewerTexts.buildTextPreviewLabel({
        textValue: drawingTextValue,
        defaultTextValue: resolvedViewerTexts.defaultTextValue,
        height: drawingTextHeight,
        rotation: drawingTextRotation,
        alignment: drawingTextAlignment,
        verticalAlignment: drawingTextVerticalAlignment
      });
    }

    if (embeddedToolMode === 'point-to-point' && embeddedDrawingPoints.length > 0) {
      const details = [];
      if (pointToPointDistanceValue !== null && pointToPointDistanceValue > 0.001) {
        details.push(`dist ${pointToPointDistanceValue.toFixed(3)}`);
      }
      if (pointToPointAngleValue !== null) {
        details.push(`ang ${normalizeAngleDegrees(pointToPointAngleValue).toFixed(1)}°`);
      }
      details.push(closePointToPointShape ? 'fechamento ativo' : 'polilinha aberta');
      details.push('Enter aplica');
      return `Vertices no rascunho: ${embeddedDrawingPoints.length} | ${details.join(' | ')}`;
    }

    return null;
  }, [
    closePointToPointShape,
    drawingTextAlignment,
    drawingTextHeight,
    drawingTextRotation,
    drawingTextValue,
    drawingTextVerticalAlignment,
    embeddedDrawingPoints,
    embeddedToolMode,
    hoverPoint,
    pointToPointAngleValue,
    pointToPointDistanceValue
  ]);
  const mergedOverlaySegments = useMemo(
    () => [...overlaySegments, ...embeddedDrawingPreview.segments],
    [embeddedDrawingPreview.segments, overlaySegments]
  );
  const mergedOverlayPoints = useMemo(
    () => [...overlayPoints, ...embeddedDrawingPreview.points],
    [embeddedDrawingPreview.points, overlayPoints]
  );
  const segmentPickRadius = useMemo(() => Math.max(0.5, 18 / Math.max(scale, 0.0001)), [scale]);
  const {
    activeEntityTransform,
    beginEntityDrag,
    beginEntityTransform,
    commitEntityDrag,
    commitEntityTransform,
    draggingSelectedEntities,
    endEntityDrag,
    endEntityTransform,
    findNearestSelectableEntity,
    handleEmbeddedEntitySelection,
    selectedEntities,
    selectedEntityIds,
    setSelectedEntityIds,
    updateEntityDragPreview,
    updateEntityTransformPreview,
  } = useEmbeddedEntitySelection({
    canSelectEntity: canInteractWithEntity,
    dxfData,
    onEntitySelectionChange,
    onEntityTransform,
    onEntityTranslate,
    scale,
    selectedEntityIdsOverride
  });
  const isGuidedMoveTool = activeToolId === 'move';
  const isGuidedCopyTool = activeToolId === 'copy';
  const isEditNodesTool = activeToolId === 'edit-nodes';
  const isMirrorTool = activeToolId === 'mirror';
  const isOffsetTool = activeToolId === 'offset';
  const isExtendTool = activeToolId === 'extend';
  const isTrimTool = activeToolId === 'trim';
  const isJoinTool = activeToolId === 'join';
  const isGuidedTranslateTool = isGuidedMoveTool || isGuidedCopyTool;
  const editableNodeHandles = useMemo(
    () => getEditableNodeHandles(dxfData, selectedEntities),
    [dxfData, selectedEntities]
  );
  const commitEntityCopy = useCallback((endPoint: Point2D) => {
    if (!draggingSelectedEntities) {
      return null;
    }

    const deltaX = endPoint.x - draggingSelectedEntities.startPoint.x;
    const deltaY = endPoint.y - draggingSelectedEntities.startPoint.y;
    if (Math.abs(deltaX) <= 0.001 && Math.abs(deltaY) <= 0.001) {
      return null;
    }

    onEntityCopy?.({
      entity: draggingSelectedEntities.entity,
      entities: draggingSelectedEntities.entities,
      deltaX,
      deltaY
    });

    return { deltaX, deltaY };
  }, [draggingSelectedEntities, onEntityCopy]);

  const selectedEntityPreviewTransform = activeEntityTransform?.previewTransform || (
    draggingSelectedEntities && !isGuidedCopyTool
      ? {
          mode: 'translate' as const,
          deltaX: draggingSelectedEntities.currentPoint.x - draggingSelectedEntities.startPoint.x,
          deltaY: draggingSelectedEntities.currentPoint.y - draggingSelectedEntities.startPoint.y
        }
      : null
  );
  const copyEntityPreviewTransform = draggingSelectedEntities && isGuidedCopyTool
    ? {
        mode: 'translate' as const,
        deltaX: draggingSelectedEntities.currentPoint.x - draggingSelectedEntities.startPoint.x,
        deltaY: draggingSelectedEntities.currentPoint.y - draggingSelectedEntities.startPoint.y
      }
    : null;
  const offsetPreview = useMemo(() => {
    if (!isOffsetTool || !hoverPoint || selectedEntities.length !== 1 || !dxfData) {
      return null;
    }

    const sourceEntity = dxfData.entities[selectedEntities[0].index];
    if (!sourceEntity) {
      return null;
    }

    return buildOffsetEntityPreview(sourceEntity, hoverPoint);
  }, [dxfData, hoverPoint, isOffsetTool, selectedEntities]);
  const resolveExtendPreviewAtPoint = useCallback((referencePoint: Point2D | null) => {
    if (!isExtendTool || !referencePoint || !dxfData) {
      return null;
    }

    let bestHoverCandidate: ReturnType<typeof buildExtendHoverCandidate> = null;
    let bestHoverScore = Number.POSITIVE_INFINITY;

    for (let index = dxfData.entities.length - 1; index >= 0; index -= 1) {
      const entity = dxfData.entities[index];
      if (!isExtendSupportedEntity(entity) || !canInteractWithEntity(entity)) {
        continue;
      }

      const candidateInfo = buildSelectedEntityInfo(entity, index);
      const candidateHover = buildExtendHoverCandidate(entity, candidateInfo, referencePoint);
      if (!candidateHover) {
        continue;
      }

      const hoverScore = evaluateExtendHoverScore(candidateHover, referencePoint, scale);
      if (hoverScore === null) {
        continue;
      }

      if (hoverScore < bestHoverScore) {
        bestHoverCandidate = candidateHover;
        bestHoverScore = hoverScore;
      }
    }

    if (!bestHoverCandidate) {
      return null;
    }

    const bestPreview = buildExtendEntityPreview(dxfData, bestHoverCandidate.entityInfo, referencePoint);
    if (!bestPreview) {
      return null;
    }

    return bestPreview;
  }, [canInteractWithEntity, dxfData, isExtendTool, scale]);
  const extendHoverCandidate = useMemo(() => {
    if (!isExtendTool || !hoverPoint || !dxfData) {
      return null;
    }

    let bestHoverCandidate: ReturnType<typeof buildExtendHoverCandidate> = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = dxfData.entities.length - 1; index >= 0; index -= 1) {
      const entity = dxfData.entities[index];
      if (!isExtendSupportedEntity(entity) || !canInteractWithEntity(entity)) {
        continue;
      }

      const candidateInfo = buildSelectedEntityInfo(entity, index);
      const candidateHover = buildExtendHoverCandidate(entity, candidateInfo, hoverPoint);
      if (!candidateHover) {
        continue;
      }

      const hoverScore = evaluateExtendHoverScore(candidateHover, hoverPoint, scale);
      if (hoverScore === null) {
        continue;
      }

      if (hoverScore < bestScore) {
        bestHoverCandidate = candidateHover;
        bestScore = hoverScore;
      }
    }

    return bestHoverCandidate;
  }, [canInteractWithEntity, dxfData, hoverPoint, isExtendTool, scale]);
  const hoverTrimSourceEntity = useMemo(() => {
    if (!isTrimTool || !hoverPoint || !dxfData) {
      return null;
    }

    return findNearestSelectableEntityInfo(
      dxfData.entities,
      hoverPoint,
      scale,
      (entity) => canInteractWithEntity(entity) && isTrimSupportedEntity(entity)
    );
  }, [canInteractWithEntity, dxfData, hoverPoint, isTrimTool, scale]);
  const extendPreview = useMemo(() => {
    if (!hoverPoint) {
      return null;
    }

    return resolveExtendPreviewAtPoint(hoverPoint);
  }, [hoverPoint, resolveExtendPreviewAtPoint]);
  const hoverExtendSourceEntity = useMemo(() => (
    extendPreview?.entityInfo ?? extendHoverCandidate?.entityInfo ?? null
  ), [extendHoverCandidate, extendPreview]);
  const trimPreview = useMemo(() => {
    if (!isTrimTool || !hoverPoint || !dxfData) {
      return null;
    }

    return buildTrimEntityPreview(dxfData, hoverTrimSourceEntity, hoverPoint);
  }, [dxfData, hoverPoint, hoverTrimSourceEntity, isTrimTool]);
  const mirrorPreview = useMemo(() => {
    if (!isMirrorTool || selectedEntities.length !== 1 || !dxfData) {
      return null;
    }

    const selectedEntity = selectedEntities[0];
    const sourceEntity = dxfData.entities[selectedEntity.index];
    if (!sourceEntity) {
      return null;
    }

    const axisX = getEntityMirrorAxisX(selectedEntity, sourceEntity);
    const mirroredEntity = mirrorEntityAcrossVerticalAxis(sourceEntity, axisX);
    const bounds = getEntityBounds(sourceEntity);
    const axisSegment = bounds
      ? [{
          start: { x: axisX, y: bounds.minY - 6 },
          end: { x: axisX, y: bounds.maxY + 6 },
          color: '#a855f7',
          dashed: true,
          strokeWidth: 1.6
        }]
      : [];

    return {
      entity: mirroredEntity,
      axisSegment,
      overlaySegments: buildPreviewOverlaySegmentsFromEntity(mirroredEntity, '#a855f7')
    };
  }, [dxfData, isMirrorTool, selectedEntities]);
  const commitMirrorSelection = useCallback(() => {
    if (!isMirrorTool || selectedEntities.length !== 1) {
      return false;
    }

    onEntityMirror?.();
    return true;
  }, [isMirrorTool, onEntityMirror, selectedEntities.length]);
  const commitWeldSelection = useCallback(() => {
    if (!isJoinTool || selectedEntities.length < 2 || !weldCanApply) {
      return false;
    }

    onEntityWeld?.();
    return true;
  }, [isJoinTool, onEntityWeld, selectedEntities.length, weldCanApply]);
  const commitOffsetPreviewAtPoint = useCallback((point: Point2D) => {
    if (!isOffsetTool || selectedEntities.length !== 1 || !dxfData) {
      return false;
    }

    const selectedEntity = selectedEntities[0];
    const sourceEntity = dxfData.entities[selectedEntity.index];
    if (!sourceEntity) {
      return false;
    }

    const preview = buildOffsetEntityPreview(sourceEntity, point);
    if (!preview) {
      return false;
    }

    onEntityOffset?.({
      entity: selectedEntity,
      entities: preview.entities,
      distance: preview.distance
    });
    return true;
  }, [dxfData, isOffsetTool, onEntityOffset, selectedEntities]);
  const commitExtendPreviewAtPoint = useCallback((point: Point2D) => {
    const preview = resolveExtendPreviewAtPoint(point);
    if (!preview) {
      return false;
    }

    onEntityExtend?.({
      entity: preview.entityInfo,
      role: preview.role,
      vertexIndex: preview.vertexIndex,
      targetPoint: preview.targetPoint,
      resultEntity: preview.entity
    });
    return true;
  }, [onEntityExtend, resolveExtendPreviewAtPoint]);
  const commitTrimPreviewAtPoint = useCallback((point: Point2D) => {
    if (!isTrimTool || !dxfData) {
      return false;
    }

    const preview = buildTrimEntityPreview(dxfData, hoverTrimSourceEntity, point);
    if (!preview) {
      return false;
    }

    onEntityTrim?.({
      entity: preview.entityInfo,
      splitPoint: preview.splitPoint,
      segmentIndex: preview.segmentIndex,
      replacementEntities: preview.replacementEntities
    });
    return true;
  }, [dxfData, hoverTrimSourceEntity, isTrimTool, onEntityTrim]);
  const beginEditNodeDragAtPoint = useCallback((point: Point2D) => {
    if (!isEditNodesTool) {
      return false;
    }

    const handle = findEditableNodeHandleAtPoint(editableNodeHandles, point, scale);
    if (!handle) {
      return false;
    }

    setActiveEditNodeDrag({
      handle,
      currentPoint: handle.point,
      snappedHandle: null
    });
    return true;
  }, [editableNodeHandles, isEditNodesTool, scale]);
  const updateEditNodeDrag = useCallback((point: Point2D) => {
    setActiveEditNodeDrag((current) => {
      if (!current) {
        return current;
      }

      const snappedHandle = findNearestNodeSnapTarget(editableNodeHandles, point, scale, current.handle.id);
      return {
        ...current,
        currentPoint: point,
        snappedHandle
      };
    });
  }, [editableNodeHandles, scale]);
  const cancelEditNodeDrag = useCallback(() => {
    setActiveEditNodeDrag(null);
  }, []);
  const commitEditNodeDrag = useCallback(() => {
    if (!activeEditNodeDrag) {
      return false;
    }

    const targetPoint = activeEditNodeDrag.snappedHandle?.point || activeEditNodeDrag.currentPoint;
    if (calculateDistance(activeEditNodeDrag.handle.point, targetPoint) <= 0.001) {
      setActiveEditNodeDrag(null);
      return false;
    }

    const entity = selectedEntities.find((candidate) => candidate.id === activeEditNodeDrag.handle.entityId);
    if (!entity) {
      setActiveEditNodeDrag(null);
      return false;
    }

    onEntityEditNode?.({
      entity,
      role: activeEditNodeDrag.handle.role,
      targetPoint,
      snappedToEntityId: activeEditNodeDrag.snappedHandle?.entityId || null
    });
    setActiveEditNodeDrag(null);
    return true;
  }, [activeEditNodeDrag, onEntityEditNode, selectedEntities]);
  const isEditNodeHandleAtPoint = useCallback((point: Point2D) => (
    Boolean(findEditableNodeHandleAtPoint(editableNodeHandles, point, scale))
  ), [editableNodeHandles, scale]);
  const activeTransformOrthogonal = useMemo(() => {
    if (selectedEntityPreviewTransform?.mode !== 'rotate') {
      return false;
    }

    const normalizedDegrees = ((selectedEntityPreviewTransform.rotationDegrees % 360) + 360) % 360;
    const orthogonalSteps = [0, 90, 180, 270];
    return orthogonalSteps.some((step) => Math.abs(normalizedDegrees - step) <= 1 || Math.abs(normalizedDegrees - step) >= 359);
  }, [selectedEntityPreviewTransform]);
  const activeTransformLabel = useMemo(() => {
    if (!activeEntityTransform) {
      return null;
    }

    if (selectedEntityPreviewTransform?.mode === 'scale') {
      const scaleX = selectedEntityPreviewTransform.scaleX;
      const scaleY = selectedEntityPreviewTransform.scaleY;
      const isProportional = Math.abs(scaleX - scaleY) <= 0.001;
      const baseLabel = isProportional
        ? `Transformacao: escala proporcional ${(scaleX * 100).toFixed(1)}%`
        : `Transformacao: escala X ${(scaleX * 100).toFixed(1)}% | Y ${(scaleY * 100).toFixed(1)}%`;
      return `${baseLabel}${activeEntityTransform.proportionalScale ? ' | proporcional' : ''}`;
    }

    if (selectedEntityPreviewTransform?.mode === 'rotate') {
      const flags = [
        activeEntityTransform.snapRotation ? 'snap' : null,
        activeTransformOrthogonal ? 'ortho' : null
      ].filter((value): value is string => Boolean(value));
      return `Transformacao: rotacao ${selectedEntityPreviewTransform.rotationDegrees.toFixed(1)}°${flags.length > 0 ? ` | ${flags.join(' | ')}` : ''}`;
    }

    return null;
  }, [activeEntityTransform, activeTransformOrthogonal, selectedEntityPreviewTransform]);

  const pointKeyForTolerance = useCallback((point: Point2D, tolerance: number): string => {
    const safeTolerance = Number.isFinite(tolerance) && tolerance > 0 ? tolerance : 0.01;
    return `${Math.round(point.x / safeTolerance)}|${Math.round(point.y / safeTolerance)}`;
  }, []);
  const detectedVertexRepresentatives = useMemo(() => {
    const tolerance = 0.01;
    const representatives = new Map<string, Point2D>();
    detectedPolygons.forEach((polygon) => {
      polygon.forEach((point) => {
        const key = pointKeyForTolerance(point, tolerance);
        if (!representatives.has(key)) {
          representatives.set(key, point);
        }
      });
    });
    return representatives;
  }, [detectedPolygons, pointKeyForTolerance, segmentExtractionTolerance]);
  const findDetectedSegmentVertex = useCallback((point: Point2D | null): Point2D | null => {
    if (!point) {
      return null;
    }

    const tolerance = 0.01;
    const baseX = Math.round(point.x / tolerance);
    const baseY = Math.round(point.y / tolerance);
    let nearestVertex: Point2D | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const candidate = detectedVertexRepresentatives.get(`${baseX + offsetX}|${baseY + offsetY}`);
        if (!candidate) {
          continue;
        }

        const distance = calculateDistance(point, candidate);
        if (distance <= tolerance * 1.5 && distance < nearestDistance) {
          nearestVertex = candidate;
          nearestDistance = distance;
        }
      }
    }

    return nearestVertex;
  }, [detectedVertexRepresentatives]);
  const hoverPointIsDetectedVertex = useMemo(
    () => Boolean(findDetectedSegmentVertex(hoverPoint)),
    [findDetectedSegmentVertex, hoverPoint]
  );
  const hoverSegmentTargetPointIsDetectedVertex = useMemo(
    () => Boolean(findDetectedSegmentVertex(hoverSegmentTargetPoint)),
    [findDetectedSegmentVertex, hoverSegmentTargetPoint]
  );

  const analyzeSegmentSet = useCallback((segmentsToAnalyze: Array<{ p1: Point2D; p2: Point2D }>) => {
    const tolerance = segmentExtractionTolerance;
    const degreeByNode = new Map<string, { point: Point2D; degree: number }>();

    const bumpDegree = (point: Point2D) => {
      const key = pointKeyForTolerance(point, tolerance);
      const existing = degreeByNode.get(key);
      if (existing) {
        degreeByNode.set(key, { point: existing.point, degree: existing.degree + 1 });
        return;
      }
      degreeByNode.set(key, { point, degree: 1 });
    };

    segmentsToAnalyze.forEach((segment) => {
      bumpDegree(segment.p1);
      bumpDegree(segment.p2);
    });

    const openNodes = Array.from(degreeByNode.values()).filter((entry) => entry.degree === 1).map((entry) => entry.point);
    const invalidNodes = Array.from(degreeByNode.values()).filter((entry) => entry.degree !== 2).map((entry) => entry.point);
    const isClosed = segmentsToAnalyze.length >= 3 && invalidNodes.length === 0;

    let closestGap: { a: Point2D; b: Point2D; distance: number } | null = null;
    if (openNodes.length >= 2) {
      for (let i = 0; i < openNodes.length; i++) {
        for (let j = i + 1; j < openNodes.length; j++) {
          const dist = calculateDistance(openNodes[i], openNodes[j]);
          if (!closestGap || dist < closestGap.distance) {
            closestGap = { a: openNodes[i], b: openNodes[j], distance: dist };
          }
        }
      }
    }

    return {
      isClosed,
      openNodes,
      invalidNodes,
      closestGap
    };
  }, [pointKeyForTolerance, segmentExtractionTolerance]);

  const findNearestRawSegment = useCallback((point: Point2D): ViewerRawSegment | null => {
    if (rawSegments.length === 0) {
      return null;
    }

    let bestSegment: ViewerRawSegment | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    rawSegments.forEach((segment) => {
      const dist = pointToSegmentDistance(point, segment.p1, segment.p2);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestSegment = segment;
      }
    });

    if (!bestSegment || bestDistance > segmentPickRadius) {
      return null;
    }

    return bestSegment;
  }, [rawSegments, segmentPickRadius]);
  const clearCorrectiveToolSelections = useCallback(() => {
    setSelectedCorrectiveVertex(null);
    setCorrectiveTargetPoint(null);
    setSelectedJoinVertices([]);
    setSelectedCloseGapVertices([]);
  }, []);
  const {
    correctiveHistoryRevision,
    canUndoCorrectiveChange,
    canRedoCorrectiveChange,
    resetCorrectiveHistory,
    applyJoinEndpointsCorrection,
    applyCloseGapGuidedCorrection,
    applyMoveVertexCorrection,
    applySuggestedCorrection
  } = useViewerCorrectiveExecution({
    correctedPolygons,
    setCorrectedPolygons,
    setSelectedPolygons,
    clearCorrectiveToolSelections,
    correctiveSnapshotFileId,
    onRegisterCorrectiveDraftOperation,
    restoredCorrectiveSnapshot,
    correctiveHistoryCommand
  });
  const {
    matchedReferencePoints,
    georeferencingTransform,
    confirmedReferencePoints,
    technicalSummarySnapshot,
    correctiveFocusPolygon,
    correctiveFocusPolygonIndex,
    recentlyCorrectedPolygon,
    recentlyCorrectedPolygonCentroid,
    correctiveLotInspectionEntries,
    focusedCorrectiveLotInspection,
    selectedCorrectiveVertexPoint
  } = useViewerIntegration({
    dxfData,
    geometryVertices,
    correctedPolygons,
    propertyLandmarks,
    correctiveIssues,
    correctiveFocusLotNumber,
    recentlyCorrectedLotNumber,
    selectedCorrectiveVertex,
    viewerMode,
    canUndoCorrectiveChange,
    canRedoCorrectiveChange,
    correctiveHistoryRevision,
    correctiveSnapshotFileId,
    onCorrectiveSnapshotChanged,
    onCorrectiveHistoryStatusChange,
    onCorrectiveLotInspectionChange
  });
  const {
    confirmedSelections,
    handleGenerateSummary,
    handleConfirmPolygonSelection: confirmPolygonSelection
  } = useViewerSelectionSummary({
    selectedPolygons,
    dxfData,
    selectedConfrontationTexts,
    segmentAnnotations,
    confirmedReferencePoints,
    technicalSummarySnapshot,
    onPolygonConfirmed,
    onGenerateTechnicalSummary
  });
  const normalizedManualReviewLotNumbers = useMemo(
    () => Array.from(new Set(manualReviewLotNumbers.filter((value) => Number.isFinite(value)))).sort((left, right) => left - right),
    [manualReviewLotNumbers]
  );
  useEffect(() => {
    onConfrontationSelectionChange?.({
      selectedConfrontationTexts,
      segmentAnnotations
    });
  }, [onConfrontationSelectionChange, segmentAnnotations, selectedConfrontationTexts]);

  useEffect(() => {
    onReferencePointsChange?.({
      referencePoints: confirmedReferencePoints
    });
  }, [confirmedReferencePoints, onReferencePointsChange]);

  useEffect(() => {
    onSelectionSummaryChange?.({
      selections: confirmedSelections,
      referencePoints: confirmedReferencePoints
    });
  }, [confirmedReferencePoints, confirmedSelections, onSelectionSummaryChange]);

  useEffect(() => {
    resetCorrectiveHistory(detectedPolygons);

    sendSelectionDebug(
      'A',
      'ViewerDXF:detected-polygons',
      '[DEBUG] Poligonos detectados e pre-selecionados',
      {
        extractionTolerance: segmentExtractionTolerance,
        segmentMedianLength: Number.isFinite(segmentMedianLength) ? Number(segmentMedianLength.toFixed(6)) : null,
        detectedCount: detectedPolygons.length,
        detectedSummaries: detectedPolygons.slice(0, 30).map((poly, index) => ({
          index: index + 1,
          area: Number(calculatePolygonArea(poly).toFixed(2)),
          textsInside: summarizePolygonTexts(poly, dxfData)
        }))
      }
    );
  }, [detectedPolygons, dxfData, resetCorrectiveHistory, segmentExtractionTolerance, segmentMedianLength]);

  const lastSuggestionApplyTokenRef = useRef(0);

  useEffect(() => {
    const nextApplyToken = correctiveSuggestionCommand?.applyToken ?? 0;
    if (nextApplyToken === lastSuggestionApplyTokenRef.current) {
      return;
    }

    lastSuggestionApplyTokenRef.current = nextApplyToken;
    if (nextApplyToken <= 0) {
      return;
    }

    applySuggestedCorrection({
      viewerMode,
      correctiveFocusLotNumber,
      correctiveFocusPolygon,
      correctiveFocusPolygonIndex,
      focusedCorrectiveLotInspection,
      validPoints
    });
  }, [
    applySuggestedCorrection,
    correctiveFocusLotNumber,
    correctiveFocusPolygon,
    correctiveFocusPolygonIndex,
    correctiveSuggestionCommand?.applyToken,
    focusedCorrectiveLotInspection,
    validPoints,
    viewerMode
  ]);

  useEffect(() => {
    if (viewerMode !== 'correct' || activeCorrectiveTool !== 'move-vertex') {
      setSelectedCorrectiveVertex(null);
      setCorrectiveTargetPoint(null);
    }
  }, [viewerMode, activeCorrectiveTool, correctiveFocusLotNumber]);

  useEffect(() => {
    if (viewerMode !== 'correct' || activeCorrectiveTool !== 'join-endpoints') {
      setSelectedJoinVertices([]);
    }
  }, [viewerMode, activeCorrectiveTool, correctiveFocusLotNumber]);

  useEffect(() => {
    if (viewerMode !== 'correct' || activeCorrectiveTool !== 'close-gap-guided') {
      setSelectedCloseGapVertices([]);
    }
  }, [viewerMode, activeCorrectiveTool, correctiveFocusLotNumber]);

  useEffect(() => {
    setEmbeddedDrawingPoints([]);
    setHoverPoint(null);
    setHoverReferencePoint(null);
    setHoverPolygon(null);
    setHoverConfrontationText(null);
    setHoverSegmentTargetPoint(null);
  }, [embeddedToolMode, dxfData]);

  useEffect(() => {
    if (!embeddedMode || interactive || !isDrawingToolMode(embeddedToolMode)) {
      return;
    }

    // Evita reaproveitar um hover snapado com regras antigas logo apos trocar grid/object snap.
    setHoverPoint(null);
    setHoverReferencePoint(null);
    setHoverSegmentTargetPoint(null);
    setHoverConfrontationText(null);
  }, [embeddedMode, embeddedToolMode, enableGridSnap, enableObjectSnap, gridSnapSize, interactive, snapGuides]);

  // Carregar dados DXF
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (data) {
        if (isMounted) {
          setDxfData(data);
          setError('');
          setIsLoading(false);
        }
        return;
      }

      if (!fileId) {
        if (isMounted) {
          setDxfData(null);
          setError('Nenhum arquivo especificado');
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        const dxfText = await resolvedDxfTextLoader(fileId);
        const parsedData = await parseDxfAsync(dxfText);

        if (isMounted) {
          setDxfData(parsedData);
          if (onDXFDataLoaded) {
            onDXFDataLoaded(parsedData);
          }
        }

      } catch (err: unknown) {
        if (isMounted) {
          setDxfData(null);
          setError(getErrorMessage(err, 'Erro ao carregar arquivo DXF'));
          console.error('Erro ao carregar DXF:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [data, fileId, resolvedDxfTextLoader]); // Removido onDXFDataLoaded para evitar loop infinito

  const {
    appendPointToPointVertex,
    cancelEmbeddedDrawing,
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
  } = useViewerCanvasInteractions({
    activeToolId,
    activeConfrontationTextId,
    activeCorrectiveTool,
    activeEntityTransform,
    annotationLayerName,
    analyzeSegmentSet,
    applyCloseGapGuidedCorrection,
    applyJoinEndpointsCorrection,
    applyMoveVertexCorrection,
    beginEditNodeDragAtPoint,
    beginEntityDrag,
    beginEntityTransform,
    cancelEditNodeDrag,
    commitMirrorSelection,
    commitWeldSelection,
    commitEditNodeDrag,
    commitEntityDrag,
    commitEntityCopy,
    commitOffsetPreviewAtPoint,
    commitExtendPreviewAtPoint,
    commitTrimPreviewAtPoint,
    hasExtendPreview: Boolean(extendPreview),
    hasTrimPreview: Boolean(trimPreview),
    commitEntityTransform,
    closePointToPointShape,
    canInteractWithEntity,
    correctiveFocusLotNumber,
    correctiveFocusPolygon,
    correctiveFocusPolygonIndex,
    detectedPolygons,
    draggingSelectedEntities,
    drawingTextValue,
    drawingTextHeight,
    drawingTextRotation,
    drawingTextAlignment,
    drawingTextVerticalAlignment,
    dxfData,
    entityMultiSelectModeActive,
    embeddedMode,
    activeLayerName,
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
    activeEditNodeDrag,
    lastShiftInteractionRef,
    manualReviewLotNumbers: normalizedManualReviewLotNumbers,
    manualPolygon,
    partialScopePolygons,
    primaryBoundaryReady,
    allowLotSelectionWithoutPrimaryBoundary,
    matchedReferencePoints,
    scale,
    gridOrigin,
    gridSnapSize,
    segmentContextMenu,
    selectedConfrontationTexts,
    selectedCorrectiveVertex,
    selectedCorrectiveVertexPoint,
    selectedEntities,
    selectedEntityIds,
    pendingConfrontationSegmentPoints,
    selectedSegments,
    segmentAnnotations,
    setSelectedEntityIds,
    setEntitySelectionBox,
    setZoomSelectionBox,
    snapGuides,
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
    updateEditNodeDrag,
    updateEntityDragPreview,
    updateEntityTransformPreview,
    textAnnotationLayerName,
    textUsesAnnotationLayer,
    updatePanDrag,
    validPoints,
    viewerMode,
    messages: resolvedViewerTexts
  });
  const pointToPointPanelTexts = resolvedViewerTexts.pointToPointPanel;
  const moveToolPreviewLabel = useMemo(() => {
    if (!isGuidedTranslateTool || !draggingSelectedEntities) {
      return null;
    }

    const actionLabel = isGuidedCopyTool ? 'Copiar' : 'Mover';
    const deltaX = draggingSelectedEntities.currentPoint.x - draggingSelectedEntities.startPoint.x;
    const deltaY = draggingSelectedEntities.currentPoint.y - draggingSelectedEntities.startPoint.y;
    const distance = calculateDistance(draggingSelectedEntities.startPoint, draggingSelectedEntities.currentPoint);
    if (distance <= 0.001) {
      return `${actionLabel}: base travada | clique no destino | Esc cancela`;
    }

    if (isGuidedCopyTool && copyPlacementLocked) {
      return `${actionLabel}: destino travado | dX ${deltaX.toFixed(3)} | dY ${deltaY.toFixed(3)} | dist ${distance.toFixed(3)} | Enter solta`;
    }

    return `${actionLabel}: dX ${deltaX.toFixed(3)} | dY ${deltaY.toFixed(3)} | dist ${distance.toFixed(3)} | Enter aplica`;
  }, [copyPlacementLocked, draggingSelectedEntities, isGuidedCopyTool, isGuidedTranslateTool]);
  const offsetToolPreviewLabel = useMemo(() => {
    if (!isOffsetTool) {
      return null;
    }

    if (selectedEntities.length === 0) {
      return 'Offset: selecione uma entidade.';
    }

    if (selectedEntities.length > 1) {
      return 'Offset: selecione apenas uma entidade.';
    }

    const sourceEntity = dxfData?.entities[selectedEntities[0].index];
    if (!sourceEntity || !isOffsetSupportedEntity(sourceEntity)) {
      return 'Offset: suporte atual para Linha, Circulo e Polilinha.';
    }

    if (!offsetPreview) {
      return 'Offset: mova para definir a distancia | Clique/Enter aplica';
    }

    return `Offset: dist ${Math.abs(offsetPreview.distance).toFixed(3)} | Clique/Enter aplica`;
  }, [dxfData, isOffsetTool, offsetPreview, selectedEntities]);
  const extendToolPreviewLabel = useMemo(() => {
    if (!isExtendTool) {
      return null;
    }

    if (!hoverExtendSourceEntity) {
      return 'Estender: aproxime o cursor da ponta da geometria. O segmento ativo acende e a garra aparece na extremidade.';
    }

    const sourceEntity = dxfData?.entities[hoverExtendSourceEntity.index];
    if (!sourceEntity || !isExtendSupportedEntity(sourceEntity)) {
      return 'Estender: suporte atual para Linha, Polilinha aberta e Arco.';
    }
    const entityLabel = getExtendEntityLabel(sourceEntity);

    if (!extendPreview) {
      return `Estender: ${entityLabel} | ponta ${extendHoverCandidate?.role === 'start' ? 'inicial' : 'final'} detectada | arraste na direcao | X ${hoverPoint?.x.toFixed(3)} / Y ${hoverPoint?.y.toFixed(3)}`;
    }

    return typeof extendPreview.vertexIndex === 'number'
      ? `Estender: ${entityLabel} | seg ${extendPreview.segmentIndex! + 1} | vert ${extendPreview.vertexIndex + 1} | ponta ${extendPreview.role === 'start' ? 'inicial' : 'final'} | dist ${extendPreview.distance.toFixed(3)} | Clique/Enter aplica`
      : `Estender: ${entityLabel} | ponta ${extendPreview.role === 'start' ? 'inicial' : 'final'} | dist ${extendPreview.distance.toFixed(3)} | Clique/Enter aplica`;
  }, [dxfData, extendHoverCandidate, extendPreview, hoverExtendSourceEntity, hoverPoint, isExtendTool]);
  const trimToolPreviewLabel = useMemo(() => {
    if (!isTrimTool) {
      return null;
    }

    if (!hoverTrimSourceEntity) {
      return 'Aparar: aproxime o cursor do segmento. A lente marca o foco de corte e o clique divide a entidade em duas.';
    }

    const sourceEntity = dxfData?.entities[hoverTrimSourceEntity.index];
    if (!sourceEntity || !isTrimSupportedEntity(sourceEntity)) {
      return 'Aparar: suporte atual para Linha, Polilinha, Arco e Circulo.';
    }
    const entityLabel = getTrimEntityLabel(sourceEntity);
    const trimActionLabel = sourceEntity.type === 'LINE' || sourceEntity.type === 'ARC' || !((sourceEntity.properties as DXFEntityProperties).closed)
      ? 'Clique divide em dois'
      : 'Clique abre o contorno';

    if (!trimPreview) {
      return `Aparar: ${entityLabel} | mova no contorno para travar o foco | Clique/Enter aplica`;
    }

    if (sourceEntity.type === 'ARC' || sourceEntity.type === 'CIRCLE') {
      return `Aparar: ${entityLabel} | foco X ${trimPreview.splitPoint.x.toFixed(3)} / Y ${trimPreview.splitPoint.y.toFixed(3)} | ${trimActionLabel} | Enter aplica`;
    }

    return `Aparar: ${entityLabel} | seg ${trimPreview.segmentIndex + 1} | foco X ${trimPreview.splitPoint.x.toFixed(3)} / Y ${trimPreview.splitPoint.y.toFixed(3)} | ${trimActionLabel} | Enter aplica`;
  }, [dxfData, hoverTrimSourceEntity, isTrimTool, trimPreview]);
  const mirrorToolPreviewLabel = useMemo(() => {
    if (!isMirrorTool) {
      return null;
    }

    if (selectedEntities.length === 0) {
      return resolvedViewerTexts.mirrorSelectOneNotice;
    }

    if (selectedEntities.length > 1) {
      return resolvedViewerTexts.mirrorSelectOnlyOneNotice;
    }

    return resolvedViewerTexts.mirrorReadyNotice;
  }, [isMirrorTool, resolvedViewerTexts, selectedEntities.length]);
  const joinToolPreviewLabel = useMemo(() => {
    if (!isJoinTool) {
      return null;
    }

    if (selectedEntities.length < 2) {
      return resolvedViewerTexts.joinSelectTwoNotice;
    }

    if (!weldCanApply) {
      return resolvedViewerTexts.buildJoinInvalidNotice({ weldReason: weldReason || '' });
    }

    return resolvedViewerTexts.joinReadyNotice;
  }, [isJoinTool, resolvedViewerTexts, selectedEntities.length, weldCanApply, weldReason]);
  const editNodesToolPreviewLabel = useMemo(() => {
    if (!isEditNodesTool) {
      return null;
    }

    if (selectedEntities.length === 0) {
      return resolvedViewerTexts.editNodesSelectNotice;
    }

    if (editableNodeHandles.length === 0) {
      return resolvedViewerTexts.editNodesUnsupportedNotice;
    }

    if (!activeEditNodeDrag) {
      return resolvedViewerTexts.editNodesDragNotice;
    }

    const targetPoint = activeEditNodeDrag.snappedHandle?.point || activeEditNodeDrag.currentPoint;
    const distance = calculateDistance(activeEditNodeDrag.handle.point, targetPoint);
    return activeEditNodeDrag.snappedHandle
      ? resolvedViewerTexts.buildEditNodesSnappedNotice({ distance })
      : resolvedViewerTexts.buildEditNodesMovingNotice({ distance });
  }, [activeEditNodeDrag, editableNodeHandles.length, isEditNodesTool, resolvedViewerTexts, selectedEntities.length]);
  const moveToolOverlaySegments = useMemo(() => {
    if (!isGuidedTranslateTool || !draggingSelectedEntities) {
      return [];
    }

    const distance = calculateDistance(draggingSelectedEntities.startPoint, draggingSelectedEntities.currentPoint);
    if (distance <= 0.001) {
      return [];
    }

    return [{
      start: draggingSelectedEntities.startPoint,
      end: draggingSelectedEntities.currentPoint,
      color: isGuidedCopyTool ? '#14b8a6' : '#f59e0b',
      dashed: true,
      strokeWidth: 1.35
    }];
  }, [draggingSelectedEntities, isGuidedCopyTool, isGuidedTranslateTool]);
  const moveToolOverlayPoints = useMemo(() => {
    if (!isGuidedTranslateTool || !draggingSelectedEntities) {
      return [];
    }

    const distance = calculateDistance(draggingSelectedEntities.startPoint, draggingSelectedEntities.currentPoint);
    return [
      {
        point: draggingSelectedEntities.startPoint,
        color: '#2563eb',
        radius: 5.2
      },
      ...(distance > 0.001
        ? [{
            point: draggingSelectedEntities.currentPoint,
            color: isGuidedCopyTool ? '#14b8a6' : '#f59e0b',
            radius: 5.4
          }]
        : [])
    ];
  }, [draggingSelectedEntities, isGuidedCopyTool, isGuidedTranslateTool]);
  const editNodesOverlaySegments = useMemo(() => {
    if (!activeEditNodeDrag) {
      return [];
    }

    const targetPoint = activeEditNodeDrag.snappedHandle?.point || activeEditNodeDrag.currentPoint;
    if (calculateDistance(activeEditNodeDrag.handle.point, targetPoint) <= 0.001) {
      return [];
    }

    return [{
      start: activeEditNodeDrag.handle.point,
      end: targetPoint,
      color: activeEditNodeDrag.snappedHandle ? '#7c3aed' : '#0f766e',
      dashed: true,
      strokeWidth: activeEditNodeDrag.snappedHandle ? 1.45 : 1.35
    }];
  }, [activeEditNodeDrag]);
  const editNodesOverlayPoints = useMemo(() => {
    if (!isEditNodesTool) {
      return [];
    }

    const baseHandles = editableNodeHandles.map((handle) => ({
      point: handle.point,
      color: activeEditNodeDrag?.handle.id === handle.id ? '#0f766e' : '#2563eb',
      radius: activeEditNodeDrag?.handle.id === handle.id ? 5.6 : 4.8
    }));

    if (!activeEditNodeDrag) {
      return baseHandles;
    }

    const targetPoint = activeEditNodeDrag.snappedHandle?.point || activeEditNodeDrag.currentPoint;
    return [
      ...baseHandles,
      ...(activeEditNodeDrag.snappedHandle
        ? [{
            point: targetPoint,
            color: 'rgba(124, 58, 237, 0.18)',
            radius: 8.8
          }]
        : []),
      {
        point: targetPoint,
        color: activeEditNodeDrag.snappedHandle ? '#7c3aed' : '#0f766e',
        radius: 5.8
      }
    ];
  }, [activeEditNodeDrag, editableNodeHandles, isEditNodesTool]);
  const effectiveOverlaySegments = useMemo(
    () => [
      ...mergedOverlaySegments,
      ...moveToolOverlaySegments,
      ...editNodesOverlaySegments,
      ...(offsetPreview?.overlaySegments || []),
      ...((!extendPreview && extendHoverCandidate?.overlaySegments) || []),
      ...(extendPreview?.overlaySegments || []),
      ...(trimPreview?.overlaySegments || []),
      ...(mirrorPreview?.overlaySegments || []),
      ...(mirrorPreview?.axisSegment || [])
    ],
    [editNodesOverlaySegments, extendHoverCandidate, extendPreview, mergedOverlaySegments, mirrorPreview, moveToolOverlaySegments, offsetPreview, trimPreview]
  );
  const referenceOverlayPoints = useMemo(
    () => (
      embeddedMode && embeddedToolMode === 'select'
        ? matchedReferencePoints.flatMap((point) => ([
            {
              point,
              color: 'rgba(255, 193, 7, 0.22)',
              radius: 13
            },
            {
              point,
              color: '#ffc107',
              radius: 7.5,
              label: point.label,
              labelColor: '#111827',
              labelBackgroundColor: 'rgba(255, 248, 214, 0.96)',
              labelBorderColor: '#d97706',
              labelOffsetX: 12,
              labelOffsetY: -18
            }
          ]))
        : []
    ),
    [embeddedMode, embeddedToolMode, matchedReferencePoints]
  );
  const effectiveOverlayPoints = useMemo(
    () => [
      ...referenceOverlayPoints,
      ...mergedOverlayPoints,
      ...moveToolOverlayPoints,
      ...editNodesOverlayPoints,
      ...(offsetPreview?.overlayPoints || []),
      ...((!extendPreview && extendHoverCandidate?.overlayPoints) || []),
      ...(extendPreview?.overlayPoints || []),
      ...(trimPreview?.overlayPoints || [])
    ],
    [editNodesOverlayPoints, extendHoverCandidate, extendPreview, mergedOverlayPoints, moveToolOverlayPoints, offsetPreview, referenceOverlayPoints, trimPreview]
  );
  useViewerCanvasRenderer({
    activeConfrontationTextId,
    activeCorrectiveTool,
    activeSelectionHandle: activeEntityTransform?.handle || null,
    activeTransformLabel,
    activeTransformOrthogonal,
    activeTransformPoint: activeEntityTransform?.currentPoint || null,
    activeTransformProportional: Boolean(activeEntityTransform?.proportionalScale),
    activeTransformSnap: Boolean(activeEntityTransform?.snapRotation),
    analyzeSegmentSet,
    canvasRef,
    correctiveFocusLotNumber,
    correctiveFocusPolygon,
    correctiveLotInspectionEntries,
    correctiveTargetPoint,
    detectedPolygons,
    detectedPolygonEntries,
    drawingBounds,
    drawingPreviewLabel: moveToolPreviewLabel
      || editNodesToolPreviewLabel
      || offsetToolPreviewLabel
      || extendToolPreviewLabel
      || trimToolPreviewLabel
      || mirrorToolPreviewLabel
      || joinToolPreviewLabel
      || drawingPreviewLabel,
    drawingPreviewText: embeddedDrawingPreview.textPreview,
    copyEntityPreviewTransform,
    boundsData: boundsData ?? data ?? null,
    dxfData,
    focusedCorrectiveLotInspection,
    georeferencingTransform,
    hoverConfrontationText,
    hoverSelectionHandle: activeEntityTransform ? null : hoverSelectionHandle,
    hoverSelectionMode: activeEntityTransform ? null : hoverSelectionMode,
    hoverPoint,
    hoverPointIsDetectedVertex,
    hoverPolygon,
    hoverReferencePoint,
    hoverSegmentTargetPoint,
    hoverSegmentTargetPointIsDetectedVertex,
    entitySelectionBox,
    zoomSelectionBox,
    gridMajorStep,
    gridSnapSize,
    interactive,
    minimumWorkspaceSize,
    manualBridgeSegments,
    manualPolygon,
    partialScopePolygons,
    overlayPoints: effectiveOverlayPoints,
    overlaySegments: effectiveOverlaySegments,
    pan,
    pendingConfrontationSegmentPoints,
    recentlyCorrectedLotNumber,
    recentlyCorrectedPolygon,
    recentlyCorrectedPolygonCentroid,
    segmentAnnotations,
    selectedEntityPreviewTransform,
    selectedCloseGapVertices,
    selectedConfrontationTexts,
    selectedCorrectiveVertex,
    selectedCorrectiveVertexPoint,
    selectedEntityIds,
    selectedJoinVertices,
    selectedPolygons,
    selectedSegmentIds,
    selectedSegments,
    setDrawingBounds,
    setGridOrigin,
    onInitialCanvasRendered,
    setScale,
    setValidPoints,
    showGrid,
    showDetectedPolygonMeasurements,
    showHoverCoordinates,
    viewerMode,
    zoom,
    messages: resolvedHostAdapter.viewerRendererMessages
  });
  const resetPointToPointCadInputs = useCallback(() => {
    setPointToPointDistanceInput('');
    setPointToPointAngleInput('');
    setPointToPointDistanceDirty(false);
    setPointToPointAngleDirty(false);
  }, []);
  const focusPointToPointField = useCallback((field: 'distance' | 'angle') => {
    setPointToPointActiveField(field);
    const targetInput = field === 'distance'
      ? pointToPointDistanceInputRef.current
      : pointToPointAngleInputRef.current;
    if (targetInput) {
      targetInput.focus();
      targetInput.select();
    }
  }, []);
  const applyPointToPointCurrentPreview = useCallback(() => {
    if (embeddedToolMode !== 'point-to-point') {
      return false;
    }

    const targetPoint = pointToPointPreviewPoint ?? hoverPoint;
    if (!targetPoint) {
      return false;
    }

    const didApply = appendPointToPointVertex(targetPoint);
    if (didApply) {
      resetPointToPointCadInputs();
    }
    return didApply;
  }, [
    appendPointToPointVertex,
    embeddedToolMode,
    hoverPoint,
    pointToPointPreviewPoint,
    resetPointToPointCadInputs
  ]);
  const pointToPointDistanceDisplayValue = pointToPointDistanceDirty
    ? pointToPointDistanceInput
    : formatCadFieldValue(pointToPointVisualMetrics?.distance ?? 0, 3);
  const pointToPointAngleDisplayValue = pointToPointAngleDirty
    ? pointToPointAngleInput
    : formatCadFieldValue(pointToPointVisualMetrics?.angleDegrees ?? 0, 1);
  const pointToPointActiveCommandLabel = pointToPointActiveField === 'distance'
    ? 'comando: distancia'
    : (pointToPointActiveField === 'angle' ? 'comando: angulo' : null);
  useEffect(() => {
    if (embeddedToolMode !== 'point-to-point' || embeddedDrawingPoints.length === 0) {
      resetPointToPointCadInputs();
      setPointToPointActiveField(null);
      return;
    }

    resetPointToPointCadInputs();
  }, [embeddedDrawingPoints.length, embeddedToolMode, resetPointToPointCadInputs]);
  const activeConfrontationTextLabel = selectedConfrontationTexts.find((item) => item.id === activeConfrontationTextId)?.text || null;
  const canClearSelection = selectedPolygons.length > 0
    || manualPolygon.length > 0
    || selectedConfrontationTexts.length > 0
    || segmentAnnotations.length > 0
    || pendingConfrontationSegmentPoints.length > 0;

  const handleClearSelection = useCallback(() => {
    setSelectedPolygons([]);
    setManualPolygon([]);
    setPartialScopePolygons([]);
    setSelectedConfrontationTexts([]);
    setActiveConfrontationTextId(null);
    setPendingConfrontationSegmentPoints([]);
    setSegmentAnnotations([]);
    setSelectedSegmentIds([]);
    setSegmentInspectorMessage('');
    setHoverSegmentTargetPoint(null);
  }, [manualPolygon.length, pendingConfrontationSegmentPoints.length, segmentAnnotations.length, selectedConfrontationTexts.length, selectedPolygons.length, selectedSegmentIds.length]);
  const handleUndoLastDraftPoint = useCallback((): boolean => {
    if (pendingConfrontationSegmentPoints.length > 0) {
      setPendingConfrontationSegmentPoints((prev) => prev.slice(0, -1));
      setHoverSegmentTargetPoint(null);
      setSegmentInspectorMessage('Ultimo ponto da confrontacao desfeito.');
      return true;
    }

    if (segmentAnnotations.length > 0) {
      const lastAnnotation = segmentAnnotations[segmentAnnotations.length - 1];
      if (lastAnnotation) {
        setSegmentAnnotations((prev) => prev.slice(0, -1));
        setPendingConfrontationSegmentPoints([lastAnnotation.startPoint]);
        setHoverSegmentTargetPoint(lastAnnotation.startPoint);
        setActiveConfrontationTextId(
          lastAnnotation.selectionMode === 'segment-direct' ? null : lastAnnotation.sourceTextId
        );
        setSegmentInspectorMessage('Ultimo trecho da confrontacao desfeito. Selecione o ponto final novamente.');
        return true;
      }
    }

    if (manualPolygon.length > 0) {
      setManualPolygon((prev) => prev.slice(0, -1));
      return true;
    }

    if (embeddedToolMode === 'point-to-point' && embeddedDrawingPoints.length > 0) {
      setEmbeddedDrawingPoints((prev) => prev.slice(0, -1));
      resetPointToPointCadInputs();
      return true;
    }

    return false;
  }, [
    embeddedDrawingPoints.length,
    embeddedToolMode,
    manualPolygon.length,
    pendingConfrontationSegmentPoints.length,
    segmentAnnotations,
    resetPointToPointCadInputs
  ]);

  useEffect(() => {
    if (!clearConfrontationSelectionNonce) {
      return;
    }
    if (lastHandledClearConfrontationSelectionNonceRef.current === clearConfrontationSelectionNonce) {
      return;
    }
    lastHandledClearConfrontationSelectionNonceRef.current = clearConfrontationSelectionNonce;
    handleClearSelection();
  }, [clearConfrontationSelectionNonce, handleClearSelection, segmentAnnotations.length, selectedConfrontationTexts.length, selectedSegmentIds.length]);

  useEffect(() => {
    if (
      pendingConfrontationSegmentPoints.length === 0
      && segmentAnnotations.length === 0
      && manualPolygon.length === 0
      && !(embeddedToolMode === 'point-to-point' && embeddedDrawingPoints.length > 0)
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const normalizedKey = event.key.toLowerCase();
      const isUndoShortcut = (event.ctrlKey || event.metaKey)
        && !event.altKey
        && (normalizedKey === 'z' || normalizedKey === 'undo' || event.code === 'KeyZ');
      if (!isUndoShortcut) {
        return;
      }

      const eventTarget = event.target;
      if (
        eventTarget instanceof HTMLInputElement
        || eventTarget instanceof HTMLTextAreaElement
        || eventTarget instanceof HTMLSelectElement
        || (eventTarget instanceof HTMLElement && eventTarget.isContentEditable)
      ) {
        return;
      }

      if (handleUndoLastDraftPoint()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    embeddedDrawingPoints.length,
    embeddedToolMode,
    handleUndoLastDraftPoint,
    manualPolygon.length,
    pendingConfrontationSegmentPoints.length,
    segmentAnnotations.length
  ]);

  const handleConfirmPolygonSelection = useCallback(() => {
    sendSelectionDebug(
      'B',
      'ViewerDXF:confirmed-selection',
      '[DEBUG] Selecao confirmada pelo usuario',
      {
        selectedCount: confirmedSelections.length,
        selectedSummaries: confirmedSelections.map((selection, index) => ({
          index: index + 1,
          lotNumber: selection.lotNumber,
          area: Number(calculatePolygonArea(selection.polygon).toFixed(2)),
          textsInside: selection.textsInside,
          selectedConfrontationTexts: selection.selectedConfrontationTexts
        }))
      }
    );

    confirmPolygonSelection();
  }, [confirmPolygonSelection, confirmedSelections]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(50, prev * 1.2));
  }, [setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.1, prev / 1.2));
  }, [setZoom]);

  useEffect(() => {
    if (!embeddedMode || interactive || (!activeEntityTransform && !draggingSelectedEntities && !activeEditNodeDrag)) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      if (activeEntityTransform) {
        endEntityTransform();
        return;
      }

      if (activeEditNodeDrag) {
        cancelEditNodeDrag();
        return;
      }

      if (draggingSelectedEntities) {
        endEntityDrag();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    activeEditNodeDrag,
    activeEntityTransform,
    cancelEditNodeDrag,
    draggingSelectedEntities,
    embeddedMode,
    endEntityDrag,
    endEntityTransform,
    interactive
  ]);

  useEffect(() => {
    const hasGuidedTranslatePreview = isGuidedTranslateTool && Boolean(draggingSelectedEntities);
    const hasEditNodePreview = isEditNodesTool && Boolean(activeEditNodeDrag);
    const hasOffsetEntityPreview = isOffsetTool && Boolean(offsetPreview);
    const hasExtendEntityPreview = isExtendTool && Boolean(extendPreview);
    const hasTrimEntityPreview = isTrimTool && Boolean(trimPreview);
    const hasMirrorEntityPreview = isMirrorTool && Boolean(mirrorPreview);
    const hasJoinEntityPreview = isJoinTool && selectedEntities.length >= 2;
    if (
      !embeddedMode
      || interactive
      || (
        embeddedDrawingPoints.length === 0
        && !hasGuidedTranslatePreview
        && !hasEditNodePreview
        && !hasOffsetEntityPreview
        && !hasExtendEntityPreview
        && !hasTrimEntityPreview
        && !hasMirrorEntityPreview
        && !hasJoinEntityPreview
      )
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelEmbeddedDrawing();
        return;
      }

      if (event.key === 'Tab' && embeddedToolMode === 'point-to-point') {
        event.preventDefault();
        const nextField = event.shiftKey
          ? (pointToPointActiveField === 'angle' ? 'distance' : 'angle')
          : (pointToPointActiveField === 'distance' ? 'angle' : 'distance');
        focusPointToPointField(nextField);
        return;
      }

      if (!event.ctrlKey && !event.altKey && !event.metaKey && embeddedToolMode === 'point-to-point') {
        const normalizedKey = event.key.toLowerCase();
        if (normalizedKey === 'd') {
          event.preventDefault();
          focusPointToPointField('distance');
          return;
        }

        if (normalizedKey === 'a') {
          event.preventDefault();
          focusPointToPointField('angle');
          return;
        }
      }

      if (event.key === 'Enter' && embeddedToolMode === 'point-to-point') {
        event.preventDefault();
        if (!applyPointToPointCurrentPreview()) {
          commitPointToPointDrawing('Polilinha finalizada por Enter.');
        }
        return;
      }

      if (event.key === 'Enter' && isGuidedTranslateTool && draggingSelectedEntities) {
        event.preventDefault();
        if (isGuidedCopyTool && !copyPlacementLocked) {
          return;
        }
        const move = isGuidedCopyTool
          ? commitEntityCopy(draggingSelectedEntities.currentPoint)
          : commitEntityDrag(draggingSelectedEntities.currentPoint);
        if (move) {
          suppressNextCanvasClickRef.current = true;
        }
        endEntityDrag();
        return;
      }

      if (event.key === 'Enter' && isOffsetTool && hoverPoint) {
        event.preventDefault();
        if (commitOffsetPreviewAtPoint(hoverPoint)) {
          suppressNextCanvasClickRef.current = true;
        }
        return;
      }

      if (event.key === 'Enter' && isExtendTool && hoverPoint) {
        event.preventDefault();
        if (commitExtendPreviewAtPoint(hoverPoint)) {
          suppressNextCanvasClickRef.current = true;
        }
        return;
      }

      if (event.key === 'Enter' && isTrimTool && hoverPoint) {
        event.preventDefault();
        if (commitTrimPreviewAtPoint(hoverPoint)) {
          suppressNextCanvasClickRef.current = true;
        }
        return;
      }

      if (event.key === 'Enter' && isMirrorTool && mirrorPreview) {
        event.preventDefault();
        if (commitMirrorSelection()) {
          suppressNextCanvasClickRef.current = true;
        }
        return;
      }

      if (event.key === 'Enter' && isJoinTool && selectedEntities.length >= 2 && weldCanApply) {
        event.preventDefault();
        if (commitWeldSelection()) {
          suppressNextCanvasClickRef.current = true;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    activeToolId,
    applyPointToPointCurrentPreview,
    cancelEmbeddedDrawing,
    commitPointToPointDrawing,
    commitEntityCopy,
    commitEntityDrag,
    commitOffsetPreviewAtPoint,
    commitExtendPreviewAtPoint,
    commitTrimPreviewAtPoint,
    commitWeldSelection,
    copyPlacementLocked,
    draggingSelectedEntities,
    embeddedDrawingPoints.length,
    embeddedMode,
    embeddedToolMode,
    activeEditNodeDrag,
    endEntityDrag,
    focusPointToPointField,
    isGuidedCopyTool,
    isEditNodesTool,
    isGuidedTranslateTool,
    isJoinTool,
    isMirrorTool,
    isOffsetTool,
    isExtendTool,
    isTrimTool,
    interactive,
    weldCanApply,
    extendPreview,
    trimPreview,
    mirrorPreview,
    offsetPreview,
    pointToPointActiveField,
    selectedEntities.length
  ]);

  if (isLoading) {
    return (
      <div className={`viewer-dxf ${className || ''}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: embeddedMode ? '100%' : '400px' }}>
        <div>🔄 Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`viewer-dxf ${className || ''}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: embeddedMode ? '100%' : '400px' }}>
        <div style={{ color: '#dc3545' }}>❌ {error}</div>
      </div>
    );
  }

  return (
    <div className={`viewer-dxf ${className || ''}`}>
      {!embeddedMode && (
        <ViewerHeaderPanel
          activeConfrontationTextLabel={activeConfrontationTextLabel}
          activeCorrectiveTool={activeCorrectiveTool}
          canClearSelection={canClearSelection}
          dxfEntityCount={dxfData?.entities?.length || 0}
          hoverPoint={hoverPoint}
          hoverPointIsDetectedVertex={hoverPointIsDetectedVertex}
          hoverReferencePoint={hoverReferencePoint}
          interactive={interactive}
          isGeneratingTechnicalSummary={isGeneratingTechnicalSummary}
          manualPolygonPoints={manualPolygon.length}
          pendingConfrontationPoints={pendingConfrontationSegmentPoints.length}
          segmentAnnotationCount={segmentAnnotations.length}
          segmentInspectorMessage={segmentInspectorMessage}
          selectedConfrontationTextCount={selectedConfrontationTexts.length}
          selectedPolygonCount={selectedPolygons.length}
          selectedSegmentCount={selectedSegmentIds.length}
          technicalSummaryReady={Boolean(technicalSummarySnapshot)}
          viewerMode={viewerMode}
          zoom={zoom}
          texts={resolvedHostAdapter.viewerHeaderTexts}
          onCenterDrawing={handleCenterDrawing}
          onClearSelection={handleClearSelection}
          onConfirmPolygons={handleConfirmPolygonSelection}
          onGenerateTechnicalSummary={handleGenerateSummary}
          onResetView={handleResetView}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      )}

      <div
        style={{
          width: '100%',
          maxWidth: 'none',
          margin: '0',
          position: 'relative',
          minHeight: embeddedMode ? '100%' : '90vh',
          height: embeddedMode ? '100%' : '90vh'
        }}
      >
        <ViewerSegmentContextMenu
          manualBridgeCount={manualBridgeSegments.length}
          segmentContextMenu={segmentContextMenu}
          selectedSegmentCount={selectedSegmentIds.length}
          selectedSegmentIds={selectedSegmentIds}
          onCheckSelectedSegments={handleCheckSelectedSegments}
          onClearBridges={handleClearBridges}
          onClearSegmentSelection={clearSegmentSelection}
          onClose={closeSegmentContextMenu}
          onCloseGapFromSelectedSegments={handleCloseGapFromSelectedSegments}
          onRemoveLastBridge={handleRemoveLastBridge}
          onToggleSegmentSelection={toggleSegmentSelection}
        />
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} onContextMenu={handleContextMenu}
          onWheel={handleWheel}
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid #dee2e6',
            display: 'block',
            cursor: embeddedMode && !interactive
              ? embeddedCursor
              : (isDragging ? 'grabbing' : (isHoveringText ? 'text' : 'grab'))
          }}
        />
        {embeddedMode && !interactive && embeddedToolMode === 'point-to-point' && embeddedDrawingPoints.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 16,
              bottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '8px 10px',
              border: '1px solid #94a3b8',
              background: 'rgba(248, 250, 252, 0.96)',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
              borderRadius: 8,
              zIndex: 4
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {pointToPointActiveCommandLabel && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  border: '1px solid #93c5fd',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.3
                }}
              >
                {pointToPointActiveCommandLabel}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#334155', fontSize: 11 }}>
                <span>{pointToPointPanelTexts.distanceLabel}</span>
                <input
                  ref={pointToPointDistanceInputRef}
                  value={pointToPointDistanceDisplayValue}
                  onChange={(event) => {
                    setPointToPointDistanceInput(event.target.value);
                    setPointToPointDistanceDirty(true);
                  }}
                  onFocus={() => setPointToPointActiveField('distance')}
                  placeholder={pointToPointPanelTexts.distancePlaceholder}
                  style={{
                    width: 88,
                    padding: '4px 6px',
                    border: `1px solid ${
                      pointToPointActiveField === 'distance'
                        ? '#1d4ed8'
                        : (pointToPointDistanceDirty ? '#2563eb' : '#cbd5e1')
                    }`,
                    borderRadius: 4,
                    fontSize: 12,
                    color: '#0f172a',
                    background: pointToPointActiveField === 'distance' ? '#eff6ff' : '#ffffff',
                    boxShadow: pointToPointActiveField === 'distance' ? '0 0 0 1px rgba(37, 99, 235, 0.15)' : 'none'
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#334155', fontSize: 11 }}>
                <span>{pointToPointPanelTexts.angleLabel}</span>
                <input
                  ref={pointToPointAngleInputRef}
                  value={pointToPointAngleDisplayValue}
                  onChange={(event) => {
                    setPointToPointAngleInput(event.target.value);
                    setPointToPointAngleDirty(true);
                  }}
                  onFocus={() => setPointToPointActiveField('angle')}
                  placeholder={pointToPointPanelTexts.anglePlaceholder}
                  style={{
                    width: 78,
                    padding: '4px 6px',
                    border: `1px solid ${
                      pointToPointActiveField === 'angle'
                        ? '#1d4ed8'
                        : (pointToPointAngleDirty ? '#2563eb' : '#cbd5e1')
                    }`,
                    borderRadius: 4,
                    fontSize: 12,
                    color: '#0f172a',
                    background: pointToPointActiveField === 'angle' ? '#eff6ff' : '#ffffff',
                    boxShadow: pointToPointActiveField === 'angle' ? '0 0 0 1px rgba(37, 99, 235, 0.15)' : 'none'
                  }}
                />
              </label>
              <div style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>
                {pointToPointPanelTexts.keyboardHint}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewerDXF;

