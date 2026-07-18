import { useEffect } from 'react';
import type React from 'react';
import { calculateDistance, type Point2D } from '@/graphics-engine/shared/geometry';
import type { DXFData, DXFEntity, DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';
import {
  buildSelectedTextId,
  extractTextPosition
} from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import {
  buildArcSamplePoints,
  buildPolylineSamplePoints,
  getSampledPointBounds
} from '@/graphics-engine/components/viewer-dxf/dxfGeometryUtils';
import { applyViewerTransform, arePointListsEqual } from '@/graphics-engine/components/viewer-dxf/georeferencingUtils';
import { getIssueSeverityColor } from '@/graphics-engine/components/viewer-dxf/correctiveUtils';
import { getMidpoint, getSegmentMidpoint } from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import type { CorrectiveTool, ViewerMode } from '@/graphics-engine/shared/corrective';
import {
  applyPreviewTransformToEntity,
  getEntityBoundsWithPreview,
  getSelectionFrame,
  getSelectionHandleInfos,
  type EntityPreviewTransform,
  type SelectionHandleKind
} from '@/graphics-engine/components/viewer-dxf/selectionTransformUtils';
import type {
  HoverConfrontationText,
  HoverReferencePoint,
  SegmentConfrontationAnnotation,
  SelectedConfrontationText
} from '@/graphics-engine/components/viewer-dxf/viewerState';
import type { DrawingBounds, DrawingTextAlignment, DrawingTextVerticalAlignment } from '@/graphics-engine/components/viewer-dxf/viewerContracts';
import { buildEntitySelectionId } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import { getAciColorHex } from '@/graphics-engine/shared/aciColors';

interface CorrectiveInspectionEntry {
  lotNumber: number;
  polygonIndex: number;
  polygon: Point2D[] | null;
  centroid: Point2D | null;
  area: number | null;
  textsInside: string[];
  issueCount: number;
  severity: 'BLOQUEANTE' | 'AVISO' | null;
  primaryIssueCode?: string | null;
  primaryIssueMessage?: string | null;
  vertexGapCandidates: Array<{
    distance: number;
    startIndex: number;
    endIndex: number;
    startPoint: Point2D;
    endPoint: Point2D;
  }>;
  segmentGapCandidates: Array<{
    distance: number;
    overlapRatio: number;
    parallelismScore: number;
    firstEdgeIndex: number;
    secondEdgeIndex: number;
    firstStart: Point2D;
    firstEnd: Point2D;
    secondStart: Point2D;
    secondEnd: Point2D;
  }>;
}

const getFocusedCorrectivePolygonPresentation = (inspection: CorrectiveInspectionEntry | null) => {
  if (!inspection) {
    return {
      fill: 'rgba(239, 68, 68, 0.18)',
      stroke: '#dc2626',
      vertex: '#ef4444'
    };
  }

  if (inspection.severity === 'BLOQUEANTE') {
    return {
      fill: 'rgba(239, 68, 68, 0.18)',
      stroke: '#dc2626',
      vertex: '#ef4444'
    };
  }

  if (inspection.vertexGapCandidates.length > 0 || inspection.segmentGapCandidates.length > 0) {
    return {
      fill: 'rgba(245, 158, 11, 0.16)',
      stroke: '#d97706',
      vertex: '#f59e0b'
    };
  }

  return {
    fill: 'rgba(34, 197, 94, 0.15)',
    stroke: '#16a34a',
    vertex: '#22c55e'
  };
};

export interface ViewerCanvasRendererMessages {
  segmentPointTitle: string;
  buildSegmentPointLabel: (params: { x: number; y: number }) => string;
  confrontationTextTitle: string;
  buildGeoreferenceLabel: (params: { georeferencedX: number; georeferencedY: number }) => string;
  buildOriginalPointLabel: (params: { originalX: number; originalY: number }) => string;
  referenceSourceLabel: string;
  buildHoverEastNorthLabel: (params: { x: number; y: number }) => string;
  buildEntityStatsLabel: (params: { entityCount: number; drawnCount: number }) => string;
  buildScaleLabel: (params: { scale: number; zoom: number }) => string;
  buildSizeLabel: (params: { width: number; height: number }) => string;
  emptyCanvasLabel: string;
  buildGeoreferencedStatusLabel: (params: {
    matchedPoints: number;
    averageResidualMeters: number;
  }) => string;
  buildCorrectiveLotBadgeTitle: (params: { lotNumber: number | string }) => string;
  buildCorrectiveLotBadgeSummary: (params: { issueCount: number; severity: string | null }) => string;
  buildCorrectiveLotMissingTitle: (params: { lotNumber: number | string }) => string;
  correctiveLotMissingDescription: string;
  buildVertexGapLabel: (params: { distance: number }) => string;
  buildSegmentGapLabel: (params: { distance: number }) => string;
  buildRecentlyCorrectedLotLabel: (params: { lotNumber: number | string }) => string;
}

interface UseViewerCanvasRendererParams {
  activeConfrontationTextId: string | null;
  activeCorrectiveTool?: CorrectiveTool;
  activeSelectionHandle?: SelectionHandleKind | null;
  activeTransformLabel?: string | null;
  activeTransformOrthogonal?: boolean;
  activeTransformPoint?: Point2D | null;
  activeTransformProportional?: boolean;
  activeTransformSnap?: boolean;
  analyzeSegmentSet: (segmentsToAnalyze: Array<{ p1: Point2D; p2: Point2D }>) => {
    isClosed: boolean;
    openNodes: Point2D[];
    invalidNodes: Point2D[];
    closestGap: { a: Point2D; b: Point2D; distance: number } | null;
  };
  canvasRef: React.RefObject<HTMLCanvasElement>;
  correctiveFocusLotNumber: number | null;
  correctiveFocusPolygon: Point2D[] | null;
  correctiveLotInspectionEntries: CorrectiveInspectionEntry[];
  correctiveTargetPoint: Point2D | null;
  detectedPolygons: Point2D[][];
  detectedPolygonEntries: Array<{
    polygon: Point2D[];
    lotNumber: number | null;
    textsInside: string[];
    lotAnchorPosition: Point2D | null;
    source: 'direct' | 'face';
    area: number;
    vertexCount: number;
  }>;
  drawingBounds: DrawingBounds | null;
  drawingPreviewLabel?: string | null;
  drawingPreviewText?: {
    point: Point2D;
    text: string;
    color?: string;
    fontSize?: number;
    rotationDegrees?: number;
    alignment?: 'left' | 'center' | 'right';
    verticalAlignment?: 'baseline' | 'middle' | 'top';
  } | null;
  copyEntityPreviewTransform?: EntityPreviewTransform | null;
  selectedEntityPreviewTransform?: EntityPreviewTransform | null;
  boundsData: DXFData | null;
  dxfData: DXFData | null;
  entitySelectionBox: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null;
  zoomSelectionBox: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null;
  focusedCorrectiveLotInspection: CorrectiveInspectionEntry | null;
  georeferencingTransform: {
    rotationRadians: number;
    rotationDegrees: number;
    scale: number;
    translateX: number;
    translateY: number;
    averageResidualMeters: number;
    matchedPoints: number;
  } | null;
  hoverConfrontationText: HoverConfrontationText | null;
  hoverSelectionHandle?: SelectionHandleKind | null;
  hoverSelectionMode?: 'scale' | 'rotate' | null;
  hoverPoint: Point2D | null;
  hoverPointIsDetectedVertex?: boolean;
  hoverPolygon: Point2D[] | null;
  hoverReferencePoint: HoverReferencePoint | null;
  hoverSegmentTargetPoint: Point2D | null;
  hoverSegmentTargetPointIsDetectedVertex?: boolean;
  gridMajorStep?: number;
  gridSnapSize?: number;
  interactive?: boolean;
  minimumWorkspaceSize?: number;
  manualBridgeSegments: Array<{ p1: Point2D; p2: Point2D }>;
  manualPolygon: Point2D[];
  partialScopePolygons: Point2D[][];
  overlayPoints: Array<{
    point: Point2D;
    color?: string;
    radius?: number;
    label?: string;
    labelColor?: string;
    labelBackgroundColor?: string;
    labelBorderColor?: string;
    labelOffsetX?: number;
    labelOffsetY?: number;
  }>;
  overlaySegments: Array<{
    start: Point2D;
    end: Point2D;
    color?: string;
    dashed?: boolean;
    strokeWidth?: number;
  }>;
  pan: { x: number; y: number };
  pendingConfrontationSegmentPoints: Point2D[];
  recentlyCorrectedLotNumber: number | null;
  recentlyCorrectedPolygon: Point2D[] | null;
  recentlyCorrectedPolygonCentroid: Point2D | null;
  segmentAnnotations: SegmentConfrontationAnnotation[];
  selectedCloseGapVertices: number[];
  selectedConfrontationTexts: SelectedConfrontationText[];
  selectedCorrectiveVertex: { polygonIndex: number; vertexIndex: number } | null;
  selectedCorrectiveVertexPoint: Point2D | null;
  selectedEntityIds: string[];
  selectedJoinVertices: number[];
  selectedPolygons: Point2D[][];
  selectedSegmentIds: string[];
  selectedSegments: Array<{ id: string; p1: Point2D; p2: Point2D }>;
  setDrawingBounds: React.Dispatch<React.SetStateAction<DrawingBounds | null>>;
  setGridOrigin: React.Dispatch<React.SetStateAction<Point2D>>;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  setValidPoints: React.Dispatch<React.SetStateAction<Point2D[]>>;
  onInitialCanvasRendered?: () => void;
  showGrid?: boolean;
  showDetectedPolygonMeasurements?: boolean;
  showHoverCoordinates?: boolean;
  viewerMode?: ViewerMode;
  zoom: number;
  messages?: ViewerCanvasRendererMessages;
}

const DEFAULT_VIEWER_RENDERER_MESSAGES: NonNullable<UseViewerCanvasRendererParams['messages']> = {
  segmentPointTitle: 'Ponto do trecho',
  buildSegmentPointLabel: ({ x, y }) => `E: ${x.toFixed(3)} N: ${y.toFixed(3)}`,
  confrontationTextTitle: 'Texto de confrontacao',
  buildGeoreferenceLabel: ({ georeferencedX, georeferencedY }) => `Georref.: E ${georeferencedX.toFixed(3)} | N ${georeferencedY.toFixed(3)}`,
  buildOriginalPointLabel: ({ originalX, originalY }) => `Original: X ${originalX.toFixed(3)} | Y ${originalY.toFixed(3)}`,
  referenceSourceLabel: 'Fonte: ponto reconhecido no DXF e no cadastro',
  buildHoverEastNorthLabel: ({ x, y }) => `E: ${x.toFixed(3)} | N: ${y.toFixed(3)}`,
  buildEntityStatsLabel: ({ entityCount, drawnCount }) => `Entidades: ${entityCount} | Desenhadas: ${drawnCount}`,
  buildScaleLabel: ({ scale, zoom }) => `Escala: ${scale.toFixed(2)}x | Zoom: ${zoom.toFixed(2)}x`,
  buildSizeLabel: ({ width, height }) => `Tamanho: ${width.toFixed(1)} x ${height.toFixed(1)}`,
  emptyCanvasLabel: 'Canvas pronto para novo desenho',
  buildGeoreferencedStatusLabel: ({ matchedPoints, averageResidualMeters }) => `Georreferenciado: ${matchedPoints} pontos | Residuo medio ${averageResidualMeters.toFixed(3)} m`,
  buildCorrectiveLotBadgeTitle: ({ lotNumber }) => `Lote ${lotNumber}`,
  buildCorrectiveLotBadgeSummary: ({ issueCount, severity }) => `${issueCount} pend. • ${severity === 'BLOQUEANTE' ? 'bloq.' : 'aviso'}`,
  buildCorrectiveLotMissingTitle: ({ lotNumber }) => `Lote ${lotNumber} nao foi localizado no canvas`,
  correctiveLotMissingDescription: 'O resumo tecnico cita o lote, mas a extracao atual nao o materializou.',
  buildVertexGapLabel: ({ distance }) => `Lacuna vert.: ${distance.toFixed(2)}`,
  buildSegmentGapLabel: ({ distance }) => `Arestas prox.: ${distance.toFixed(2)}`,
  buildRecentlyCorrectedLotLabel: ({ lotNumber }) => `Lote ${lotNumber} corrigido agora`
};

const toWorldStrokeWidth = (screenPixels: number, nextScale: number) => screenPixels / Math.max(nextScale, 0.0001);
const DETECTED_MEASUREMENT_MIN_SCREEN_LENGTH = 34;
const DETECTED_MEASUREMENT_DECIMALS = 2;

const expandRangeToMinimumSpan = (minValue: number, maxValue: number, minimumSpan: number) => {
  const center = (minValue + maxValue) / 2;
  const halfSpan = Math.max((maxValue - minValue) / 2, minimumSpan / 2);
  return {
    min: center - halfSpan,
    max: center + halfSpan
  };
};

const getGridLineStart = (visibleMin: number, step: number, origin: number) => (
  origin + Math.floor((visibleMin - origin) / step) * step
);

const getGridLineEnd = (visibleMax: number, step: number, origin: number) => (
  origin + Math.ceil((visibleMax - origin) / step) * step
);

const isMajorGridLine = (value: number, origin: number, majorStep: number) => (
  Math.abs((value - origin) / majorStep - Math.round((value - origin) / majorStep)) < 0.0001
);

const shouldUseOffsetGridOrigin = (
  minValue: number,
  maxValue: number,
  gridStep: number
) => {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || !Number.isFinite(gridStep) || gridStep <= 0) {
    return false;
  }

  const doesNotCrossZero = minValue > gridStep || maxValue < -gridStep;
  const nearestToZero = Math.min(Math.abs(minValue), Math.abs(maxValue));
  return doesNotCrossZero && nearestToZero >= gridStep * 1000;
};

const rangeIntersects = (minA: number, maxA: number, minB: number, maxB: number) =>
  maxA >= minB && maxB >= minA;

const pointIsVisibleInWorldBounds = (
  point: Point2D,
  worldBounds: { minX: number; minY: number; maxX: number; maxY: number },
  padding: number
) => (
  point.x >= worldBounds.minX - padding
  && point.x <= worldBounds.maxX + padding
  && point.y >= worldBounds.minY - padding
  && point.y <= worldBounds.maxY + padding
);

const wrapCanvasTextLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [];
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidateLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidateLine).width <= maxWidth || !currentLine) {
      currentLine = candidateLine;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const truncated = lines.slice(0, maxLines);
  while (truncated.length > 0 && ctx.measureText(`${truncated[truncated.length - 1]}...`).width > maxWidth) {
    const lastLine = truncated[truncated.length - 1];
    const shortened = lastLine.slice(0, -1).trim();
    if (!shortened) {
      break;
    }
    truncated[truncated.length - 1] = shortened;
  }
  truncated[truncated.length - 1] = `${truncated[truncated.length - 1]}...`;
  return truncated;
};

const buildNormalizedSegmentKey = (start: Point2D, end: Point2D) => {
  const midpoint = getMidpoint(start, end);
  const distance = calculateDistance(start, end);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const normalizedAngle = angle < 0 ? angle + Math.PI : angle;
  return [
    midpoint.x.toFixed(1),
    midpoint.y.toFixed(1),
    distance.toFixed(1),
    normalizedAngle.toFixed(2)
  ].join('::');
};

const formatDetectedMeasurement = (distance: number) => `${distance.toFixed(DETECTED_MEASUREMENT_DECIMALS)} m`;

const getPolygonMeasurementAnchor = (polygon: Point2D[]): Point2D => {
  if (polygon.length === 0) {
    return { x: 0, y: 0 };
  }

  const total = polygon.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / polygon.length,
    y: total.y / polygon.length
  };
};

const hasDetectedLotKeyword = (text: string) => {
  const normalizedText = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalizedText.includes('lote');
};

const isDetectedPolygonEntryValidForMeasurements = (entry: {
  lotNumber: number | null;
  textsInside: string[];
}) => (
  entry.lotNumber !== null
  || entry.textsInside.some(hasDetectedLotKeyword)
);

const entityIntersectsVisibleWorldBounds = (
  entity: DXFEntity,
  worldBounds: { minX: number; minY: number; maxX: number; maxY: number },
  padding: number
) => {
  const props = entity.properties as DXFEntityProperties;
  switch (entity.type) {
    case 'LINE': {
      if (
        typeof props.x1 !== 'number'
        || typeof props.y1 !== 'number'
        || typeof props.x2 !== 'number'
        || typeof props.y2 !== 'number'
      ) {
        return false;
      }
      return rangeIntersects(
        Math.min(props.x1, props.x2) - padding,
        Math.max(props.x1, props.x2) + padding,
        worldBounds.minX,
        worldBounds.maxX
      ) && rangeIntersects(
        Math.min(props.y1, props.y2) - padding,
        Math.max(props.y1, props.y2) + padding,
        worldBounds.minY,
        worldBounds.maxY
      );
    }
    case 'CIRCLE':
    case 'ARC': {
      if (
        typeof props.centerX !== 'number'
        || typeof props.centerY !== 'number'
        || typeof props.radius !== 'number'
        || props.radius <= 0
      ) {
        return false;
      }
      const sampledBounds = entity.type === 'ARC'
        && typeof props.startAngle === 'number'
        && typeof props.endAngle === 'number'
        ? getSampledPointBounds(
            buildArcSamplePoints({ x: props.centerX, y: props.centerY }, props.radius, props.startAngle, props.endAngle)
          )
        : {
            minX: props.centerX - props.radius,
            minY: props.centerY - props.radius,
            maxX: props.centerX + props.radius,
            maxY: props.centerY + props.radius
          };
      if (!sampledBounds) {
        return false;
      }
      return rangeIntersects(
        sampledBounds.minX - padding,
        sampledBounds.maxX + padding,
        worldBounds.minX,
        worldBounds.maxX
      ) && rangeIntersects(
        sampledBounds.minY - padding,
        sampledBounds.maxY + padding,
        worldBounds.minY,
        worldBounds.maxY
      );
    }
    case 'POINT':
      if (typeof props.x !== 'number' || typeof props.y !== 'number') {
        return false;
      }
      return pointIsVisibleInWorldBounds({ x: props.x, y: props.y }, worldBounds, padding);
    case 'TEXT':
    case 'MTEXT':
    case 'ATTRIB': {
      const textPosition = extractTextPosition(entity);
      return textPosition ? pointIsVisibleInWorldBounds(textPosition, worldBounds, padding * 2) : false;
    }
    case 'LWPOLYLINE':
    case 'POLYLINE': {
      if (!props.vertices?.length) {
        return false;
      }
      const sampledBounds = getSampledPointBounds(buildPolylineSamplePoints(props.vertices, props.closed));
      if (!sampledBounds) {
        return false;
      }
      return rangeIntersects(sampledBounds.minX - padding, sampledBounds.maxX + padding, worldBounds.minX, worldBounds.maxX)
        && rangeIntersects(sampledBounds.minY - padding, sampledBounds.maxY + padding, worldBounds.minY, worldBounds.maxY);
    }
    default:
      return true;
  }
};

export const useViewerCanvasRenderer = ({
  activeConfrontationTextId,
  activeCorrectiveTool,
  activeSelectionHandle,
  activeTransformLabel,
  activeTransformOrthogonal,
  activeTransformPoint,
  activeTransformProportional,
  activeTransformSnap,
  analyzeSegmentSet,
  canvasRef,
  correctiveFocusLotNumber,
  correctiveFocusPolygon,
  correctiveLotInspectionEntries,
  correctiveTargetPoint,
  detectedPolygons,
  detectedPolygonEntries,
  drawingBounds,
  drawingPreviewLabel,
  drawingPreviewText,
  copyEntityPreviewTransform,
  selectedEntityPreviewTransform,
  boundsData,
  dxfData,
  entitySelectionBox,
  zoomSelectionBox,
  focusedCorrectiveLotInspection,
  georeferencingTransform,
  hoverConfrontationText,
  hoverSelectionHandle,
  hoverSelectionMode,
  hoverPoint,
  hoverPointIsDetectedVertex = false,
  hoverPolygon,
  hoverReferencePoint,
  hoverSegmentTargetPoint,
  hoverSegmentTargetPointIsDetectedVertex = false,
  gridMajorStep,
  gridSnapSize = 10,
  interactive,
  minimumWorkspaceSize,
  manualBridgeSegments,
  manualPolygon,
  partialScopePolygons,
  overlayPoints,
  overlaySegments,
  pan,
  pendingConfrontationSegmentPoints,
  recentlyCorrectedLotNumber,
  recentlyCorrectedPolygon,
  recentlyCorrectedPolygonCentroid,
  segmentAnnotations,
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
  setScale,
  setValidPoints,
  onInitialCanvasRendered,
  showGrid = true,
  showDetectedPolygonMeasurements = false,
  showHoverCoordinates = true,
  viewerMode,
  zoom,
  messages
}: UseViewerCanvasRendererParams) => {
  const resolvedMessages = messages ?? DEFAULT_VIEWER_RENDERER_MESSAGES;
  const resolveCanvasTextAlign = (alignment?: DrawingTextAlignment | number): CanvasTextAlign => {
    if (alignment === 'center' || alignment === 1 || alignment === 4 || alignment === 3 || alignment === 5) {
      return 'center';
    }
    if (alignment === 'right' || alignment === 2) {
      return 'right';
    }
    return 'left';
  };

  const resolveCanvasTextBaseline = (alignment?: DrawingTextVerticalAlignment | number | 'bottom', horizontalAlign?: number): CanvasTextBaseline => {
    if (horizontalAlign === 4) {
      return 'middle';
    }
    if (alignment === 'middle' || alignment === 2) {
      return 'middle';
    }
    if (alignment === 'top' || alignment === 3) {
      return 'top';
    }
    if (alignment === 'bottom' || alignment === 1) {
      return 'bottom';
    }
    // Retornamos 'alphabetic' para não estragar o alinhamento com a caixa delimitadora,
    // que foi o que fez a linha do P 01 "subir" acidentalmente no ajuste anterior.
    // 'alphabetic' é o padrão matemático natural para textos no Canvas e AutoCAD.
    return 'alphabetic';
  };

  const normalizeDxTextContent = (text: string) => {
    if (!text) return '';

    return text
      // Códigos de formatação sem ponto e vírgula
      .replace(/\\[LlOo]/g, '') // Underline/Overline on/off
      // Quebras e espacos especiais do MTEXT
      .replace(/\\P/gi, '\n')
      .replace(/\\X/gi, '\n')
      .replace(/\\~/g, ' ')
      // Texto empilhado, ex.: \S1/2; (pega a primeira parte antes da barra)
      .replace(/\\S([^;]+);/gi, (_match, p1) => p1.replace(/[\^#]/g, '/')) 
      // Unicode \U+XXXX (muito usado no AutoCAD para acentos e símbolos)
      .replace(/\\U\+([0-9A-Fa-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      // Símbolos clássicos do AutoCAD
      .replace(/%%c/gi, 'Ø')
      .replace(/%%d/gi, '°')
      .replace(/%%p/gi, '±')
      .replace(/%%u/gi, '')
      .replace(/%%o/gi, '')
      // Marcadores de formato em linha (com ponto e vírgula), ex.: \C6; \ptz; \pxqc; \H1.5x; \W1.2;
      .replace(/\\[A-Za-z0-9][^;\\{}]*;/g, '')
      // Chaves de agrupamento de estilo do AutoCAD
      .replace(/[{}]/g, '')
      // Barra invertida escapada remanescente
      .replace(/\\\\/g, '\\')
      // Correção de double encoding comum em DXF (ANSI lido como UTF-8 gerando cp437)
      .replace(/V├ëRTICE/g, 'VÉRTICE')
      .replace(/V├\+RTICE/g, 'VÉRTICE')
      .replace(/VÃ‰RTICE/g, 'VÉRTICE')
      .replace(/├ë/g, 'É')
      .replace(/Ã‰/g, 'É')
      .replace(/Ã‡/g, 'Ç')
      .replace(/Ã£/g, 'ã')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú')
      .replace(/Ãª/g, 'ê')
      .replace(/Ã§/g, 'ç')
      .replace(/Ãµ/g, 'õ')
      .replace(/Ã¢/g, 'â')
      // Higienizacao final
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const resolveEntityCanvasTextBaseline = (_entity: DXFEntity, _props: DXFEntityProperties): CanvasTextBaseline => {
    // Retornamos 'alphabetic' para todos os textos para garantir consistência no baseline,
    // que é o padrão matemático natural para textos no Canvas e AutoCAD.
    // Ajustes verticais específicos para MTEXT são tratados via offset no momento do desenho.
    return 'alphabetic';
  };

  const configureReadableStrokeContext = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const drawReadableCanvasText = ({
    ctx,
    text,
    x,
    y,
    fillStyle,
    fontSize,
    outlineColor = 'rgba(248, 250, 252, 0.94)',
    outlineScale = 0.16
  }: {
    ctx: CanvasRenderingContext2D;
    text: string;
    x: number;
    y: number;
    fillStyle: string;
    fontSize: number;
    outlineColor?: string;
    outlineScale?: number;
  }) => {
    configureReadableStrokeContext(ctx);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = Math.max(fontSize * outlineScale, 1.25);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fillStyle;
    ctx.fillText(text, x, y);
  };

  const drawDxTextContent = ({
    ctx,
    props,
    fillStyle,
    fontSize
  }: {
    ctx: CanvasRenderingContext2D;
    props: DXFEntityProperties;
    fillStyle: string;
    fontSize: number;
  }) => {
    const rawText = typeof props.text === 'string' ? props.text : '';       
    const normalizedText = normalizeDxTextContent(rawText);
    const lines = normalizedText.split(/\r?\n/);
    const safeLines = lines.length > 0 ? lines : [''];
    const lineHeightFactor = typeof props.lineSpacing === 'number' && props.lineSpacing > 0
      ? Math.max(props.lineSpacing, 1)
      : 1.18;
    const lineHeight = Math.max(fontSize * lineHeightFactor, fontSize);
    const totalBlockHeight = lineHeight * Math.max(safeLines.length - 1, 0);
    let startY = 0;
    const vAlign = props.verticalAlign;

    // Calcula o offset inicial baseado no alinhamento vertical.
    // Como textBaseline é 'alphabetic', o Y passado para fillText será a linha de base.
    // fontSize * 0.8 aproxima a altura do ascent (acima da linha de base).
    // fontSize * 0.2 aproxima a altura do descent (abaixo da linha de base).
    
    if (vAlign === 3) {
      // Top: A coordenada indica o topo do texto.
      // Precisamos descer a linha de base em fontSize * 0.8 para que o topo fique na coordenada.
      startY = fontSize * 0.8;
    } else if (vAlign === 2) {
      // Middle: A coordenada indica o meio do bloco de texto.
      // Metade do bloco fica para cima, metade para baixo.
      startY = -(totalBlockHeight / 2) + (fontSize * 0.3); // Aproximação do meio visual
    } else if (vAlign === 1) {
      // Bottom: A coordenada indica a base inferior do bloco.
      // Precisamos subir a linha de base do último texto, então a do primeiro texto sobe ainda mais.
      startY = -totalBlockHeight - (fontSize * 0.2);
    } else {
      // 0 ou undefined (Baseline): A coordenada já é a linha de base do primeiro texto.
      startY = 0;
    }

    safeLines.forEach((line, index) => {
      drawReadableCanvasText({
        ctx,
        text: line,
        x: 0,
        y: startY + (index * lineHeight),
        fillStyle,
        fontSize
      });
    });
  };

  const resolveDxFontSize = (height: number | undefined, scale: number): number => {
    const baseHeight = typeof height === 'number' && height > 0 ? height : 2.5;

    // Achatamento mais agressivo apenas para textos muito grandes (como nomes de ruas)
    const compressedHeight = baseHeight <= 5
      ? baseHeight
      : 5 + ((baseHeight - 5) * 0.35);

    // O fator base original do AutoCAD é 1.0 (altura exata).
    // O boost inflava textos pequenos, o que estourava os textos das tabelas (que são ~0.5)
    // Reduzindo o boost para garantir fidelidade às dimensões do Model Space.
    const boost = 1.0;

    // Piso mínimo pequeno apenas para garantir legibilidade mínima sem estragar tabelas
    const minimumSize = 1.5;

    return Math.max(compressedHeight * scale * boost, minimumSize);
  };

  const traceDisplayPathFromWorldPoints = (
    ctx: CanvasRenderingContext2D,
    worldPoints: Point2D[],
    mapPoint: (point: Point2D) => Point2D
  ) => {
    if (worldPoints.length === 0) {
      return;
    }

    const firstPoint = mapPoint(worldPoints[0]);
    ctx.moveTo(firstPoint.x, firstPoint.y);
    for (let index = 1; index < worldPoints.length; index += 1) {
      const point = mapPoint(worldPoints[index]);
      ctx.lineTo(point.x, point.y);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dxfData?.entities) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const viewportWidth = Math.max(canvas.clientWidth, 1);
    const viewportHeight = Math.max(canvas.clientHeight, 1);
    const devicePixelRatio = typeof window !== 'undefined'
      ? Math.max(window.devicePixelRatio || 1, 1)
      : 1;
    const physicalCanvasWidth = Math.max(Math.round(viewportWidth * devicePixelRatio), 1);
    const physicalCanvasHeight = Math.max(Math.round(viewportHeight * devicePixelRatio), 1);
    const boundsSourceData = boundsData ?? dxfData;
    // Keep viewport/reference bounds stable regardless of visible-layer filtering.
    const usePolygonBounds = false;
    if (canvas.width !== physicalCanvasWidth) {
      canvas.width = physicalCanvasWidth;
    }
    if (canvas.height !== physicalCanvasHeight) {
      canvas.height = physicalCanvasHeight;
    }
    const resetCanvasTransform = () => ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    resetCanvasTransform();
    configureReadableStrokeContext(ctx);
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let rawMinX = Infinity;
    let rawMinY = Infinity;
    let rawMaxX = -Infinity;
    let rawMaxY = -Infinity;
    let validEntities = 0;
    const allX: number[] = [];
    const allY: number[] = [];
    const points: Point2D[] = [];
    const toDisplayPoint = (point: Point2D): Point2D => point;

    const addCoord = (x: number, y: number, includeInSnap: boolean = true, includeInBounds: boolean = true) => {
      if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) {
        return;
      }
      const displayPoint = toDisplayPoint({ x, y });
      if (includeInBounds) {
        allX.push(displayPoint.x);
        allY.push(displayPoint.y);
        rawMinX = Math.min(rawMinX, displayPoint.x);
        rawMinY = Math.min(rawMinY, displayPoint.y);
        rawMaxX = Math.max(rawMaxX, displayPoint.x);
        rawMaxY = Math.max(rawMaxY, displayPoint.y);
      }
      if (includeInSnap) {
        points.push({ x, y, id: `V_${x.toFixed(3)}_${y.toFixed(3)}` });
      }
    };

    if (usePolygonBounds) {
      detectedPolygons.forEach((polygon) => {
        polygon.forEach((point) => addCoord(point.x, point.y, false, true));
      });
    }

    const collectEntityCoords = (entity: DXFEntity, includeInSnap: boolean, includeInBounds: boolean) => {
      const props = entity.properties as DXFEntityProperties;

      switch (entity.type) {
        case 'LINE':
          if (props.x1 !== undefined && props.y1 !== undefined) {
            addCoord(props.x1, props.y1, includeInSnap, includeInBounds);
          }
          if (props.x2 !== undefined && props.y2 !== undefined) {
            addCoord(props.x2, props.y2, includeInSnap, includeInBounds);
          }
          break;
        case 'CIRCLE':
        case 'ARC':
          if (
            typeof props.centerX === 'number'
            && typeof props.centerY === 'number'
            && typeof props.radius === 'number'
            && props.radius > 0
          ) {
            addCoord(props.centerX - props.radius, props.centerY - props.radius, false, includeInBounds);
            addCoord(props.centerX + props.radius, props.centerY + props.radius, false, includeInBounds);
          }
          break;
        case 'TEXT':
        case 'MTEXT':
        case 'ATTRIB':
          if (props.x !== undefined && props.y !== undefined) {
            addCoord(props.x, props.y, false, false);
          }
          break;
        case 'POINT':
          if (props.x !== undefined && props.y !== undefined) {
            addCoord(props.x, props.y, includeInSnap, includeInBounds);
          }
          break;
        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (props.vertices) {
            props.vertices.forEach((vertex: DXFVertex) => {
              if (vertex.x !== undefined && vertex.y !== undefined) {
                addCoord(vertex.x, vertex.y, includeInSnap, includeInBounds);
              }
            });
          }
          break;
      }
    };

    if (boundsSourceData) {
      boundsSourceData.entities.forEach((entity: DXFEntity) => {
        collectEntityCoords(entity, false, !usePolygonBounds);
      });
    }

    dxfData.entities.forEach((entity: DXFEntity) => {
      collectEntityCoords(entity, true, false);
    });

    if (allX.length > 0) {
      allX.sort((left, right) => left - right);
      allY.sort((left, right) => left - right);

      const q1X = allX[Math.floor(allX.length * 0.25)];
      const q3X = allX[Math.floor(allX.length * 0.75)];
      const iqrX = q3X - q1X;

      const q1Y = allY[Math.floor(allY.length * 0.25)];
      const q3Y = allY[Math.floor(allY.length * 0.75)];
      const iqrY = q3Y - q1Y;

      const multiplier = 2.5;
      const maxAllowedDistX = Math.max(iqrX * multiplier, 50);
      const maxAllowedDistY = Math.max(iqrY * multiplier, 50);

      const medianX = allX[Math.floor(allX.length / 2)];
      const medianY = allY[Math.floor(allY.length / 2)];

      let acceptedXCount = 0;
      for (let index = 0; index < allX.length; index += 1) {
        if (allX[index] >= medianX - maxAllowedDistX && allX[index] <= medianX + maxAllowedDistX) {
          minX = Math.min(minX, allX[index]);
          maxX = Math.max(maxX, allX[index]);
          acceptedXCount += 1;
        }
      }
      let acceptedYCount = 0;
      for (let index = 0; index < allY.length; index += 1) {
        if (allY[index] >= medianY - maxAllowedDistY && allY[index] <= medianY + maxAllowedDistY) {
          minY = Math.min(minY, allY[index]);
          maxY = Math.max(maxY, allY[index]);
          acceptedYCount += 1;
        }
      }
      const minimumAcceptedCount = Math.min(allX.length, Math.max(4, Math.floor(allX.length * 0.15)));
      if (
        acceptedXCount < minimumAcceptedCount
        || acceptedYCount < minimumAcceptedCount
        || minX === Infinity
        || minY === Infinity
      ) {
        minX = rawMinX;
        minY = rawMinY;
        maxX = rawMaxX;
        maxY = rawMaxY;
      }
      validEntities = allX.length;
    }

    const hasDrawableEntities = validEntities > 0 && minX !== Infinity;
    const normalizedGridSnapSize = Number.isFinite(gridSnapSize) && (gridSnapSize ?? 0) > 0
      ? Math.abs(gridSnapSize as number)
      : 5;
    const normalizedWorkspaceSize = Number.isFinite(minimumWorkspaceSize) && (minimumWorkspaceSize ?? 0) > 0
      ? Math.max(minimumWorkspaceSize as number, gridSnapSize * 20)
      : null;
    if (!hasDrawableEntities) {
      const halfWorkspace = normalizedWorkspaceSize ? normalizedWorkspaceSize / 2 : 50;
      minX = -halfWorkspace;
      minY = -halfWorkspace;
      maxX = halfWorkspace;
      maxY = halfWorkspace;
    } else if (normalizedWorkspaceSize) {
      const halfWorkspace = normalizedWorkspaceSize / 2;
      const lockedHalfWidth = Math.max(Math.abs(minX), Math.abs(maxX), halfWorkspace);
      const lockedHalfHeight = Math.max(Math.abs(minY), Math.abs(maxY), halfWorkspace);
      minX = -lockedHalfWidth;
      minY = -lockedHalfHeight;
      maxX = lockedHalfWidth;
      maxY = lockedHalfHeight;
    }

    const contentMinX = hasDrawableEntities ? minX : 0;
    const contentMinY = hasDrawableEntities ? minY : 0;
    const contentMaxX = hasDrawableEntities ? maxX : 0;
    const contentMaxY = hasDrawableEntities ? maxY : 0;
    const resolvedGridOrigin = {
      x: shouldUseOffsetGridOrigin(contentMinX, contentMaxX, normalizedGridSnapSize) ? contentMinX : 0,
      y: shouldUseOffsetGridOrigin(contentMinY, contentMaxY, normalizedGridSnapSize) ? contentMinY : 0
    };
    setGridOrigin((previous) => (
      Math.abs(previous.x - resolvedGridOrigin.x) > 0.000001 || Math.abs(previous.y - resolvedGridOrigin.y) > 0.000001
        ? resolvedGridOrigin
        : previous
    ));

    const minimumSpan = normalizedWorkspaceSize
      ? Math.max(Math.min(normalizedWorkspaceSize / 4, normalizedGridSnapSize * 24), normalizedGridSnapSize * 8)
      : normalizedGridSnapSize * 8;
    const expandedXRange = expandRangeToMinimumSpan(minX, maxX, minimumSpan);
    const expandedYRange = expandRangeToMinimumSpan(minY, maxY, minimumSpan);
    minX = expandedXRange.min;
    maxX = expandedXRange.max;
    minY = expandedYRange.min;
    maxY = expandedYRange.max;

    const paddedWidth = maxX - minX;
    const paddedHeight = maxY - minY;
    const boundsPaddingX = Math.max(paddedWidth * 0.04, normalizedGridSnapSize * 2);
    const boundsPaddingY = Math.max(paddedHeight * 0.04, normalizedGridSnapSize * 2);
    minX -= boundsPaddingX;
    maxX += boundsPaddingX;
    minY -= boundsPaddingY;
    maxY += boundsPaddingY;

    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const bounds = { minX, minY, maxX, maxY, centerX, centerY, drawingWidth, drawingHeight };
    if (JSON.stringify(bounds) !== JSON.stringify(drawingBounds)) {
      setDrawingBounds(bounds);
    }

    const availableWidth = Math.max(viewportWidth * 0.94, 1);
    const availableHeight = Math.max(viewportHeight * 0.94, 1);
    const scaleX = drawingWidth > 0 ? availableWidth / drawingWidth : 1;
    const scaleY = drawingHeight > 0 ? availableHeight / drawingHeight : 1;
    const baseScale = Math.min(scaleX, scaleY);
    const nextScale = baseScale * zoom;
    setScale((previous) => (Math.abs(previous - nextScale) > 0.000001 ? nextScale : previous));
    setValidPoints((previous) => (arePointListsEqual(previous, points) ? previous : points));

    const toScreenPoint = (point: Point2D) => {
      const displayPoint = toDisplayPoint(point);
      return {
        x: viewportWidth / 2 + pan.x + (displayPoint.x - centerX) * nextScale,
        y: viewportHeight / 2 + pan.y - (displayPoint.y - centerY) * nextScale
      };
    };

    const visibleMinX = centerX + (-viewportWidth / 2 - pan.x) / nextScale;
    const visibleMaxX = centerX + (viewportWidth / 2 - pan.x) / nextScale;
    const visibleMaxY = centerY + (viewportHeight / 2 + pan.y) / nextScale;
    const visibleMinY = centerY + (-viewportHeight / 2 + pan.y) / nextScale;
    const visibleWorldBounds = {
      minX: visibleMinX,
      minY: visibleMinY,
      maxX: visibleMaxX,
      maxY: visibleMaxY
    };
    const visibilityPadding = Math.max(normalizedGridSnapSize * 2, 16 / Math.max(nextScale, 0.0001));
    const alignWorldXToScreenPixel = (value: number) => (
      (Math.round((value - centerX) * nextScale + viewportWidth / 2 + pan.x) + 0.5 - (viewportWidth / 2 + pan.x)) / nextScale
    ) + centerX;
    const alignWorldYToScreenPixel = (value: number) => (
      ((viewportHeight / 2 + pan.y) - (Math.round((viewportHeight / 2 + pan.y) - (value - centerY) * nextScale) + 0.5)) / nextScale
    ) + centerY;

    ctx.save();
    resetCanvasTransform();
    ctx.translate(viewportWidth / 2 + pan.x, viewportHeight / 2 + pan.y);
    ctx.scale(nextScale, -nextScale);
    ctx.translate(-centerX, -centerY);

    if (showGrid && Number.isFinite(gridSnapSize) && gridSnapSize > 0) {
      let adaptiveGridStep = gridSnapSize;
      while (adaptiveGridStep * nextScale < 18) {
        adaptiveGridStep *= 2;
      }

      const majorGridStepValue = Number.isFinite(gridMajorStep) && (gridMajorStep ?? 0) > 0
        ? Math.abs(gridMajorStep as number)
        : adaptiveGridStep * 5;
      const startX = getGridLineStart(visibleMinX, adaptiveGridStep, resolvedGridOrigin.x);
      const endX = getGridLineEnd(visibleMaxX, adaptiveGridStep, resolvedGridOrigin.x);
      const startY = getGridLineStart(visibleMinY, adaptiveGridStep, resolvedGridOrigin.y);
      const endY = getGridLineEnd(visibleMaxY, adaptiveGridStep, resolvedGridOrigin.y);

      ctx.save();
      for (let x = startX; x <= endX; x += adaptiveGridStep) {
        const isMajor = isMajorGridLine(x, resolvedGridOrigin.x, majorGridStepValue);
        const alignedX = alignWorldXToScreenPixel(x);
        ctx.beginPath();
        ctx.strokeStyle = isMajor ? '#c7d2e0' : '#d4dee9';
        ctx.lineWidth = toWorldStrokeWidth(isMajor ? 1.0 : 0.6, nextScale);
        ctx.moveTo(alignedX, visibleMinY);
        ctx.lineTo(alignedX, visibleMaxY);
        ctx.stroke();
      }

      for (let y = startY; y <= endY; y += adaptiveGridStep) {
        const isMajor = isMajorGridLine(y, resolvedGridOrigin.y, majorGridStepValue);
        const alignedY = alignWorldYToScreenPixel(y);
        ctx.beginPath();
        ctx.strokeStyle = isMajor ? '#c7d2e0' : '#d4dee9';
        ctx.lineWidth = toWorldStrokeWidth(isMajor ? 1.0 : 0.6, nextScale);
        ctx.moveTo(visibleMinX, alignedY);
        ctx.lineTo(visibleMaxX, alignedY);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.strokeStyle = '#212529';
    ctx.fillStyle = '#212529';
    ctx.lineWidth = 1 / nextScale;

    let linesDrawn = 0;
    let selectedEntityBounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
    const shouldRenderDetailedSelection = selectedEntityIds.length === 1;
    let selectedEntityType: DXFEntity['type'] | null = null;
    let selectedVertexMarkers: Point2D[] = [];
    let selectedMidpointMarker: Point2D | null = null;
    let selectedTextAnchor: Point2D | null = null;
    let selectedGenericCenter: Point2D | null = null;
    let selectedCircleOrientation: { center: Point2D; radius: number; rotationDegrees: number } | null = null;
    const drawGuidedCopyPreviewEntity = (entity: DXFEntity) => {
      const previewEntity = applyPreviewTransformToEntity(entity, copyEntityPreviewTransform!);
      const previewProps = previewEntity.properties as DXFEntityProperties;
      const previewStrokeColor = '#14b8a6';
      const previewFillColor = typeof previewProps.fillColor === 'string' && previewProps.fillColor.trim()
        ? previewProps.fillColor
        : null;

      ctx.save();
      ctx.globalAlpha = 0.76;

      switch (previewEntity.type) {
        case 'LINE':
          if (
            typeof previewProps.x1 === 'number'
            && typeof previewProps.y1 === 'number'
            && typeof previewProps.x2 === 'number'
            && typeof previewProps.y2 === 'number'
          ) {
            const start = toDisplayPoint({ x: previewProps.x1, y: previewProps.y1 });
            const end = toDisplayPoint({ x: previewProps.x2, y: previewProps.y2 });
            ctx.beginPath();
            ctx.strokeStyle = previewStrokeColor;
            ctx.lineWidth = 2.2 / nextScale;
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
          }
          break;

        case 'CIRCLE':
          if (
            typeof previewProps.centerX === 'number'
            && typeof previewProps.centerY === 'number'
            && typeof previewProps.radius === 'number'
            && previewProps.radius > 0
          ) {
            const center = toDisplayPoint({ x: previewProps.centerX, y: previewProps.centerY });
            ctx.beginPath();
            ctx.strokeStyle = previewStrokeColor;
            ctx.lineWidth = 2.2 / nextScale;
            ctx.arc(center.x, center.y, previewProps.radius, 0, Math.PI * 2);
            if (previewFillColor) {
              ctx.fillStyle = previewFillColor;
              ctx.fill();
            }
            ctx.stroke();
          }
          break;

        case 'ARC':
          if (
            typeof previewProps.centerX === 'number'
            && typeof previewProps.centerY === 'number'
            && typeof previewProps.radius === 'number'
            && typeof previewProps.startAngle === 'number'
            && typeof previewProps.endAngle === 'number'
            && previewProps.radius > 0
          ) {
            const sampledArcPoints = buildArcSamplePoints(
              { x: previewProps.centerX, y: previewProps.centerY },
              previewProps.radius,
              previewProps.startAngle,
              previewProps.endAngle
            );
            if (sampledArcPoints.length > 1) {
              ctx.beginPath();
              ctx.strokeStyle = previewStrokeColor;
              ctx.lineWidth = 2.2 / nextScale;
              traceDisplayPathFromWorldPoints(ctx, sampledArcPoints, toDisplayPoint);
              ctx.stroke();
            }
          }
          break;

        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (previewProps.vertices && previewProps.vertices.length > 1) {
            const sampledPolylinePoints = buildPolylineSamplePoints(previewProps.vertices, previewProps.closed);
            ctx.beginPath();
            ctx.strokeStyle = previewStrokeColor;
            ctx.lineWidth = 2.2 / nextScale;
            if (sampledPolylinePoints.length > 0) {
              traceDisplayPathFromWorldPoints(ctx, sampledPolylinePoints, toDisplayPoint);
            }
            if (previewProps.closed) {
              ctx.closePath();
              if (previewFillColor) {
                ctx.fillStyle = previewFillColor;
                ctx.fill();
              }
            }
            ctx.stroke();
          }
          break;

        case 'TEXT':
        case 'MTEXT':
        case 'ATTRIB':
          if (previewProps.text) {
            const textPosition = extractTextPosition(previewEntity);
            if (textPosition) {
              const screenPosition = toScreenPoint(textPosition);
              ctx.restore();
              ctx.save();
              ctx.globalAlpha = 0.82;
              resetCanvasTransform();
              ctx.translate(screenPosition.x, screenPosition.y);
              const displayRotationDegrees = typeof previewProps.rotation === 'number' ? previewProps.rotation : 0;
              if (displayRotationDegrees) {
                ctx.rotate((-displayRotationDegrees * Math.PI) / 180);
              }
              const fontSize = resolveDxFontSize(previewProps.height, nextScale);
              const textHorizontalAlign = typeof previewProps.horizontalAlign === 'number' ? previewProps.horizontalAlign : undefined;
              ctx.font = `bold ${fontSize}px Arial`;
              ctx.textAlign = resolveCanvasTextAlign(textHorizontalAlign); 
              ctx.textBaseline = resolveEntityCanvasTextBaseline(previewEntity, previewProps);
              drawDxTextContent({ ctx, props: previewProps, fillStyle: previewStrokeColor, fontSize });
              ctx.restore();
              return;
            }
          }
          break;

        case 'POINT':
          if (typeof previewProps.x === 'number' && typeof previewProps.y === 'number') {
            const pointPosition = toDisplayPoint({ x: previewProps.x, y: previewProps.y });
            ctx.beginPath();
            ctx.fillStyle = previewStrokeColor;
            ctx.arc(pointPosition.x, pointPosition.y, 3.2 / nextScale, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
      }

      ctx.restore();
    };

    dxfData.entities.forEach((entity: DXFEntity, entityIndex: number) => {
      const isSelectedEntity = selectedEntityIds.includes(buildEntitySelectionId(entity, entityIndex));
      const renderEntity = isSelectedEntity && selectedEntityPreviewTransform
        ? applyPreviewTransformToEntity(entity, selectedEntityPreviewTransform)
        : entity;
      const props = renderEntity.properties as DXFEntityProperties;
      
      let entityLineColor = '#212529';
      if (typeof props.aciColor === 'number' && props.aciColor !== 256) {
        const hex = getAciColorHex(props.aciColor);
        if (hex) entityLineColor = hex;
      } else if (typeof props.originalLayer === 'string' && dxfData.originalLayerColors) {
        const layerColor = dxfData.originalLayerColors[props.originalLayer];
        if (layerColor !== undefined) {
          const hex = getAciColorHex(layerColor);
          if (hex) entityLineColor = hex;
        }
      } else if (typeof props.lineColor === 'string' && props.lineColor.trim()) {
        entityLineColor = props.lineColor;
      }

      const entityFillColor = typeof props.fillColor === 'string' && props.fillColor.trim()
        ? props.fillColor
        : null;
      const shouldRenderEntity = isSelectedEntity || entityIntersectsVisibleWorldBounds(renderEntity, visibleWorldBounds, visibilityPadding);
      if (isSelectedEntity) {
        const entityBounds = getEntityBoundsWithPreview(entity, selectedEntityPreviewTransform);
        if (entityBounds) {
          selectedEntityBounds = selectedEntityBounds
            ? {
                minX: Math.min(selectedEntityBounds.minX, entityBounds.minX),
                minY: Math.min(selectedEntityBounds.minY, entityBounds.minY),
                maxX: Math.max(selectedEntityBounds.maxX, entityBounds.maxX),
                maxY: Math.max(selectedEntityBounds.maxY, entityBounds.maxY)
              }
            : entityBounds;
        }

        if (shouldRenderDetailedSelection) {
          selectedEntityType = renderEntity.type;

          if (
            renderEntity.type === 'LINE'
            && typeof props.x1 === 'number'
            && typeof props.y1 === 'number'
            && typeof props.x2 === 'number'
            && typeof props.y2 === 'number'
          ) {
            selectedVertexMarkers = [
              { x: props.x1, y: props.y1 },
              { x: props.x2, y: props.y2 }
            ];
            selectedMidpointMarker = {
              x: (props.x1 + props.x2) / 2,
              y: (props.y1 + props.y2) / 2
            };
            selectedGenericCenter = selectedMidpointMarker;
          } else if ((renderEntity.type === 'LWPOLYLINE' || renderEntity.type === 'POLYLINE') && props.vertices?.length) {
            const polylineVertices = props.vertices.map((vertex) => ({ x: vertex.x, y: vertex.y }));
            const markerStep = polylineVertices.length > 24 ? Math.ceil(polylineVertices.length / 24) : 1;
            selectedVertexMarkers = polylineVertices.filter((_, index) => index % markerStep === 0 || index === polylineVertices.length - 1);
            const total = polylineVertices.reduce((acc, vertex) => ({ x: acc.x + vertex.x, y: acc.y + vertex.y }), { x: 0, y: 0 });
            selectedGenericCenter = {
              x: total.x / polylineVertices.length,
              y: total.y / polylineVertices.length
            };
          } else if (
            renderEntity.type === 'CIRCLE'
            && typeof props.centerX === 'number'
            && typeof props.centerY === 'number'
            && typeof props.radius === 'number'
            && props.radius > 0
          ) {
            selectedGenericCenter = { x: props.centerX, y: props.centerY };
            selectedCircleOrientation = {
              center: selectedGenericCenter,
              radius: props.radius,
              rotationDegrees: typeof props.rotation === 'number' ? props.rotation : 0
            };
          } else if (renderEntity.type === 'TEXT' || renderEntity.type === 'MTEXT' || renderEntity.type === 'ATTRIB') {
            selectedTextAnchor = extractTextPosition(renderEntity);
            selectedGenericCenter = selectedTextAnchor;
          } else if (entityBounds) {
            selectedGenericCenter = {
              x: (entityBounds.minX + entityBounds.maxX) / 2,
              y: (entityBounds.minY + entityBounds.maxY) / 2
            };
          }
        }
      }

      if (!shouldRenderEntity) {
        return;
      }

      switch (renderEntity.type) {
        case 'LINE':
          if (props.x1 !== undefined && props.y1 !== undefined &&
            props.x2 !== undefined && props.y2 !== undefined) {
            const start = toDisplayPoint({ x: props.x1, y: props.y1 });
            const end = toDisplayPoint({ x: props.x2, y: props.y2 });
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = isSelectedEntity ? '#2563eb' : entityLineColor;
            ctx.lineWidth = toWorldStrokeWidth(isSelectedEntity ? 2.8 : 1.2, nextScale);
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.restore();
            linesDrawn += 1;
          }
          break;

        case 'CIRCLE':
          if (
            typeof props.centerX === 'number'
            && typeof props.centerY === 'number'
            && typeof props.radius === 'number'
            && props.radius > 0
          ) {
            const center = toDisplayPoint({ x: props.centerX, y: props.centerY });
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = isSelectedEntity ? '#2563eb' : entityLineColor;
            ctx.lineWidth = toWorldStrokeWidth(isSelectedEntity ? 2.8 : 1.2, nextScale);
            ctx.arc(center.x, center.y, props.radius, 0, Math.PI * 2);
            if (entityFillColor) {
              ctx.fillStyle = entityFillColor;
              ctx.fill();
            }
            ctx.stroke();
            ctx.restore();
            linesDrawn += 1;
          }
          break;

        case 'ARC':
          if (
            typeof props.centerX === 'number'
            && typeof props.centerY === 'number'
            && typeof props.radius === 'number'
            && typeof props.startAngle === 'number'
            && typeof props.endAngle === 'number'
            && props.radius > 0
          ) {
            const sampledArcPoints = buildArcSamplePoints(
              { x: props.centerX, y: props.centerY },
              props.radius,
              props.startAngle,
              props.endAngle
            );
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = isSelectedEntity ? '#2563eb' : entityLineColor;
            ctx.lineWidth = toWorldStrokeWidth(isSelectedEntity ? 2.8 : 1.2, nextScale);
            if (sampledArcPoints.length > 1) {
              traceDisplayPathFromWorldPoints(ctx, sampledArcPoints, toDisplayPoint);
              ctx.stroke();
            }
            ctx.restore();
            linesDrawn += 1;
          }
          break;

        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (props.vertices && props.vertices.length > 1) {
            const sampledPolylinePoints = buildPolylineSamplePoints(props.vertices, props.closed);
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = isSelectedEntity ? '#2563eb' : entityLineColor;
            ctx.lineWidth = toWorldStrokeWidth(isSelectedEntity ? 2.8 : 1.2, nextScale);
            if (sampledPolylinePoints.length > 0) {
              traceDisplayPathFromWorldPoints(ctx, sampledPolylinePoints, toDisplayPoint);
            }

            if (props.closed) {
              ctx.closePath();
              if (entityFillColor) {
                ctx.fillStyle = entityFillColor;
                ctx.fill();
              }
            }
            ctx.stroke();
            ctx.restore();
            linesDrawn += 1;
          }
          break;

        case 'TEXT':
        case 'MTEXT':
        case 'ATTRIB':
          if (props.text) {
            const textPosition = extractTextPosition(renderEntity);
            const transformedTextPosition = textPosition ? toDisplayPoint(textPosition) : null;
            const isConfrontationTextSelected = textPosition
              ? selectedConfrontationTexts.some((selected) => selected.id === buildSelectedTextId(renderEntity, textPosition))
              : false;
            const isActiveConfrontationText = textPosition
              ? activeConfrontationTextId === buildSelectedTextId(renderEntity, textPosition)
              : false;
            const isHoverConfrontationText = textPosition
              ? hoverConfrontationText?.id === buildSelectedTextId(renderEntity, textPosition)
              : false;

            ctx.save();
            resetCanvasTransform();

            const screenPosition = transformedTextPosition ? toScreenPoint(textPosition!) : null;
            if (!screenPosition) {
              ctx.restore();
              break;
            }

            ctx.translate(screenPosition.x, screenPosition.y);

            const displayRotationDegrees = props.rotation || 0;
            if (displayRotationDegrees) {
              ctx.rotate((-displayRotationDegrees * Math.PI) / 180);
            }

            const fontSize = resolveDxFontSize(props.height, nextScale);
            const textHorizontalAlign = typeof props.horizontalAlign === 'number' ? props.horizontalAlign : undefined;
            const textFillStyle = isSelectedEntity
              ? '#2563eb'
              : (isActiveConfrontationText
                ? '#7b1fa2'
                : (isHoverConfrontationText ? '#c2185b' : (isConfrontationTextSelected ? '#d63384' : entityLineColor)));
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = resolveCanvasTextAlign(textHorizontalAlign);
            ctx.textBaseline = resolveEntityCanvasTextBaseline(renderEntity, props);
            drawDxTextContent({ ctx, props, fillStyle: textFillStyle, fontSize });
            ctx.restore();
          }
          break;

        case 'POINT':
          if (props.x !== undefined && props.y !== undefined) {
            const pointPosition = toDisplayPoint({ x: props.x, y: props.y });
            const pointRadius = (isSelectedEntity ? 3.2 : 2.1) / nextScale;
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = isSelectedEntity ? '#2563eb' : entityLineColor;
            ctx.arc(pointPosition.x, pointPosition.y, pointRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            linesDrawn += 1;
          }
          break;
      }
    });

    if (copyEntityPreviewTransform) {
      dxfData.entities.forEach((entity: DXFEntity, entityIndex: number) => {
        if (!selectedEntityIds.includes(buildEntitySelectionId(entity, entityIndex))) {
          return;
        }
        drawGuidedCopyPreviewEntity(entity);
      });
    }

    overlaySegments.forEach((segment) => {
      const start = toDisplayPoint(segment.start);
      const end = toDisplayPoint(segment.end);
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = segment.color || '#f59e0b';
      ctx.lineWidth = (segment.strokeWidth || 2.4) / nextScale;
      if (segment.dashed) {
        ctx.setLineDash([10 / nextScale, 6 / nextScale]);
      }
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });

    overlayPoints.forEach((overlayPoint) => {
      const displayPoint = toDisplayPoint(overlayPoint.point);
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = overlayPoint.color || '#f59e0b';
      ctx.arc(displayPoint.x, displayPoint.y, (overlayPoint.radius || 6) / nextScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.5 / nextScale;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();

      if (overlayPoint.label) {
        ctx.save();
        resetCanvasTransform();
        ctx.font = 'bold 10px Arial';
        const labelText = overlayPoint.label;
        const paddingX = 6;
        const metrics = ctx.measureText(labelText);
        const boxWidth = metrics.width + (paddingX * 2);
        const boxHeight = 20;
        const drawX = displayPoint.x + (overlayPoint.labelOffsetX ?? 10);
        const drawY = displayPoint.y + (overlayPoint.labelOffsetY ?? -14) - (boxHeight / 2);
        ctx.fillStyle = overlayPoint.labelBackgroundColor || 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = overlayPoint.labelBorderColor || overlayPoint.labelColor || '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(drawX, drawY, boxWidth, boxHeight, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = overlayPoint.labelColor || '#0f172a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, drawX + paddingX, drawY + boxHeight / 2);
        ctx.restore();
      }
    });

    if (drawingPreviewText) {
      const screenPosition = toScreenPoint(drawingPreviewText.point);
      ctx.save();
      resetCanvasTransform();
      ctx.translate(screenPosition.x, screenPosition.y);
      if (drawingPreviewText.rotationDegrees) {
        ctx.rotate((-drawingPreviewText.rotationDegrees * Math.PI) / 180);
      }
      ctx.fillStyle = drawingPreviewText.color || '#f59e0b';
      ctx.font = `${Math.max((drawingPreviewText.fontSize || 2.5) * nextScale * 0.8, 8)}px Arial`;
      ctx.textAlign = resolveCanvasTextAlign(drawingPreviewText.alignment);
      ctx.textBaseline = resolveCanvasTextBaseline(drawingPreviewText.verticalAlignment);
      ctx.fillText(drawingPreviewText.text, 0, 0);
      ctx.restore();
    }

    if (detectedPolygons.length > 0) {
      ctx.save();
      ctx.lineWidth = 1.5 / nextScale;
      ctx.strokeStyle = '#28a745';

      detectedPolygons.forEach((polygon) => {
        if (polygon.length < 3) {
          return;
        }
        const displayPolygon = polygon.map(toDisplayPoint);
        ctx.beginPath();
        ctx.moveTo(displayPolygon[0].x, displayPolygon[0].y);
        for (let index = 1; index < displayPolygon.length; index += 1) {
          ctx.lineTo(displayPolygon[index].x, displayPolygon[index].y);
        }
        ctx.closePath();
        ctx.stroke();
      });
      ctx.restore();
    }

    if (showDetectedPolygonMeasurements && detectedPolygonEntries.length > 0) {
      const renderedSegmentKeys = new Set<string>();

      ctx.save();
      resetCanvasTransform();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      detectedPolygonEntries.forEach((entry) => {
        if (!isDetectedPolygonEntryValidForMeasurements(entry)) {
          return;
        }

        const polygon = entry.polygon;
        if (polygon.length < 2) {
          return;
        }
        const polygonAnchor = entry.lotAnchorPosition ?? getPolygonMeasurementAnchor(polygon);

        for (let index = 0; index < polygon.length; index += 1) {
          const start = polygon[index];
          const end = polygon[(index + 1) % polygon.length];
          if (!start || !end) {
            continue;
          }

          const distance = calculateDistance(start, end);
          if (!Number.isFinite(distance) || distance <= 0.001) {
            continue;
          }

          const segmentKey = buildNormalizedSegmentKey(start, end);
          if (renderedSegmentKeys.has(segmentKey)) {
            continue;
          }
          renderedSegmentKeys.add(segmentKey);

          const startScreen = toScreenPoint(start);
          const endScreen = toScreenPoint(end);
          const deltaX = endScreen.x - startScreen.x;
          const deltaY = endScreen.y - startScreen.y;
          const screenLength = Math.hypot(deltaX, deltaY);
          if (screenLength < DETECTED_MEASUREMENT_MIN_SCREEN_LENGTH) {
            continue;
          }

          const midpoint = getMidpoint(startScreen, endScreen);
          const anchorScreen = toScreenPoint(polygonAnchor);
          const normalX = -deltaY / screenLength;
          const normalY = deltaX / screenLength;
          const toAnchorX = anchorScreen.x - midpoint.x;
          const toAnchorY = anchorScreen.y - midpoint.y;
          const inwardNormalX = ((normalX * toAnchorX) + (normalY * toAnchorY)) >= 0 ? normalX : -normalX;
          const inwardNormalY = ((normalX * toAnchorX) + (normalY * toAnchorY)) >= 0 ? normalY : -normalY;
          const outwardNormalX = -inwardNormalX;
          const outwardNormalY = -inwardNormalY;
          const zoomResponsiveMinFontSize = Math.min(5.6 + (Math.max(zoom - 1, 0) * 1.9), 11.8);
          const fontSize = Math.min(Math.max(screenLength * 0.019, zoomResponsiveMinFontSize), 14.2);
          const offsetScale = Math.min(Math.max(fontSize * 0.7, 5), 11);
          const labelX = midpoint.x + (outwardNormalX * offsetScale);
          const labelY = midpoint.y + (outwardNormalY * offsetScale);
          if (
            labelX < 8
            || labelX > viewportWidth - 8
            || labelY < 8
            || labelY > viewportHeight - 8
          ) {
            continue;
          }

          let angle = Math.atan2(deltaY, deltaX);
          if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
            angle += Math.PI;
          }

          const label = formatDetectedMeasurement(distance);
          ctx.save();
          ctx.font = `${fontSize}px Arial`;
          ctx.translate(labelX, labelY);
          ctx.rotate(angle);
          drawReadableCanvasText({
            ctx,
            text: label,
            x: 0,
            y: 0,
            fillStyle: '#000000',
            fontSize,
            outlineColor: 'rgba(255, 255, 255, 0.9)',
            outlineScale: 0.18
          });
          ctx.restore();
        }
      });

      ctx.restore();
    }

    if (manualBridgeSegments.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 2.8 / nextScale;
      ctx.setLineDash([10 / nextScale, 6 / nextScale]);
      manualBridgeSegments.forEach((segment) => {
        const start = toDisplayPoint(segment.p1);
        const end = toDisplayPoint(segment.p2);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (selectedSegments.length > 0) {
      const analysis = analyzeSegmentSet(selectedSegments);

      ctx.save();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3.2 / nextScale;
      selectedSegments.forEach((segment) => {
        const start = toDisplayPoint(segment.p1);
        const end = toDisplayPoint(segment.p2);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      });
      ctx.restore();

      if (analysis.openNodes.length > 0) {
        ctx.save();
        ctx.fillStyle = '#dc2626';
        analysis.openNodes.forEach((point) => {
          const displayPoint = toDisplayPoint(point);
          ctx.beginPath();
          ctx.arc(displayPoint.x, displayPoint.y, 5 / nextScale, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    }

    if (viewerMode === 'correct' && correctiveLotInspectionEntries.length > 0) {
      ctx.save();
      correctiveLotInspectionEntries
        .filter((entry) => entry.polygon && entry.issueCount > 0)
        .forEach((entry) => {
          const issueColor = getIssueSeverityColor(entry.severity);
          const displayPolygon = entry.polygon!.map(toDisplayPoint);
          ctx.beginPath();
          ctx.moveTo(displayPolygon[0].x, displayPolygon[0].y);
          for (let index = 1; index < displayPolygon.length; index += 1) {
            ctx.lineTo(displayPolygon[index].x, displayPolygon[index].y);
          }
          ctx.closePath();
          ctx.strokeStyle = issueColor;
          ctx.lineWidth = entry.lotNumber === correctiveFocusLotNumber ? 4 / nextScale : 2.2 / nextScale;
          ctx.setLineDash(entry.severity === 'AVISO' ? [8 / nextScale, 5 / nextScale] : []);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      ctx.restore();

      ctx.save();
      resetCanvasTransform();
      correctiveLotInspectionEntries
        .filter((entry) => entry.centroid && entry.issueCount > 0)
        .forEach((entry) => {
          const issueColor = getIssueSeverityColor(entry.severity);
          const centroidPoint = toScreenPoint(entry.centroid!);
          const isFocused = entry.lotNumber === correctiveFocusLotNumber;
          const badgeWidth = isFocused ? 108 : 92;
          const badgeHeight = isFocused ? 40 : 34;
          const x = centroidPoint.x - badgeWidth / 2;
          const y = centroidPoint.y - badgeHeight / 2;

          ctx.fillStyle = isFocused ? `${issueColor}22` : '#ffffff';
          ctx.strokeStyle = issueColor;
          ctx.lineWidth = isFocused ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.roundRect(x, y, badgeWidth, badgeHeight, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = issueColor;
          ctx.font = `${isFocused ? 'bold 12px' : 'bold 11px'} Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(resolvedMessages.buildCorrectiveLotBadgeTitle({ lotNumber: entry.lotNumber }), centroidPoint.x, y + 13);

          ctx.fillStyle = '#334155';
          ctx.font = '10px Arial';
          ctx.fillText(resolvedMessages.buildCorrectiveLotBadgeSummary({
            issueCount: entry.issueCount,
            severity: entry.severity
          }), centroidPoint.x, y + badgeHeight - 11);
        });

      if (correctiveFocusLotNumber !== null && focusedCorrectiveLotInspection && focusedCorrectiveLotInspection.polygonIndex < 0) {
        const missingLotCode = focusedCorrectiveLotInspection.primaryIssueCode?.trim() || null;
        const missingLotMessage = focusedCorrectiveLotInspection.primaryIssueMessage?.trim()
          || resolvedMessages.correctiveLotMissingDescription;
        const badgeWidth = Math.min(Math.max(viewportWidth * 0.62, 420), 640);
        const textAreaWidth = badgeWidth - 24;
        const missingLotCodeLines = missingLotCode
          ? wrapCanvasTextLines(ctx, `Codigo: ${missingLotCode}`, textAreaWidth, 2)
          : [];
        const missingLotDetailLines = wrapCanvasTextLines(ctx, missingLotMessage, textAreaWidth, 6);
        const badgeHeight = 34 + (missingLotCodeLines.length * 18) + (missingLotDetailLines.length * 16);
        const badgeX = 16;
        const badgeY = 78;
        const titleX = badgeX + 12;
        const titleY = badgeY + 18;
        const codeStartY = titleY + 24;
        const detailStartY = codeStartY + (missingLotCodeLines.length * 18) + (missingLotCodeLines.length > 0 ? 4 : 0);
        ctx.fillStyle = '#fff7ed';
        ctx.strokeStyle = getIssueSeverityColor(focusedCorrectiveLotInspection.severity);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#9a3412';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(resolvedMessages.buildCorrectiveLotMissingTitle({ lotNumber: correctiveFocusLotNumber }), titleX, titleY);
        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 11px Arial';
        missingLotCodeLines.forEach((line, index) => {
          ctx.fillText(line, titleX, codeStartY + (index * 18));
        });
        ctx.fillStyle = '#7c2d12';
        ctx.font = '11px Arial';
        missingLotDetailLines.forEach((line, index) => {
          ctx.fillText(line, titleX, detailStartY + (index * 16));
        });
      }
      ctx.restore();
    }

    if (viewerMode === 'correct' && focusedCorrectiveLotInspection?.polygon) {
      const topVertexGap = focusedCorrectiveLotInspection.vertexGapCandidates[0];
      const topSegmentGap = focusedCorrectiveLotInspection.segmentGapCandidates[0];

      if (topVertexGap) {
        const startDisplay = toDisplayPoint(topVertexGap.startPoint);
        const endDisplay = toDisplayPoint(topVertexGap.endPoint);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startDisplay.x, startDisplay.y);
        ctx.lineTo(endDisplay.x, endDisplay.y);
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 2.5 / nextScale;
        ctx.setLineDash([7 / nextScale, 4 / nextScale]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        ctx.save();
        resetCanvasTransform();
        const screenMid = toScreenPoint(getMidpoint(topVertexGap.startPoint, topVertexGap.endPoint));
        ctx.fillStyle = '#0f172a';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(resolvedMessages.buildVertexGapLabel({ distance: topVertexGap.distance }), screenMid.x, screenMid.y - 6);
        ctx.restore();
      }

      if (topSegmentGap) {
        const firstMid = getSegmentMidpoint(topSegmentGap.firstStart, topSegmentGap.firstEnd);
        const secondMid = getSegmentMidpoint(topSegmentGap.secondStart, topSegmentGap.secondEnd);
        const firstDisplay = toDisplayPoint(firstMid);
        const secondDisplay = toDisplayPoint(secondMid);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(firstDisplay.x, firstDisplay.y);
        ctx.lineTo(secondDisplay.x, secondDisplay.y);
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2 / nextScale;
        ctx.setLineDash([5 / nextScale, 5 / nextScale]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        ctx.save();
        resetCanvasTransform();
        const screenMid = toScreenPoint(getMidpoint(firstMid, secondMid));
        ctx.fillStyle = '#581c87';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(resolvedMessages.buildSegmentGapLabel({ distance: topSegmentGap.distance }), screenMid.x, screenMid.y + 6);
        ctx.restore();
      }
    }

    if (viewerMode === 'correct' && recentlyCorrectedPolygon) {
      ctx.save();
      const displayPolygon = recentlyCorrectedPolygon.map(toDisplayPoint);
      ctx.beginPath();
      ctx.moveTo(displayPolygon[0].x, displayPolygon[0].y);
      for (let index = 1; index < displayPolygon.length; index += 1) {
        ctx.lineTo(displayPolygon[index].x, displayPolygon[index].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 5 / nextScale;
      ctx.setLineDash([9 / nextScale, 5 / nextScale]);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      if (recentlyCorrectedPolygonCentroid && recentlyCorrectedLotNumber !== null) {
        ctx.save();
        resetCanvasTransform();
        const centroidPoint = toScreenPoint(recentlyCorrectedPolygonCentroid);
        const badgeWidth = 136;
        const badgeHeight = 30;
        const x = centroidPoint.x - badgeWidth / 2;
        const y = centroidPoint.y - 52;

        ctx.fillStyle = '#ecfdf5';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, badgeWidth, badgeHeight, 999);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#166534';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(resolvedMessages.buildRecentlyCorrectedLotLabel({ lotNumber: recentlyCorrectedLotNumber }), centroidPoint.x, y + badgeHeight / 2);
        ctx.restore();
      }
    }

    if (viewerMode === 'correct' && correctiveFocusPolygon) {
      const focusPresentation = getFocusedCorrectivePolygonPresentation(focusedCorrectiveLotInspection);
      ctx.save();
      ctx.fillStyle = focusPresentation.fill;
      ctx.strokeStyle = focusPresentation.stroke;
      ctx.lineWidth = 4 / nextScale;
      const displayPolygon = correctiveFocusPolygon.map(toDisplayPoint);
      ctx.beginPath();
      ctx.moveTo(displayPolygon[0].x, displayPolygon[0].y);
      for (let index = 1; index < displayPolygon.length; index += 1) {
        ctx.lineTo(displayPolygon[index].x, displayPolygon[index].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      correctiveFocusPolygon.forEach((point, index) => {
        const displayPoint = toDisplayPoint(point);
        ctx.beginPath();
        ctx.arc(displayPoint.x, displayPoint.y, 8 / nextScale, 0, Math.PI * 2);
        const isSelected = selectedCorrectiveVertex?.vertexIndex === index;
        const isJoinSelected = selectedJoinVertices.includes(index);
        const isCloseGapSelected = selectedCloseGapVertices.includes(index);
        ctx.fillStyle = isSelected ? '#7c3aed' : (isJoinSelected ? '#f59e0b' : (isCloseGapSelected ? '#0891b2' : focusPresentation.vertex));
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / nextScale;
        ctx.stroke();
      });

      if (selectedCorrectiveVertexPoint && correctiveTargetPoint) {
        const startDisplay = toDisplayPoint(selectedCorrectiveVertexPoint);
        const endDisplay = toDisplayPoint(correctiveTargetPoint);
        ctx.beginPath();
        ctx.moveTo(startDisplay.x, startDisplay.y);
        ctx.lineTo(endDisplay.x, endDisplay.y);
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2 / nextScale;
        ctx.setLineDash([8 / nextScale, 5 / nextScale]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(endDisplay.x, endDisplay.y, 9 / nextScale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124, 58, 237, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#7c3aed';
        ctx.stroke();
      }

      if (activeCorrectiveTool === 'join-endpoints' && selectedJoinVertices.length === 2) {
        const startPoint = correctiveFocusPolygon[selectedJoinVertices[0]];
        const endPoint = correctiveFocusPolygon[selectedJoinVertices[1]];
        if (startPoint && endPoint) {
          const startDisplay = toDisplayPoint(startPoint);
          const endDisplay = toDisplayPoint(endPoint);
          ctx.beginPath();
          ctx.moveTo(startDisplay.x, startDisplay.y);
          ctx.lineTo(endDisplay.x, endDisplay.y);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3 / nextScale;
          ctx.setLineDash([10 / nextScale, 6 / nextScale]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      if (activeCorrectiveTool === 'close-gap-guided' && selectedCloseGapVertices.length === 2) {
        const startPoint = correctiveFocusPolygon[selectedCloseGapVertices[0]];
        const endPoint = correctiveFocusPolygon[selectedCloseGapVertices[1]];
        if (startPoint && endPoint) {
          const midpoint = getMidpoint(startPoint, endPoint);
          const startDisplay = toDisplayPoint(startPoint);
          const endDisplay = toDisplayPoint(endPoint);
          const midDisplay = toDisplayPoint(midpoint);

          ctx.beginPath();
          ctx.moveTo(startDisplay.x, startDisplay.y);
          ctx.lineTo(midDisplay.x, midDisplay.y);
          ctx.lineTo(endDisplay.x, endDisplay.y);
          ctx.strokeStyle = '#0891b2';
          ctx.lineWidth = 3 / nextScale;
          ctx.setLineDash([10 / nextScale, 5 / nextScale]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.beginPath();
          ctx.arc(midDisplay.x, midDisplay.y, 9 / nextScale, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(8, 145, 178, 0.25)';
          ctx.fill();
          ctx.strokeStyle = '#0891b2';
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    if (interactive && hoverPolygon) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
      const displayPolygon = hoverPolygon.map(toDisplayPoint);
      ctx.beginPath();
      ctx.moveTo(displayPolygon[0].x, displayPolygon[0].y);
      for (let index = 1; index < displayPolygon.length; index += 1) {
        ctx.lineTo(displayPolygon[index].x, displayPolygon[index].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (selectedConfrontationTexts.length > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(214, 51, 132, 0.18)';
      ctx.strokeStyle = '#d63384';
      ctx.lineWidth = 2 / nextScale;

      selectedConfrontationTexts.forEach((selectedText) => {
        const displayPoint = toDisplayPoint({ x: selectedText.x, y: selectedText.y });
        ctx.beginPath();
        ctx.arc(displayPoint.x, displayPoint.y, 10 / nextScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.restore();
    }

    if (segmentAnnotations.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#7b1fa2';
      ctx.lineWidth = 3 / nextScale;

      segmentAnnotations.forEach((annotation) => {
        const startDisplay = toDisplayPoint(annotation.startPoint);
        const endDisplay = toDisplayPoint(annotation.endPoint);
        ctx.beginPath();
        ctx.moveTo(startDisplay.x, startDisplay.y);
        ctx.lineTo(endDisplay.x, endDisplay.y);
        ctx.stroke();

        [annotation.startPoint, annotation.endPoint].forEach((point) => {
          const displayPoint = toDisplayPoint(point);
          ctx.beginPath();
          ctx.arc(displayPoint.x, displayPoint.y, 7 / nextScale, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(123, 31, 162, 0.25)';
          ctx.fill();
          ctx.strokeStyle = '#7b1fa2';
          ctx.stroke();
        });
      });

      ctx.restore();
    }

    if (pendingConfrontationSegmentPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#9c27b0';
      ctx.lineWidth = 2 / nextScale;
      ctx.setLineDash([8 / nextScale, 6 / nextScale]);

      if (pendingConfrontationSegmentPoints.length === 2) {
        const startDisplay = toDisplayPoint(pendingConfrontationSegmentPoints[0]);
        const endDisplay = toDisplayPoint(pendingConfrontationSegmentPoints[1]);
        ctx.beginPath();
        ctx.moveTo(startDisplay.x, startDisplay.y);
        ctx.lineTo(endDisplay.x, endDisplay.y);
        ctx.stroke();
      } else if (pendingConfrontationSegmentPoints.length === 1 && hoverSegmentTargetPoint) {
        const startDisplay = toDisplayPoint(pendingConfrontationSegmentPoints[0]);
        const targetDisplay = toDisplayPoint(hoverSegmentTargetPoint);
        ctx.beginPath();
        ctx.moveTo(startDisplay.x, startDisplay.y);
        ctx.lineTo(targetDisplay.x, targetDisplay.y);
        ctx.stroke();
      }

      pendingConfrontationSegmentPoints.forEach((point, index) => {
        const displayPoint = toDisplayPoint(point);
        ctx.beginPath();
        ctx.arc(displayPoint.x, displayPoint.y, 8 / nextScale, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? 'rgba(156, 39, 176, 0.30)' : 'rgba(123, 31, 162, 0.30)';
        ctx.fill();
        ctx.strokeStyle = '#7b1fa2';
        ctx.stroke();
      });

      ctx.restore();
    }

    if (partialScopePolygons.length > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(249, 115, 22, 0.18)';
      ctx.lineWidth = 2.5 / nextScale;
      ctx.strokeStyle = '#f97316';

      partialScopePolygons.forEach((polygon) => {
        if (polygon.length < 3) {
          return;
        }

        const displayPolygon = polygon.map(toDisplayPoint);
        ctx.beginPath();
        ctx.moveTo(displayPolygon[0].x, displayPolygon[0].y);
        for (let index = 1; index < displayPolygon.length; index += 1) {
          ctx.lineTo(displayPolygon[index].x, displayPolygon[index].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      ctx.restore();
    }

    if (manualPolygon.length > 0) {
      ctx.save();
      const displayPolygon = manualPolygon.map(toDisplayPoint);
      ctx.beginPath();
      ctx.moveTo(displayPolygon[0].x, displayPolygon[0].y);
      for (let index = 1; index < displayPolygon.length; index += 1) {
        ctx.lineTo(displayPolygon[index].x, displayPolygon[index].y);
      }
      ctx.lineWidth = 2 / nextScale;
      ctx.strokeStyle = '#ffc107';
      ctx.stroke();

      displayPolygon.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6 / nextScale, 0, 2 * Math.PI);
        ctx.fillStyle = index === 0 ? '#28a745' : '#ffc107';
        ctx.fill();
        ctx.stroke();
      });

      if (hoverPoint) {
        const guidePoint = toDisplayPoint(hoverPoint);
        const lastPoint = displayPolygon[displayPolygon.length - 1];
        const firstPoint = displayPolygon[0];

        ctx.setLineDash([8 / nextScale, 6 / nextScale]);
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(guidePoint.x, guidePoint.y);
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 1.5 / nextScale;
        ctx.stroke();

        if (manualPolygon.length > 2) {
          ctx.beginPath();
          ctx.moveTo(guidePoint.x, guidePoint.y);
          ctx.lineTo(firstPoint.x, firstPoint.y);
          ctx.strokeStyle = 'rgba(40, 167, 69, 0.65)';
          ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(guidePoint.x, guidePoint.y, 8 / nextScale, 0, 2 * Math.PI);
        ctx.fillStyle = hoverPointIsDetectedVertex ? 'rgba(5, 150, 105, 0.82)' : 'rgba(255, 213, 79, 0.88)';
        ctx.fill();
        ctx.strokeStyle = hoverPointIsDetectedVertex ? '#059669' : '#f59e0b';
        ctx.lineWidth = 2 / nextScale;
        ctx.stroke();
      }

      ctx.restore();
    }

    if (hoverSegmentTargetPoint) {
      const displayPoint = toDisplayPoint(hoverSegmentTargetPoint);
      const segmentPointFill = hoverSegmentTargetPointIsDetectedVertex ? 'rgba(5, 150, 105, 0.78)' : 'rgba(123, 31, 162, 0.75)';
      const segmentPointStroke = hoverSegmentTargetPointIsDetectedVertex ? '#059669' : '#7b1fa2';
      const segmentPointTitle = hoverSegmentTargetPointIsDetectedVertex ? 'Vertice do segmento' : resolvedMessages.segmentPointTitle;
      ctx.beginPath();
      ctx.arc(displayPoint.x, displayPoint.y, 10 / nextScale, 0, 2 * Math.PI);
      ctx.fillStyle = segmentPointFill;
      ctx.fill();
      ctx.strokeStyle = segmentPointStroke;
      ctx.lineWidth = 2 / nextScale;
      ctx.stroke();

      ctx.save();
      resetCanvasTransform();

      const screenPosition = toScreenPoint(hoverSegmentTargetPoint);
      const transformedPoint = georeferencingTransform
        ? applyViewerTransform(hoverSegmentTargetPoint, georeferencingTransform)
        : hoverSegmentTargetPoint;

      ctx.fillStyle = hoverSegmentTargetPointIsDetectedVertex ? 'rgba(6, 95, 70, 0.88)' : 'rgba(49, 27, 146, 0.85)';
      ctx.fillRect(screenPosition.x + 15, screenPosition.y - 45, 200, 42);
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(segmentPointTitle, screenPosition.x + 20, screenPosition.y - 28);
      ctx.fillText(resolvedMessages.buildSegmentPointLabel({
        x: transformedPoint.x,
        y: transformedPoint.y
      }), screenPosition.x + 20, screenPosition.y - 12);
      ctx.restore();
    } else if (interactive && hoverConfrontationText) {
      const displayPoint = toDisplayPoint(hoverConfrontationText);
      ctx.beginPath();
      ctx.arc(displayPoint.x, displayPoint.y, 12 / nextScale, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(194, 24, 91, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#c2185b';
      ctx.lineWidth = 2 / nextScale;
      ctx.stroke();

      ctx.save();
      resetCanvasTransform();

      const screenPosition = toScreenPoint(hoverConfrontationText);
      ctx.fillStyle = 'rgba(136, 14, 79, 0.88)';
      ctx.fillRect(screenPosition.x + 15, screenPosition.y - 45, 260, 42);
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(resolvedMessages.confrontationTextTitle, screenPosition.x + 20, screenPosition.y - 28);
      ctx.fillText(hoverConfrontationText.text.slice(0, 34), screenPosition.x + 20, screenPosition.y - 12);
      ctx.restore();
    } else if (showHoverCoordinates && hoverReferencePoint) {
      const debugScreenPosition = toScreenPoint(hoverReferencePoint);
      const displayPoint = toDisplayPoint(hoverReferencePoint);
      ctx.beginPath();
      ctx.arc(displayPoint.x, displayPoint.y, 12 / nextScale, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2 / nextScale;
      ctx.stroke();

      ctx.save();
      resetCanvasTransform();

      const screenPosition = debugScreenPosition;
      ctx.fillStyle = 'rgba(6, 78, 59, 0.94)';
      ctx.fillRect(screenPosition.x + 15, screenPosition.y - 85, 310, 82);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(hoverReferencePoint.label, screenPosition.x + 20, screenPosition.y - 66);
      ctx.font = '12px Arial';
      ctx.fillText(resolvedMessages.buildGeoreferenceLabel({
        georeferencedX: hoverReferencePoint.georeferencedX,
        georeferencedY: hoverReferencePoint.georeferencedY
      }), screenPosition.x + 20, screenPosition.y - 48);
      ctx.fillText(resolvedMessages.buildOriginalPointLabel({
        originalX: hoverReferencePoint.originalX,
        originalY: hoverReferencePoint.originalY
      }), screenPosition.x + 20, screenPosition.y - 30);
      ctx.fillText(resolvedMessages.referenceSourceLabel, screenPosition.x + 20, screenPosition.y - 12);
      ctx.restore();
    } else if ((showHoverCoordinates || manualPolygon.length > 0) && hoverPoint) {
      const displayPoint = toDisplayPoint(hoverPoint);
      const hoverPointFill = hoverPointIsDetectedVertex ? 'rgba(34, 197, 94, 0.78)' : 'rgba(255, 193, 7, 0.8)';
      const hoverPointStroke = hoverPointIsDetectedVertex ? '#16a34a' : '#ffc107';
      const hoverPointTitle = (manualPolygon.length > 0 || hoverPolygon)
        ? (hoverPointIsDetectedVertex ? 'Guia do lote' : 'Guia do contorno')
        : (hoverPointIsDetectedVertex ? 'Vertice detectado' : 'Cursor');
      ctx.beginPath();
      ctx.arc(displayPoint.x, displayPoint.y, 10 / nextScale, 0, 2 * Math.PI);
      ctx.fillStyle = hoverPointFill;
      ctx.fill();
      ctx.strokeStyle = hoverPointStroke;
      ctx.lineWidth = 2 / nextScale;
      ctx.stroke();

      ctx.save();
      resetCanvasTransform();

      const transformedPoint = georeferencingTransform
        ? applyViewerTransform(hoverPoint, georeferencingTransform)
        : hoverPoint;
      const screenPosition = toScreenPoint(hoverPoint);
      const tooltipLines = georeferencingTransform
        ? [
            resolvedMessages.buildGeoreferenceLabel({
              georeferencedX: transformedPoint.x,
              georeferencedY: transformedPoint.y
            }),
            resolvedMessages.buildOriginalPointLabel({
              originalX: hoverPoint.x,
              originalY: hoverPoint.y
            })
          ]
        : (() => {
            const eastNorthLabel = resolvedMessages.buildHoverEastNorthLabel({
              x: hoverPoint.x,
              y: hoverPoint.y
            });
            const [line1, line2] = eastNorthLabel.includes(' | ') ? eastNorthLabel.split(' | ') : [eastNorthLabel, ''];
            return line2 ? [line1, line2] : [line1];
          })();

      const tooltipPaddingX = 20;
      const tooltipPaddingY = 14;
      const tooltipLineHeight = 18;
      const tooltipX = screenPosition.x + 15;
      const tooltipBottomY = screenPosition.y - 18;

      ctx.font = '12px Arial';
      ctx.textAlign = 'left';

      const tooltipWidth = Math.max(
        96,
        ctx.measureText(hoverPointTitle).width + (tooltipPaddingX * 2),
        ...tooltipLines.map((line) => ctx.measureText(line).width + (tooltipPaddingX * 2))
      );
      const tooltipHeight = Math.max(34, (tooltipPaddingY * 2) + (tooltipLineHeight * (tooltipLines.length + 1)));

      ctx.fillStyle = hoverPointIsDetectedVertex ? 'rgba(20, 83, 45, 0.9)' : 'rgba(71, 85, 105, 0.82)';
      ctx.fillRect(tooltipX, tooltipBottomY - tooltipHeight, tooltipWidth, tooltipHeight);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(
        hoverPointTitle,
        tooltipX + tooltipPaddingX,
        tooltipBottomY - tooltipHeight + tooltipPaddingY + 4
      );
      ctx.font = '12px Arial';
      tooltipLines.forEach((line, index) => {
        ctx.fillText(
          line,
          tooltipX + tooltipPaddingX,
          tooltipBottomY - tooltipHeight + tooltipPaddingY + 4 + (tooltipLineHeight * (index + 1))
        );
      });
      ctx.restore();
    }

    if (shouldRenderDetailedSelection && selectedEntityType) {
      const vertexMarkerRadius = 4.2 / nextScale;
      const emphasisMarkerRadius = 5.2 / nextScale;

      ctx.save();

      if (selectedVertexMarkers.length > 0) {
        selectedVertexMarkers.forEach((point) => {
          ctx.beginPath();
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#1d4ed8';
          ctx.lineWidth = 1.7 / nextScale;
          ctx.arc(point.x, point.y, vertexMarkerRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }

      if (selectedMidpointMarker) {
        const midpointMarker = selectedMidpointMarker;
        ctx.beginPath();
        ctx.fillStyle = '#1d4ed8';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / nextScale;
        ctx.arc(midpointMarker.x, midpointMarker.y, emphasisMarkerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (selectedCircleOrientation) {
        const { center, radius, rotationDegrees } = selectedCircleOrientation;
        const angleRadians = (rotationDegrees * Math.PI) / 180;
        const edgePoint = {
          x: center.x + Math.cos(angleRadians) * radius,
          y: center.y + Math.sin(angleRadians) * radius
        };
        const edgeMarkerRadius = 3.8 / nextScale;

        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(edgePoint.x, edgePoint.y);
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 1.5 / nextScale;
        ctx.setLineDash([6 / nextScale, 4 / nextScale]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.fillStyle = '#bfdbfe';
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 1.5 / nextScale;
        ctx.arc(edgePoint.x, edgePoint.y, edgeMarkerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (selectedTextAnchor) {
        const textAnchor = selectedTextAnchor;
        const anchorSize = 6 / nextScale;
        const crosshairSize = 11 / nextScale;

        ctx.beginPath();
        ctx.moveTo(textAnchor.x, textAnchor.y - crosshairSize);
        ctx.lineTo(textAnchor.x, textAnchor.y + crosshairSize);
        ctx.moveTo(textAnchor.x - crosshairSize, textAnchor.y);
        ctx.lineTo(textAnchor.x + crosshairSize, textAnchor.y);
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1.5 / nextScale;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(textAnchor.x, textAnchor.y - anchorSize);
        ctx.lineTo(textAnchor.x + anchorSize, textAnchor.y);
        ctx.lineTo(textAnchor.x, textAnchor.y + anchorSize);
        ctx.lineTo(textAnchor.x - anchorSize, textAnchor.y);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1.7 / nextScale;
        ctx.fill();
        ctx.stroke();
      }

      if (
        selectedGenericCenter
        && !selectedTextAnchor
        && !selectedMidpointMarker
        && selectedVertexMarkers.length === 0
      ) {
        const genericCenter = selectedGenericCenter;
        const centerMarkerRadius = 4.8 / nextScale;
        const centerMarkerSize = 10 / nextScale;
        ctx.beginPath();
        ctx.moveTo(genericCenter.x, genericCenter.y - centerMarkerSize);
        ctx.lineTo(genericCenter.x, genericCenter.y + centerMarkerSize);
        ctx.moveTo(genericCenter.x - centerMarkerSize, genericCenter.y);
        ctx.lineTo(genericCenter.x + centerMarkerSize, genericCenter.y);
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 1.5 / nextScale;
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 1.7 / nextScale;
        ctx.arc(genericCenter.x, genericCenter.y, centerMarkerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    if (selectedEntityBounds && selectedEntityIds.length > 0) {
      const selectionBounds = selectedEntityBounds;
      const frame = getSelectionFrame(selectionBounds, nextScale);
      const handleInfos = getSelectionHandleInfos(selectionBounds, nextScale);
      const rotationHandle = handleInfos.find((handle) => handle.kind === 'rotate') || null;
      const resizeHandles = handleInfos.filter((handle) => handle.kind !== 'rotate');
      const isRotationHandleActive = activeSelectionHandle === 'rotate';
      const isRotationHoverMode = hoverSelectionMode === 'rotate';
      const showRotationPivot = isRotationHandleActive || isRotationHoverMode;
      const frameStrokeColor = activeSelectionHandle
        ? '#1d4ed8'
        : (isRotationHoverMode ? '#c2410c' : '#2563eb');
      const frameLineWidth = (activeSelectionHandle ? 1.65 : (isRotationHoverMode ? 1.5 : 1.28)) / nextScale;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([8 / nextScale, 5 / nextScale]);
      ctx.strokeStyle = frameStrokeColor;
      ctx.lineWidth = frameLineWidth;
      ctx.strokeRect(frame.rectLeft, frame.rectTop, frame.rectWidth, frame.rectHeight);
      ctx.setLineDash([]);

      if (rotationHandle) {
        const showRotationHover = !isRotationHandleActive && isRotationHoverMode;
        const guideStrokeColor = isRotationHandleActive ? '#1d4ed8' : (showRotationHover ? '#c2410c' : '#2563eb');

        ctx.beginPath();
        ctx.moveTo(frame.center.x, frame.center.y);
        ctx.lineTo(rotationHandle.point.x, rotationHandle.point.y);
        ctx.setLineDash(isRotationHandleActive ? [6 / nextScale, 4 / nextScale] : []);
        ctx.strokeStyle = guideStrokeColor;
        ctx.lineWidth = (isRotationHandleActive ? 1.65 : (showRotationHover ? 1.4 : 1.12)) / nextScale;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.fillStyle = isRotationHandleActive ? 'rgba(59, 130, 246, 0.96)' : (showRotationHover ? 'rgba(254, 215, 170, 0.96)' : 'rgba(59, 130, 246, 0.88)');
        ctx.arc(rotationHandle.point.x, rotationHandle.point.y, frame.handleRadius * (isRotationHandleActive ? 1.2 : (showRotationHover ? 1.08 : 0.95)), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isRotationHandleActive ? '#ffffff' : (showRotationHover ? '#c2410c' : '#ffffff');
        ctx.lineWidth = (isRotationHandleActive ? 1.65 : (showRotationHover ? 1.45 : 1.25)) / nextScale;
        ctx.stroke();
      }

      if (showRotationPivot) {
        const pivotColor = isRotationHandleActive ? '#1d4ed8' : '#c2410c';
        const outerRadius = frame.handleRadius * 1.12;
        const innerRadius = frame.handleRadius * 0.3;
        const crossHalfSize = 6 / nextScale;

        ctx.beginPath();
        ctx.setLineDash([5 / nextScale, 4 / nextScale]);
        ctx.moveTo(visibleMinX, frame.center.y);
        ctx.lineTo(visibleMaxX, frame.center.y);
        ctx.moveTo(frame.center.x, visibleMinY);
        ctx.lineTo(frame.center.x, visibleMaxY);
        ctx.strokeStyle = activeTransformOrthogonal
          ? 'rgba(22, 163, 74, 0.72)'
          : (isRotationHandleActive ? 'rgba(29, 78, 216, 0.48)' : 'rgba(194, 65, 12, 0.38)');
        ctx.lineWidth = (activeTransformOrthogonal ? 1.12 : 0.9) / nextScale;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(frame.center.x, frame.center.y, outerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = pivotColor;
        ctx.lineWidth = 1.5 / nextScale;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(frame.center.x - crossHalfSize, frame.center.y);
        ctx.lineTo(frame.center.x + crossHalfSize, frame.center.y);
        ctx.moveTo(frame.center.x, frame.center.y - crossHalfSize);
        ctx.lineTo(frame.center.x, frame.center.y + crossHalfSize);
        ctx.strokeStyle = pivotColor;
        ctx.lineWidth = 1.25 / nextScale;
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = pivotColor;
        ctx.arc(frame.center.x, frame.center.y, innerRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      resizeHandles.forEach((handle) => {
        const isActiveHandle = activeSelectionHandle === handle.kind;
        const isHoveredHandle = hoverSelectionHandle === handle.kind;
        const isRotatePreviewHandle = isHoveredHandle && hoverSelectionMode === 'rotate';
        const isScalePreviewHandle = isHoveredHandle && hoverSelectionMode === 'scale';
        ctx.beginPath();
        ctx.fillStyle = isActiveHandle
          ? 'rgba(191, 219, 254, 0.96)'
          : (isRotatePreviewHandle ? 'rgba(254, 215, 170, 0.96)' : (isScalePreviewHandle ? 'rgba(219, 234, 254, 0.96)' : 'rgba(255, 255, 255, 0.94)'));
        ctx.strokeStyle = isActiveHandle
          ? '#1d4ed8'
          : (isRotatePreviewHandle ? '#c2410c' : '#2563eb');
        ctx.lineWidth = (isActiveHandle ? 1.95 : ((isRotatePreviewHandle || isScalePreviewHandle) ? 1.75 : 1.45)) / nextScale;
        ctx.arc(
          handle.point.x,
          handle.point.y,
          frame.handleRadius * (isActiveHandle ? 1.18 : ((isRotatePreviewHandle || isScalePreviewHandle) ? 1.12 : 1)),
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }

    ctx.restore();

    if (entitySelectionBox) {
      const left = Math.min(entitySelectionBox.startX, entitySelectionBox.currentX);
      const top = Math.min(entitySelectionBox.startY, entitySelectionBox.currentY);
      const width = Math.abs(entitySelectionBox.currentX - entitySelectionBox.startX);
      const height = Math.abs(entitySelectionBox.currentY - entitySelectionBox.startY);

      ctx.save();
      resetCanvasTransform();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(left, top, width, height);
      ctx.strokeRect(left, top, width, height);
      ctx.restore();
    }

    if (zoomSelectionBox) {
      const left = Math.min(zoomSelectionBox.startX, zoomSelectionBox.currentX);
      const top = Math.min(zoomSelectionBox.startY, zoomSelectionBox.currentY);
      const width = Math.abs(zoomSelectionBox.currentX - zoomSelectionBox.startX);
      const height = Math.abs(zoomSelectionBox.currentY - zoomSelectionBox.startY);

      ctx.save();
      resetCanvasTransform();
      ctx.fillStyle = 'rgba(71, 85, 105, 0.16)';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(left, top, width, height);
      ctx.strokeRect(left, top, width, height);
      ctx.restore();
    }

    ctx.fillStyle = '#6c757d';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(resolvedMessages.buildEntityStatsLabel({
      entityCount: dxfData.entities.length,
      drawnCount: linesDrawn
    }), 10, 20);
    ctx.fillText(resolvedMessages.buildScaleLabel({
      scale: nextScale,
      zoom
    }), 10, 35);
    if (drawingBounds) {
      ctx.fillText(resolvedMessages.buildSizeLabel({
        width: drawingBounds.drawingWidth,
        height: drawingBounds.drawingHeight
      }), 10, 50);
    }
    if (!hasDrawableEntities) {
      ctx.fillStyle = '#6c757d';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(resolvedMessages.emptyCanvasLabel, viewportWidth / 2, viewportHeight / 2 + 50);
    }
    if (georeferencingTransform) {
      ctx.fillText(resolvedMessages.buildGeoreferencedStatusLabel({
        matchedPoints: georeferencingTransform.matchedPoints,
        averageResidualMeters: georeferencingTransform.averageResidualMeters
      }), 10, 65);
    }
    if (drawingPreviewLabel) {
      const previewY = georeferencingTransform ? 82 : 65;
      ctx.save();
      resetCanvasTransform();
      ctx.font = '600 12px Arial';
      const previewMetrics = ctx.measureText(drawingPreviewLabel);
      const previewBoxWidth = previewMetrics.width + 18;
      const previewBoxHeight = 24;
      ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(8, previewY - 17, previewBoxWidth, previewBoxHeight, 6);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#9a3412';
      ctx.font = '600 12px Arial';
      ctx.fillText(drawingPreviewLabel, 17, previewY);
      ctx.restore();
    }
    if (activeTransformLabel) {
      ctx.textAlign = 'left';
      ctx.fillStyle = activeTransformOrthogonal
        ? '#16a34a'
        : (activeTransformSnap ? '#c2410c' : (activeTransformProportional ? '#7c3aed' : '#1d4ed8'));
      ctx.font = 'bold 13px Arial';
      ctx.fillText(activeTransformLabel, 10, georeferencingTransform ? 100 : (drawingPreviewLabel ? 83 : 65));
    }
    if (activeTransformLabel && activeTransformPoint) {
      const cursorPoint = toScreenPoint(activeTransformPoint);
      const paddingX = 8;
      const labelX = Math.min(Math.max(cursorPoint.x + 14, 8), viewportWidth - 8);
      const labelY = Math.min(Math.max(cursorPoint.y - 16, 24), viewportHeight - 8);
      const labelText = activeTransformLabel.replace(/^Transformacao:\s*/i, '');

      ctx.save();
      resetCanvasTransform();
      ctx.font = 'bold 12px Arial';
      const metrics = ctx.measureText(labelText);
      const textWidth = metrics.width;
      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = 26;
      const drawX = Math.min(labelX, viewportWidth - boxWidth - 8);
      const drawY = Math.max(labelY - boxHeight, 8);

      ctx.fillStyle = activeTransformOrthogonal
        ? 'rgba(20, 83, 45, 0.92)'
        : (activeTransformSnap
          ? 'rgba(124, 45, 18, 0.92)'
          : (activeTransformProportional ? 'rgba(88, 28, 135, 0.92)' : 'rgba(15, 23, 42, 0.9)'));
      ctx.strokeStyle = activeTransformOrthogonal
        ? '#86efac'
        : (activeTransformSnap ? '#fdba74' : (activeTransformProportional ? '#c4b5fd' : '#1d4ed8'));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, boxWidth, boxHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = activeTransformOrthogonal
        ? '#f0fdf4'
        : (activeTransformSnap ? '#fff7ed' : (activeTransformProportional ? '#f5f3ff' : '#eff6ff'));
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, drawX + paddingX, drawY + boxHeight / 2);
      ctx.restore();
    }

    if (typeof window !== 'undefined' && onInitialCanvasRendered) {
      window.requestAnimationFrame(() => {
        onInitialCanvasRendered();
      });
    }
  }, [
    activeConfrontationTextId,
    activeCorrectiveTool,
    activeSelectionHandle,
    activeTransformLabel,
    activeTransformOrthogonal,
    activeTransformPoint,
    activeTransformProportional,
    activeTransformSnap,
    activeTransformSnap,
    activeTransformSnap,
    analyzeSegmentSet,
    canvasRef,
    correctiveFocusLotNumber,
    correctiveFocusPolygon,
    correctiveLotInspectionEntries,
    correctiveTargetPoint,
    detectedPolygons,
    detectedPolygonEntries,
    drawingBounds,
    drawingPreviewLabel,
    drawingPreviewText,
    copyEntityPreviewTransform,
    selectedEntityPreviewTransform,
    boundsData,
    dxfData,
    entitySelectionBox,
    zoomSelectionBox,
    focusedCorrectiveLotInspection,
    georeferencingTransform,
    hoverConfrontationText,
    hoverSelectionHandle,
    hoverSelectionMode,
    hoverPoint,
    hoverPointIsDetectedVertex,
    hoverSelectionMode,
    hoverPoint,
    hoverPolygon,
    hoverReferencePoint,
    hoverSegmentTargetPoint,
    hoverSegmentTargetPointIsDetectedVertex,
    gridMajorStep,
    gridSnapSize,
    interactive,
    minimumWorkspaceSize,
    manualBridgeSegments,
    manualPolygon,
    partialScopePolygons,
    overlayPoints,
    overlaySegments,
    pan,
    pendingConfrontationSegmentPoints,
    recentlyCorrectedLotNumber,
    recentlyCorrectedPolygon,
    recentlyCorrectedPolygonCentroid,
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
    zoom
  ]);
};
