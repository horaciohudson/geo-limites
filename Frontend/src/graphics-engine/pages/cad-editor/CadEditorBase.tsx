import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CadEditorHost } from '@/graphics-engine/pages/cad-editor/cadEditorHost';
import {
  normalizeProcessingContextStatus,
  type ProcessingContextStatusDTO
} from '@/utils/processingContextStatus';

import {
  buildPolylineEntity,
  buildTextEntity,
  getTextHorizontalAlignCode,
  getTextVerticalAlignCode
} from '@/graphics-engine/components/viewer-dxf/cadDrawingUtils';
import {
  buildConfirmedSelections,
  extractLotNumberFromTexts,
  summarizePolygonTexts
} from '@/graphics-engine/components/viewer-dxf/lotSelectionUtils';
import type {
  ConfirmedConfrontationText,
  ConfirmedLotSelection,
  ConfirmedReferencePoint,
  DrawingTextAlignment,
  DrawingTextVerticalAlignment,
  EmbeddedCadToolMode,
  ViewerOverlayPoint,
  ViewerOverlaySegment,
  SegmentConfrontationAnnotation,
  SelectedConfrontationText,
  ViewerViewportCommand,
  ViewerSelectedEntityInfo
} from '@/graphics-engine/components/viewer-dxf/types';
import {
  type CadGuide,
  type CadRulerInteraction,
  getCadEntitySegments,
  getCadGeometryVertices,
} from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';
import { analyzeGeoLimitesLotDetection } from '@/graphics-engine/adapters/geolimites/useGeoLimitesLotDetection';
import {
  DEFAULT_LEFT_PANEL_WIDTH,
  DEFAULT_RULER_ORIGIN,
  DEFAULT_RIGHT_PANEL_WIDTH,
  DRAWING_TOOL_IDS,
  formatBytes,
  formatPoint,
  MAX_LEFT_PANEL_WIDTH,
  MAX_RIGHT_PANEL_WIDTH,
  MIN_LEFT_PANEL_WIDTH,
  MIN_RIGHT_PANEL_WIDTH,
  DEFAULT_VIEWPORT_STATE,
  type CadDockSection,
  type CadEditorSessionPreferences,
  type CadEditorSettings,
  type CadEntityContextMenuState,
  type CadGuideContextMenuState,
  type CadMeasurementUnit,
  type CadMenuId,
  type CadOpenedDocument,
  type CadRightPanelId,
  type CadViewportState,
  type TextToolSessionState
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import { buildSelectedEntityInfo, isTextLikeEntity } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import { CadEditorContextMenus } from '@/graphics-engine/pages/cad-editor/CadEditorContextMenus';
import { CadEditorLayerDialog } from '@/graphics-engine/pages/cad-editor/CadEditorLayerDialog';
import { CadEditorTextDialog } from '@/graphics-engine/pages/cad-editor/CadEditorTextDialog';
import { CadEditorShortcutsDialog } from '@/graphics-engine/pages/cad-editor/CadEditorShortcutsDialog';
import { CadEditorTechnicalSummaryDialog } from '@/graphics-engine/pages/cad-editor/CadEditorTechnicalSummaryDialog';
import { CadEditorStatusBar } from '@/graphics-engine/pages/cad-editor/CadEditorStatusBar';
import { CadEditorTopBar } from '@/graphics-engine/pages/cad-editor/CadEditorTopBar';
import { buildUpdatedDxfData } from '@/graphics-engine/pages/cad-editor/cadEditorEntityUtils';
import { clearCadEditorSelection, commitCadEditorHistoryEntry, syncCadEditorSelection } from '@/graphics-engine/pages/cad-editor/cadEditorHistoryUtils';
import { useCadEditorRightSidebarViewModel } from '@/graphics-engine/pages/cad-editor/useCadEditorRightSidebarViewModel';
import { useCadEditorTextToolViewModel } from '@/graphics-engine/pages/cad-editor/useCadEditorTextToolViewModel';
import { useCadEditorWorkspaceView } from '@/graphics-engine/pages/cad-editor/useCadEditorWorkspaceView';
import { buildArcSamplePoints, buildPolylineSamplePoints } from '@/graphics-engine/components/viewer-dxf/dxfGeometryUtils';
import { type DXFData, type DXFEntity } from '@/graphics-engine/shared/dxf';
import { calculateDistance, type Point2D } from '@/graphics-engine/shared/geometry';
import type { CorrectiveIssueView } from '@/utils/viewerCorrective';
import type { ManualReviewLotSelectionPayload } from '@/graphics-engine/shared/viewer-corrective';
import {
  getParallelismScore,
  getPolygonCentroid,
  getPolygonEdges,
  getProjectedOverlapRatio,
  isPointInPolygon,
  pointToSegmentDistance,
  segmentToSegmentDistance
} from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import { sendSelectionDebug } from '@/utils/memorialDocument';
const CadEditorLeftSidebar = React.lazy(() =>
  import('@/graphics-engine/pages/cad-editor/CadEditorLeftSidebar').then((module) => ({ default: module.CadEditorLeftSidebar }))
);
const CadEditorWorkspaceCenter = React.lazy(() =>
  import('@/graphics-engine/pages/cad-editor/CadEditorWorkspaceCenter').then((module) => ({ default: module.CadEditorWorkspaceCenter }))
);
const CadEditorRightSidebar = React.lazy(() =>
  import('@/graphics-engine/pages/cad-editor/CadEditorRightSidebar').then((module) => ({ default: module.CadEditorRightSidebar }))
);
const CadEditorSystemSettingsPage = React.lazy(() =>
  import('@/graphics-engine/pages/cad-editor/CadEditorSystemSettingsPage').then((module) => ({ default: module.CadEditorSystemSettingsPage }))
);

interface CadEditorBaseProps {
  host: CadEditorHost;
}

type TechnicalSummaryScopeMode = 'full' | 'mixed' | 'partial' | 'exclude';

const BASE_AREA_REFERENCE_LABEL_PREFIX = 'AREA_TOTAL_P';
const PRIMARY_BOUNDARY_POINT_TOLERANCE = 0.001;
// A captura do viewer pode devolver extremos vizinhos com pequenas variacoes
// mesmo quando o usuario fecha a perimetral corretamente com snap.
const PRIMARY_BOUNDARY_GRAPH_TOLERANCE = 0.5;
const PRIMARY_BOUNDARY_COLLINEAR_EPSILON = 0.001;

const buildBoundaryReferencePoints = (
  vertices: Array<{ x: number; y: number }>,
  labelPrefix: string
): ConfirmedReferencePoint[] => (
  vertices.map((vertex, index) => ({
    label: `${labelPrefix}${String(index + 1).padStart(2, '0')}`,
    x: vertex.x,
    y: vertex.y,
    georeferencedX: vertex.x,
    georeferencedY: vertex.y
  }))
);

const isReservedBoundaryReferencePoint = (label: string): boolean => (
  label.startsWith(BASE_AREA_REFERENCE_LABEL_PREFIX)
);

const arePointsEquivalent = (
  left: Point2D,
  right: Point2D,
  tolerance = PRIMARY_BOUNDARY_POINT_TOLERANCE
): boolean => calculateDistance(left, right) <= tolerance;

const buildBoundaryPointKey = (point: Point2D): string => `${point.x.toFixed(3)}|${point.y.toFixed(3)}`;

const isBoundaryCollinearJoin = (
  previousPoint: Point2D,
  currentPoint: Point2D,
  nextPoint: Point2D
): boolean => {
  const ax = previousPoint.x - currentPoint.x;
  const ay = previousPoint.y - currentPoint.y;
  const bx = nextPoint.x - currentPoint.x;
  const by = nextPoint.y - currentPoint.y;
  const lengthA = Math.hypot(ax, ay);
  const lengthB = Math.hypot(bx, by);

  if (lengthA <= PRIMARY_BOUNDARY_POINT_TOLERANCE || lengthB <= PRIMARY_BOUNDARY_POINT_TOLERANCE) {
    return true;
  }

  const cross = Math.abs((ax * by) - (ay * bx));
  return cross <= PRIMARY_BOUNDARY_COLLINEAR_EPSILON * lengthA * lengthB;
};

const simplifyBoundaryVertices = (vertices: Point2D[]): Point2D[] => {
  if (vertices.length < 4) {
    return vertices;
  }

  let nextVertices = vertices.slice();
  let changed = true;
  while (changed && nextVertices.length >= 4) {
    changed = false;
    const simplified = nextVertices.filter((point, index) => {
      const previousPoint = nextVertices[(index - 1 + nextVertices.length) % nextVertices.length];
      const nextPoint = nextVertices[(index + 1) % nextVertices.length];

      if (
        arePointsEquivalent(previousPoint, point, PRIMARY_BOUNDARY_GRAPH_TOLERANCE)
        || arePointsEquivalent(point, nextPoint, PRIMARY_BOUNDARY_GRAPH_TOLERANCE)
      ) {
        changed = true;
        return false;
      }

      if (isBoundaryCollinearJoin(previousPoint, point, nextPoint)) {
        changed = true;
        return false;
      }

      return true;
    });

    if (simplified.length === nextVertices.length) {
      break;
    }

    nextVertices = simplified;
  }

  return nextVertices;
};

const buildBoundaryVerticesFromAnnotations = (
  annotations: SegmentConfrontationAnnotation[]
): { vertices: Point2D[]; error: string | null } => {
  const clusteredPoints: Point2D[] = [];
  const normalizeBoundaryPoint = (point: Point2D): Point2D => {
    const existingPoint = clusteredPoints.find((candidate) =>
      arePointsEquivalent(candidate, point, PRIMARY_BOUNDARY_GRAPH_TOLERANCE)
    );
    if (existingPoint) {
      return existingPoint;
    }
    clusteredPoints.push(point);
    return point;
  };

  const usableSegments = annotations
    .map((annotation) => ({
      startPoint: normalizeBoundaryPoint(annotation.startPoint),
      endPoint: normalizeBoundaryPoint(annotation.endPoint)
    }))
    .filter((segment) => calculateDistance(segment.startPoint, segment.endPoint) > PRIMARY_BOUNDARY_POINT_TOLERANCE);

  const uniqueSegments = Array.from(
    usableSegments.reduce((segmentsByKey, segment) => {
      const startKey = buildBoundaryPointKey(segment.startPoint);
      const endKey = buildBoundaryPointKey(segment.endPoint);
      const normalizedEdgeKey = [startKey, endKey].sort().join('::');
      if (!segmentsByKey.has(normalizedEdgeKey)) {
        segmentsByKey.set(normalizedEdgeKey, segment);
      }
      return segmentsByKey;
    }, new Map<string, { startPoint: Point2D; endPoint: Point2D }>())
      .values()
  );

  if (uniqueSegments.length < 3) {
    return {
      vertices: [],
      error: 'Selecione pelo menos 3 trechos com Ctrl + Shift + Clique antes de salvar as Primarias.'
    };
  }

  type BoundaryEdge = {
    id: string;
    startKey: string;
    endKey: string;
    startPoint: Point2D;
    endPoint: Point2D;
  };

  const pointByKey = new Map<string, Point2D>();
  uniqueSegments.forEach((segment) => {
    pointByKey.set(buildBoundaryPointKey(segment.startPoint), segment.startPoint);
    pointByKey.set(buildBoundaryPointKey(segment.endPoint), segment.endPoint);
  });

  const buildBoundaryEdge = (startPoint: Point2D, endPoint: Point2D): BoundaryEdge => {
    const startKey = buildBoundaryPointKey(startPoint);
    const endKey = buildBoundaryPointKey(endPoint);
    const edgeId = [startKey, endKey].sort().join('::');
    pointByKey.set(startKey, startPoint);
    pointByKey.set(endKey, endPoint);
    return {
      id: edgeId,
      startKey,
      endKey,
      startPoint,
      endPoint
    };
  };

  const buildAdjacency = (edges: BoundaryEdge[]): Map<string, string[]> => {
    const adjacency = new Map<string, string[]>();
    edges.forEach((edge) => {
      adjacency.set(edge.startKey, [...(adjacency.get(edge.startKey) || []), edge.id]);
      adjacency.set(edge.endKey, [...(adjacency.get(edge.endKey) || []), edge.id]);
    });
    return adjacency;
  };

  const getOppositeNodeKey = (edge: BoundaryEdge, nodeKey: string): string => (
    edge.startKey === nodeKey ? edge.endKey : edge.startKey
  );

  let workingEdges = uniqueSegments.map((segment) => buildBoundaryEdge(segment.startPoint, segment.endPoint));
  let graphChanged = true;
  while (graphChanged) {
    graphChanged = false;
    const edgeById = new Map(workingEdges.map((edge) => [edge.id, edge]));
    const adjacency = buildAdjacency(workingEdges);

    for (const [nodeKey, edgeIds] of adjacency.entries()) {
      if (edgeIds.length !== 2) {
        continue;
      }

      const firstEdge = edgeById.get(edgeIds[0]);
      const secondEdge = edgeById.get(edgeIds[1]);
      const nodePoint = pointByKey.get(nodeKey);
      if (!firstEdge || !secondEdge || !nodePoint) {
        continue;
      }

      const previousNodeKey = getOppositeNodeKey(firstEdge, nodeKey);
      const nextNodeKey = getOppositeNodeKey(secondEdge, nodeKey);
      if (previousNodeKey === nextNodeKey) {
        continue;
      }

      const previousPoint = pointByKey.get(previousNodeKey);
      const nextPoint = pointByKey.get(nextNodeKey);
      if (!previousPoint || !nextPoint) {
        continue;
      }

      if (!isBoundaryCollinearJoin(previousPoint, nodePoint, nextPoint)) {
        continue;
      }

      const mergedEdge = buildBoundaryEdge(previousPoint, nextPoint);
      workingEdges = [
        ...workingEdges.filter((edge) => edge.id !== firstEdge.id && edge.id !== secondEdge.id && edge.id !== mergedEdge.id),
        mergedEdge
      ];
      graphChanged = true;
      break;
    }
  }

  const adjacency = buildAdjacency(workingEdges);
  const hasInvalidConnectivity = Array.from(adjacency.values()).some((connectedSegments) => connectedSegments.length !== 2);
  if (hasInvalidConnectivity || adjacency.size < 3) {
    return {
      vertices: [],
      error: 'Os trechos primarios precisam formar um contorno fechado continuo antes de salvar.'
    };
  }

  const edgeById = new Map(workingEdges.map((edge) => [edge.id, edge]));
  const orderedNodeKeys = Array.from(adjacency.keys()).sort((leftKey, rightKey) => {
    const leftPoint = pointByKey.get(leftKey);
    const rightPoint = pointByKey.get(rightKey);
    if (!leftPoint || !rightPoint) {
      return leftKey.localeCompare(rightKey);
    }
    if (leftPoint.x !== rightPoint.x) {
      return leftPoint.x - rightPoint.x;
    }
    return leftPoint.y - rightPoint.y;
  });

  const startNodeKey = orderedNodeKeys[0];
  if (!startNodeKey) {
    return {
      vertices: [],
      error: 'Nao foi possivel montar a perimetral das Primarias a partir dos trechos marcados.'
    };
  }

  const visitedEdgeIds = new Set<string>();
  const traversedNodeKeys: string[] = [startNodeKey];
  let currentNodeKey = startNodeKey;
  let previousNodeKey: string | null = null;
  let guard = 0;

  while (guard <= workingEdges.length + 1) {
    guard += 1;
    const currentEdgeIds = (adjacency.get(currentNodeKey) || [])
      .filter((edgeId) => !visitedEdgeIds.has(edgeId));

    if (currentEdgeIds.length === 0) {
      break;
    }

    const nextEdgeId = currentEdgeIds.find((edgeId) => {
      if (!previousNodeKey) {
        return true;
      }
      const candidateEdge = edgeById.get(edgeId);
      if (!candidateEdge) {
        return false;
      }
      return getOppositeNodeKey(candidateEdge, currentNodeKey) !== previousNodeKey;
    }) ?? currentEdgeIds[0];

    const nextEdge = edgeById.get(nextEdgeId);
    if (!nextEdge) {
      break;
    }

    visitedEdgeIds.add(nextEdgeId);
    const nextNodeKey = getOppositeNodeKey(nextEdge, currentNodeKey);
    traversedNodeKeys.push(nextNodeKey);
    previousNodeKey = currentNodeKey;
    currentNodeKey = nextNodeKey;

    if (currentNodeKey === startNodeKey) {
      break;
    }
  }

  if (visitedEdgeIds.size !== workingEdges.length || traversedNodeKeys[traversedNodeKeys.length - 1] !== startNodeKey) {
    return {
      vertices: [],
      error: 'Os trechos primarios selecionados ainda nao fecham a perimetral do terreno.'
    };
  }

  const closedVertices = simplifyBoundaryVertices(
    traversedNodeKeys
      .slice(0, -1)
      .map((nodeKey) => pointByKey.get(nodeKey))
      .filter((point): point is Point2D => Boolean(point))
  );

  if (closedVertices.length < 3) {
    return {
      vertices: [],
      error: 'As Primarias precisam gerar pelo menos 3 vertices para compor a perimetral.'
    };
  }

  return {
    vertices: closedVertices,
    error: null
  };
};

const buildBoundaryOverlaySegments = (
  points: ConfirmedReferencePoint[],
  color: string
): ViewerOverlaySegment[] => {
  if (points.length < 2) {
    return [];
  }

  return points.map((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    return {
      start: { x: point.x, y: point.y },
      end: { x: nextPoint.x, y: nextPoint.y },
      color,
      dashed: true,
      strokeWidth: 3
    };
  });
};

const buildBoundaryOverlayPoints = (
  points: ConfirmedReferencePoint[],
  color: string,
  label: string
): ViewerOverlayPoint[] => {
  if (points.length === 0) {
    return [];
  }

  return points.map((point, index) => ({
    point: { x: point.x, y: point.y },
    color,
    radius: index === 0 ? 7 : 5,
    label: index === 0 ? label : undefined,
    labelColor: color,
    labelBorderColor: color,
    labelBackgroundColor: 'rgba(255, 255, 255, 0.96)',
    labelOffsetX: 12,
    labelOffsetY: -18
  }));
};

const buildConfirmedConfrontationTextKey = (selectedText: ConfirmedConfrontationText): string => {
  const segmentKey = selectedText.selectionMode !== 'text'
    ? `${selectedText.segmentStartPoint?.x ?? ''}|${selectedText.segmentStartPoint?.y ?? ''}|${selectedText.segmentEndPoint?.x ?? ''}|${selectedText.segmentEndPoint?.y ?? ''}`
    : '';

  return [
    selectedText.id,
    selectedText.selectionMode,
    selectedText.inferredDirection ?? '',
    selectedText.x,
    selectedText.y,
    segmentKey
  ].join('|');
};

const formatPrimaryBoundaryValidationMessage = (error: string | null | undefined): string => {
  if (!error) {
    return '';
  }

  if (error.includes('ainda nao fecham a perimetral')) {
    return 'Perimetral aberta. Feche o circuito das Primarias para liberar o salvamento.';
  }

  return error;
};

const LOT_REMOVAL_ENTITY_TOLERANCE = 0.8;
const GEOREFERENCE_LAYER_HINTS = ['georeferencia', 'georreferencia', 'georef', 'georref'];

const deduplicatePoints = (points: Point2D[]): Point2D[] => {
  const unique = new Map<string, Point2D>();
  points.forEach((point) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return;
    }
    unique.set(`${point.x.toFixed(3)}|${point.y.toFixed(3)}`, point);
  });
  return Array.from(unique.values());
};

const normalizeLayerToken = (value: string | null | undefined): string => (
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
);

const chooseReplacementGeometryLayerName = (
  geometryEntities: DXFEntity[],
  availableLayerNames: string[]
): string => {
  const preferredGeoreferenceLayerName = availableLayerNames.find((layerName) => {
    const normalizedLayerName = normalizeLayerToken(layerName);
    return GEOREFERENCE_LAYER_HINTS.some((hint) => normalizedLayerName.includes(hint));
  });

  const layerCounts = geometryEntities.reduce<Map<string, number>>((acc, entity) => {
    const layerName = String(entity.layer || '').trim();
    if (!layerName) {
      return acc;
    }
    acc.set(layerName, (acc.get(layerName) || 0) + 1);
    return acc;
  }, new Map<string, number>());

  if (preferredGeoreferenceLayerName && layerCounts.has(preferredGeoreferenceLayerName)) {
    return preferredGeoreferenceLayerName;
  }

  const mostFrequentGeometryLayerName = Array.from(layerCounts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })[0]?.[0];

  if (mostFrequentGeometryLayerName) {
    return mostFrequentGeometryLayerName;
  }

  if (preferredGeoreferenceLayerName) {
    return preferredGeoreferenceLayerName;
  }

  return availableLayerNames.find((layerName) => normalizeLayerToken(layerName) === 'geometria')
    || availableLayerNames[0]
    || '0';
};

const buildPartialReplacementEntities = (selection: ConfirmedLotSelection, layerName: string): DXFEntity[] => {
  const normalizedPolygon = deduplicatePoints(selection.polygon).filter((point) => (
    Number.isFinite(point.x) && Number.isFinite(point.y)
  ));
  if (normalizedPolygon.length < 3) {
    return [];
  }

  return [
    buildPolylineEntity(
      normalizedPolygon.map((point) => ({ x: point.x, y: point.y })),
      layerName,
      true
    )
  ];
};

const getEntityRepresentativePoints = (entity: DXFEntity): Point2D[] => {
  const props = entity.properties;
  const collectedPoints: Point2D[] = [];
  const pushPoint = (x: unknown, y: unknown) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    collectedPoints.push({ x: Number(x), y: Number(y) });
  };

  pushPoint(props.x, props.y);
  pushPoint(props.x1, props.y1);
  pushPoint(props.x2, props.y2);
  pushPoint(props.alignmentX, props.alignmentY);
  pushPoint(props.centerX, props.centerY);

  if (Array.isArray(props.vertices)) {
    props.vertices.forEach((vertex) => {
      pushPoint(vertex?.x, vertex?.y);
    });
  }

  const uniquePoints = deduplicatePoints(collectedPoints);
  if (uniquePoints.length >= 3) {
    return [...uniquePoints, getPolygonCentroid(uniquePoints)];
  }

  if (uniquePoints.length === 2) {
    return [
      ...uniquePoints,
      {
        x: (uniquePoints[0].x + uniquePoints[1].x) / 2,
        y: (uniquePoints[0].y + uniquePoints[1].y) / 2
      }
    ];
  }

  return uniquePoints;
};

const buildSegmentsFromPoints = (
  points: Point2D[],
  closed: boolean = false
): Array<{ start: Point2D; end: Point2D }> => {
  if (points.length < 2) {
    return [];
  }

  const segments: Array<{ start: Point2D; end: Point2D }> = [];
  const segmentCount = closed ? points.length : points.length - 1;

  for (let index = 0; index < segmentCount; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    if (!start || !end) {
      continue;
    }
    if (calculateDistance(start, end) <= PRIMARY_BOUNDARY_POINT_TOLERANCE) {
      continue;
    }
    segments.push({ start, end });
  }

  return segments;
};

const getEntityGeometrySegments = (entity: DXFEntity): Array<{ start: Point2D; end: Point2D }> => {
  const props = entity.properties;

  if (
    entity.type === 'LINE'
    && typeof props.x1 === 'number'
    && typeof props.y1 === 'number'
    && typeof props.x2 === 'number'
    && typeof props.y2 === 'number'
  ) {
    return [{ start: { x: props.x1, y: props.y1 }, end: { x: props.x2, y: props.y2 } }];
  }

  if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && Array.isArray(props.vertices) && props.vertices.length >= 2) {
    return buildSegmentsFromPoints(buildPolylineSamplePoints(props.vertices, Boolean(props.closed)), Boolean(props.closed));
  }

  if (
    entity.type === 'ARC'
    && typeof props.centerX === 'number'
    && typeof props.centerY === 'number'
    && typeof props.radius === 'number'
    && typeof props.startAngle === 'number'
    && typeof props.endAngle === 'number'
  ) {
    return buildSegmentsFromPoints(
      buildArcSamplePoints(
        { x: props.centerX, y: props.centerY },
        props.radius,
        props.startAngle,
        props.endAngle
      ),
      false
    );
  }

  return [];
};

const doesSegmentMatchPolygonBoundary = (
  segment: { start: Point2D; end: Point2D },
  polygon: Point2D[]
): boolean => {
  const boundaryTolerance = LOT_REMOVAL_ENTITY_TOLERANCE * 0.75;

  return getPolygonEdges(polygon).some((edge) => {
    const distance = segmentToSegmentDistance(segment.start, segment.end, edge.start, edge.end);
    if (distance > boundaryTolerance) {
      return false;
    }

    const overlapRatio = getProjectedOverlapRatio(segment.start, segment.end, edge.start, edge.end);
    const parallelism = getParallelismScore(segment.start, segment.end, edge.start, edge.end);

    return parallelism >= 0.97 && overlapRatio >= 0.6;
  });
};

const shouldPreserveEntityForRemainingLots = (
  entity: DXFEntity,
  remainingLotPolygons: Point2D[][]
): boolean => {
  if (remainingLotPolygons.length === 0 || isTextLikeEntity(entity)) {
    return false;
  }

  const geometrySegments = getEntityGeometrySegments(entity);
  if (geometrySegments.length === 0) {
    return false;
  }

  return remainingLotPolygons.some((polygon) => (
    geometrySegments.some((segment) => doesSegmentMatchPolygonBoundary(segment, polygon))
  ));
};

const isPointInsideOrNearPolygon = (
  point: Point2D,
  polygon: Point2D[],
  tolerance: number = LOT_REMOVAL_ENTITY_TOLERANCE
): boolean => (
  isPointInPolygon(point, polygon)
  || getPolygonEdges(polygon).some((edge) => pointToSegmentDistance(point, edge.start, edge.end) <= tolerance)
);

const doesEntityIntersectSelectedLots = (
  entity: DXFEntity,
  polygons: Point2D[][]
): boolean => {
  if (polygons.length === 0) {
    return false;
  }

  const representativePoints = getEntityRepresentativePoints(entity);
  if (representativePoints.length === 0) {
    return false;
  }

  return polygons.some((polygon) => {
    const insideFlags = representativePoints.map((point) => isPointInsideOrNearPolygon(point, polygon));
    const insideCount = insideFlags.filter(Boolean).length;
    if (insideCount === 0) {
      return false;
    }

    if (isTextLikeEntity(entity)) {
      return true;
    }

    // Para exclusao de lotes, ser conservador evita apagar o restante do desenho
    // quando a entidade apenas encosta no contorno selecionado.
    if (representativePoints.length <= 3) {
      return insideCount === representativePoints.length;
    }

    const centroidPoint = representativePoints[representativePoints.length - 1]!;
    const centroidInside = isPointInsideOrNearPolygon(centroidPoint, polygon, LOT_REMOVAL_ENTITY_TOLERANCE * 0.5);
    return centroidInside && insideCount >= Math.ceil((representativePoints.length * 3) / 4);
  });
};

const doesDetectedPolygonMatchSelectedScope = (
  detectedPolygon: Point2D[],
  selectedPolygons: Point2D[][]
): boolean => {
  if (detectedPolygon.length === 0 || selectedPolygons.length === 0) {
    return false;
  }

  const centroid = getPolygonCentroid(detectedPolygon);
  return selectedPolygons.some((selectedPolygon) => {
    if (isPointInsideOrNearPolygon(centroid, selectedPolygon, LOT_REMOVAL_ENTITY_TOLERANCE)) {
      return true;
    }

    const insideVertexCount = detectedPolygon.filter((point) => (
      isPointInsideOrNearPolygon(point, selectedPolygon, LOT_REMOVAL_ENTITY_TOLERANCE)
    )).length;

    return insideVertexCount >= Math.ceil((detectedPolygon.length * 3) / 5);
  });
};

const buildEntityRemovalDebugSummary = (entity: DXFEntity) => {
  const representativePoints = getEntityRepresentativePoints(entity);
  return {
    type: entity.type,
    layer: entity.layer ?? null,
    text: typeof entity.properties.text === 'string' ? entity.properties.text.slice(0, 80) : null,
    representativePointCount: representativePoints.length,
    representativePointSample: representativePoints.slice(0, 4)
  };
};

const CadEditorBase: React.FC<CadEditorBaseProps> = ({ host }) => {
  const ViewerComponent = host.ViewerComponent;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const guideContextMenuRef = useRef<HTMLDivElement>(null);
  const entityContextMenuRef = useRef<HTMLDivElement>(null);
  const leftPanelResizeRef = useRef<{ startClientX: number; startWidth: number } | null>(null);
  const rightPanelResizeRef = useRef<{ startClientX: number; startWidth: number } | null>(null);
  const rulerInteractionRef = useRef<CadRulerInteraction | null>(null);
  const suppressViewerCanvasClickRef = useRef(false);
  const pendingCanvasGuideDragRef = useRef<{
    guide: CadGuide;
    startClientX: number;
    startClientY: number;
  } | null>(null);
  const {
    initialCadEditorSettings,
    initialCadEditorSessionPreferences,
    initialTextToolSessionState,
    handleNavigateBack
  } = host.useBoot();
  const resolveStoredLayerName = useCallback((layerName: string | null | undefined, fallbackLayerName: string) => {
    const normalizedLayerName = layerName?.trim();
    if (!normalizedLayerName) {
      return fallbackLayerName;
    }
    if (!host.resolveFunctionalLayerName) {
      return normalizedLayerName;
    }
    return host.resolveFunctionalLayerName({
      layer: normalizedLayerName,
      text: null,
      type: undefined
    });
  }, [host]);
  const [activeDock, setActiveDock] = useState<CadDockSection>(initialCadEditorSessionPreferences.activeDock);
  const [activeToolId, setActiveToolId] = useState(initialCadEditorSessionPreferences.activeToolId);
  const [menuOpenId, setMenuOpenId] = useState<CadMenuId | null>(null);
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<CadMeasurementUnit>(initialCadEditorSettings.measurementUnit);
  const [newDocumentWorkspaceSize, setNewDocumentWorkspaceSize] = useState(initialCadEditorSettings.newDocumentWorkspaceSize);
  const [openedDocument, setOpenedDocument] = useState<CadOpenedDocument | null>(null);
  const [loadedDxfData, setLoadedDxfData] = useState<DXFData | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<ViewerSelectedEntityInfo[]>([]);
  const [copiedEntitiesClipboard, setCopiedEntitiesClipboard] = useState<DXFEntity[]>([]);
  const [undoStack, setUndoStack] = useState<DXFData[]>([]);
  const [redoStack, setRedoStack] = useState<DXFData[]>([]);
  const [viewerSelectionOverride, setViewerSelectionOverride] = useState<string[] | undefined>(undefined);
  const [hiddenLayerNames, setHiddenLayerNames] = useState<string[]>([]);
  const [weldTolerance, setWeldTolerance] = useState(initialCadEditorSessionPreferences.weldTolerance);
  const [activeLayerName, setActiveLayerName] = useState(
    resolveStoredLayerName(initialCadEditorSessionPreferences.activeLayerName, host.defaultActiveLayerName)
  );
  const [annotationLayerName, setAnnotationLayerName] = useState(
    resolveStoredLayerName(initialCadEditorSessionPreferences.annotationLayerName, host.defaultAnnotationLayerName)
  );
  const [textAnnotationLayerName, setTextAnnotationLayerName] = useState(
    resolveStoredLayerName(initialTextToolSessionState.textAnnotationLayerName, host.defaultTextAnnotationLayerName)
  );
  const [textToolPresetId, setTextToolPresetId] = useState<TextToolSessionState['presetId']>(initialTextToolSessionState.presetId);
  const [drawingTextValue, setDrawingTextValue] = useState(initialTextToolSessionState.textValue);
  const [drawingTextHeight, setDrawingTextHeight] = useState(initialTextToolSessionState.height);
  const [drawingTextRotation, setDrawingTextRotation] = useState(initialTextToolSessionState.rotation);
  const [drawingTextAlignment, setDrawingTextAlignment] = useState<DrawingTextAlignment>(initialTextToolSessionState.alignment);
  const [drawingTextVerticalAlignment, setDrawingTextVerticalAlignment] = useState<DrawingTextVerticalAlignment>(initialTextToolSessionState.verticalAlignment);
  const [textUsesAnnotationLayer, setTextUsesAnnotationLayer] = useState(initialTextToolSessionState.textUsesAnnotationLayer);
  const [closePointToPointShape, setClosePointToPointShape] = useState(initialCadEditorSessionPreferences.closePointToPointShape);
  const [showGrid, setShowGrid] = useState(initialCadEditorSessionPreferences.showGrid);
  const [showCursorCoordinates, setShowCursorCoordinates] = useState(initialCadEditorSessionPreferences.showCursorCoordinates);
  const [guidesVisible, setGuidesVisible] = useState(initialCadEditorSessionPreferences.guidesVisible);
  const [enableGridSnap, setEnableGridSnap] = useState(initialCadEditorSessionPreferences.enableGridSnap);
  const [enableObjectSnap, setEnableObjectSnap] = useState(initialCadEditorSessionPreferences.enableObjectSnap);
  const [gridSnapSize, setGridSnapSize] = useState(initialCadEditorSessionPreferences.gridSnapSize);
  const [drawingLineColor, setDrawingLineColor] = useState(initialCadEditorSessionPreferences.drawingLineColor);
  const [drawingFillColor, setDrawingFillColor] = useState(initialCadEditorSessionPreferences.drawingFillColor);
  const [paintFillEnabled, setPaintFillEnabled] = useState(initialCadEditorSessionPreferences.paintFillEnabled);
  const [viewerZoom, setViewerZoom] = useState(initialCadEditorSessionPreferences.viewerZoom);
  const [lastViewportCommandId, setLastViewportCommandId] = useState<CadEditorSessionPreferences['lastViewportCommandId']>(
    initialCadEditorSessionPreferences.lastViewportCommandId
  );
  const [editorNotice, setEditorNotice] = useState<string>(host.texts.initialEditorNotice);
  const [viewportCommand, setViewportCommand] = useState<ViewerViewportCommand>({
    zoomInToken: 0,
    zoomOutToken: 0,
    fitToken: 0,
    resetToken: 0,
    absoluteZoomToken: Math.abs(initialCadEditorSessionPreferences.viewerZoom - 1) > 0.001 ? 1 : 0,
    absoluteZoomValue: initialCadEditorSessionPreferences.viewerZoom
  });
  const [leftPanelState, setLeftPanelState] = useState<Record<CadDockSection, boolean>>(
    initialCadEditorSessionPreferences.leftPanelState
  );
  const [leftPanelWidth, setLeftPanelWidth] = useState(initialCadEditorSessionPreferences.leftPanelWidth);
  const [rightPanelState, setRightPanelState] = useState<Record<CadRightPanelId, boolean>>(
    initialCadEditorSessionPreferences.rightPanelState
  );
  const [rightPanelWidth, setRightPanelWidth] = useState(initialCadEditorSessionPreferences.rightPanelWidth);
  const [viewerViewportState, setViewerViewportState] = useState<CadViewportState>(DEFAULT_VIEWPORT_STATE);
  const [canvasAreaSize, setCanvasAreaSize] = useState({ width: 0, height: 0 });
  const [rulerOrigin, setRulerOrigin] = useState(initialCadEditorSessionPreferences.rulerOrigin);
  const [rulerGuides, setRulerGuides] = useState<CadGuide[]>(initialCadEditorSessionPreferences.rulerGuides);
  const [rulerGuidePreview, setRulerGuidePreview] = useState<CadGuide | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [hoveredGuideId, setHoveredGuideId] = useState<string | null>(null);
  const [guideContextMenu, setGuideContextMenu] = useState<CadGuideContextMenuState | null>(null);
  const [entityContextMenu, setEntityContextMenu] = useState<CadEntityContextMenuState | null>(null);
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [isLayerDialogOpen, setIsLayerDialogOpen] = useState(false);
  const [pendingTextPlacement, setPendingTextPlacement] = useState<{ point: Point2D; layerName: string } | null>(null);
  const [pendingLayerName, setPendingLayerName] = useState('');
  const [editorCorrectiveIssues, setEditorCorrectiveIssues] = useState<CorrectiveIssueView[]>([]);
  const [editorCorrectiveFocusLotNumber, setEditorCorrectiveFocusLotNumber] = useState<number | null>(null);
  const [editorSelectedConfrontationTexts, setEditorSelectedConfrontationTexts] = useState<SelectedConfrontationText[]>([]);
  const [editorSegmentAnnotations, setEditorSegmentAnnotations] = useState<SegmentConfrontationAnnotation[]>([]);
  const [clearPrimarySelectionNonce, setClearPrimarySelectionNonce] = useState(0);
  const [editorReferencePoints, setEditorReferencePoints] = useState<ConfirmedReferencePoint[]>([]);
  const [editorConfirmedSelections, setEditorConfirmedSelections] = useState<ConfirmedLotSelection[]>([]);
  const [savedPartialSelectionLotNumbers, setSavedPartialSelectionLotNumbers] = useState<number[]>([]);
  const [savedPartialSelections, setSavedPartialSelections] = useState<ConfirmedLotSelection[]>([]);
  const [savedPartialReferencePoints, setSavedPartialReferencePoints] = useState<ConfirmedReferencePoint[]>([]);
  const [savedBaseAreaReferencePoints, setSavedBaseAreaReferencePoints] = useState<ConfirmedReferencePoint[]>([]);
  const [manualReviewLotNumbers, setManualReviewLotNumbers] = useState<number[]>([]);
  const savedPartialSelectionLotNumbersRef = useRef<number[]>([]);
  const savedPartialSelectionsRef = useRef<ConfirmedLotSelection[]>([]);
  const [technicalSummaryScopeMode, setTechnicalSummaryScopeMode] = useState<TechnicalSummaryScopeMode>('full');
  const [isBaseAreaVisible, setIsBaseAreaVisible] = useState(true);
  const [isTechnicalSummaryDialogOpen, setIsTechnicalSummaryDialogOpen] = useState(false);
  const [isGeneratingTechnicalSummary, setIsGeneratingTechnicalSummary] = useState(false);
  const [technicalSummaryError, setTechnicalSummaryError] = useState('');
  const [technicalSummaryJson, setTechnicalSummaryJson] = useState('');
  const [technicalSummaryText, setTechnicalSummaryText] = useState('');
  const [technicalSummaryProcessingContextStatus, setTechnicalSummaryProcessingContextStatus] = useState<ProcessingContextStatusDTO | null>(null);
  const [technicalSummaryAnalyzedFileName, setTechnicalSummaryAnalyzedFileName] = useState('');
  const measurementUnitDefinition = useMemo(
    () => (
      host.measurementUnitOptions.find((unit) => unit.id === measurementUnit)
      || host.measurementUnitOptions[1]
    ),
    [measurementUnit]
  );
  const workspaceSizeLabel = useMemo(
    () => `${newDocumentWorkspaceSize.toFixed(measurementUnit === 'm' ? 2 : 0)} ${measurementUnitDefinition.shortLabel}`,
    [measurementUnit, measurementUnitDefinition.shortLabel, newDocumentWorkspaceSize]
  );
  const majorGridStepLabel = useMemo(
    () => `${measurementUnitDefinition.majorGridStep.toFixed(measurementUnit === 'm' ? 2 : 0)} ${measurementUnitDefinition.shortLabel}`,
    [measurementUnit, measurementUnitDefinition.majorGridStep, measurementUnitDefinition.shortLabel]
  );
  const {
    horizontalRulerTicks,
    verticalRulerTicks,
    rulerGuideSegments,
    horizontalRulerGuideMarkers,
    verticalRulerGuideMarkers,
    horizontalRulerZeroScreen,
    verticalRulerZeroScreen,
    rulerOriginLabel,
    selectedGuide,
    hoveredGuide,
    guideContextMenuGuide,
    guideContextMenuStyle,
    entityContextMenuStyle
  } = useCadEditorWorkspaceView({
    canvasAreaSize,
    viewerViewportState,
    rulerOrigin,
    rulerGuides,
    rulerGuidePreview,
    guidesVisible,
    selectedGuideId,
    hoveredGuideId,
    guideContextMenu,
    entityContextMenu
  });
  const {
    selectedTextToolPreset,
    activeTextToolPresetId,
    activeTextToolPresetLabel,
    textPresetDeviationLabels,
    hasCustomTextPreset,
    textFieldModifiedMap
  } = useCadEditorTextToolViewModel({
    textToolPresets: host.textToolPresets,
    selectedTextToolPresetId: textToolPresetId,
    drawingTextValue,
    drawingTextHeight,
    drawingTextRotation,
    drawingTextAlignment,
    drawingTextVerticalAlignment,
    textUsesAnnotationLayer,
    annotationLayerName,
    textAnnotationLayerName
  });
  const embeddedToolMode = useMemo<EmbeddedCadToolMode>(() => {
    if (activeToolId === 'pan') {
      return 'pan';
    }
    if (activeToolId === 'zoom') {
      return 'zoom';
    }
    if (DRAWING_TOOL_IDS.has(activeToolId as EmbeddedCadToolMode)) {
      return activeToolId as EmbeddedCadToolMode;
    }
    return 'select';
  }, [activeToolId]);
  const currentEditorData = loadedDxfData || openedDocument?.dxfData || null;
  const referencePointsForSummary = useMemo<ConfirmedReferencePoint[]>(() => {
    const nonBaseAreaReferencePoints = [
      ...editorReferencePoints,
      ...savedPartialReferencePoints
    ].filter(
      (referencePoint) => !isReservedBoundaryReferencePoint(referencePoint.label)
    );
    return [
      ...nonBaseAreaReferencePoints,
      ...savedBaseAreaReferencePoints
    ];
  }, [editorReferencePoints, savedBaseAreaReferencePoints, savedPartialReferencePoints]);
  useEffect(() => {
    setManualReviewLotNumbers([]);
  }, [openedDocument?.name, openedDocument?.sizeBytes]);
  useEffect(() => {
    setSavedPartialSelectionLotNumbers([]);
    setSavedPartialSelections([]);
    setSavedPartialReferencePoints([]);
    savedPartialSelectionLotNumbersRef.current = [];
    savedPartialSelectionsRef.current = [];
  }, [openedDocument?.name, openedDocument?.sizeBytes]);
  useEffect(() => {
    savedPartialSelectionLotNumbersRef.current = savedPartialSelectionLotNumbers;
  }, [savedPartialSelectionLotNumbers]);
  useEffect(() => {
    savedPartialSelectionsRef.current = savedPartialSelections;
  }, [savedPartialSelections]);
  useEffect(() => {
    setTechnicalSummaryScopeMode('full');
  }, [openedDocument?.name, openedDocument?.sizeBytes]);
  const boundaryContextsForSummaryDialog = useMemo(() => ([
    {
      id: 'primary-boundary',
      title: 'Primarias',
      label: savedBaseAreaReferencePoints[0]?.label?.replace(/\d+$/, '') || 'AREA_TOTAL',
      pointCount: savedBaseAreaReferencePoints.length,
      isSaved: savedBaseAreaReferencePoints.length > 0,
      description: savedBaseAreaReferencePoints.length > 0
        ? `Perimetral primaria salva em Operacoes a partir dos trechos marcados com Ctrl + Shift. ${isBaseAreaVisible ? 'Visivel no canvas.' : 'Oculta no canvas.'}`
        : 'Nenhum trecho primario foi salvo em Operacoes para esta geracao.'
    }
  ]), [isBaseAreaVisible, savedBaseAreaReferencePoints]);
  const technicalSummaryOperationalNotices = useMemo(() => {
    if (savedBaseAreaReferencePoints.length === 0) {
      return [{
        id: 'missing-primary-boundary',
        title: 'Primarias ausentes',
        message: 'O Resumo Tecnico sera gerado sem as Primarias salvas em Operacoes. Marque a perimetral com Ctrl + Shift antes de prosseguir.'
      }];
    }

    return [];
  }, [savedBaseAreaReferencePoints.length]);
  const primaryBoundaryValidation = useMemo(
    () => buildBoundaryVerticesFromAnnotations(editorSegmentAnnotations),
    [editorSegmentAnnotations]
  );
  const isSavedPartialSelectionSynced = useMemo(() => {
    const currentDraftLotNumbers = Array.from(
      new Set(
        editorConfirmedSelections
          .map((selection) => selection.lotNumber)
          .filter((value): value is number => Number.isFinite(value))
      )
    ).sort((left, right) => left - right);

    return savedPartialSelectionLotNumbers.length > 0
      && savedPartialSelectionLotNumbers.length === currentDraftLotNumbers.length
      && savedPartialSelectionLotNumbers.every((value, index) => value === currentDraftLotNumbers[index]);
  }, [editorConfirmedSelections, savedPartialSelectionLotNumbers]);
  const savedBoundaryOverlaySegments = useMemo<ViewerOverlaySegment[]>(
    () => (isBaseAreaVisible ? buildBoundaryOverlaySegments(savedBaseAreaReferencePoints, '#2563eb') : []),
    [isBaseAreaVisible, savedBaseAreaReferencePoints]
  );
  const savedBoundaryOverlayPoints = useMemo<ViewerOverlayPoint[]>(
    () => (isBaseAreaVisible ? buildBoundaryOverlayPoints(savedBaseAreaReferencePoints, '#2563eb', 'PRIMARIAS') : []),
    [isBaseAreaVisible, savedBaseAreaReferencePoints]
  );
  const canInteractWithEntity = useCallback((entity: DXFEntity) => (
    technicalSummaryScopeMode === 'partial'
    || technicalSummaryScopeMode === 'exclude'
    || !activeLayerName
    || entity.layer === activeLayerName
  ), [activeLayerName, technicalSummaryScopeMode]);
  useEffect(() => {
    if (!loadedDxfData) {
      return;
    }

    setOpenedDocument((current) => {
      if (!current || current.dxfData === loadedDxfData) {
        return current;
      }

      return {
        ...current,
        dxfData: loadedDxfData
      };
    });
  }, [loadedDxfData, setOpenedDocument]);
  useEffect(() => {
    setSavedBaseAreaReferencePoints([]);
    setIsBaseAreaVisible(true);
  }, [openedDocument?.name]);
  const hiddenLayerNameSet = useMemo(() => new Set(hiddenLayerNames), [hiddenLayerNames]);
  const resolveFunctionalLayerName = host.resolveFunctionalLayerName;
  const viewerData = useMemo<DXFData | null>(() => {
    if (!currentEditorData || hiddenLayerNameSet.size === 0) {
      return currentEditorData;
    }

    const visibleEntities = currentEditorData.entities.filter((entity) => {
      const resolvedLayerName = resolveFunctionalLayerName
        ? resolveFunctionalLayerName(entity)
        : entity.layer;
      return !hiddenLayerNameSet.has(resolvedLayerName);
    });
    if (visibleEntities.length === currentEditorData.entities.length) {
      return currentEditorData;
    }

    const entityCounts = visibleEntities.reduce<Record<string, number>>((counts, entity) => {
      counts[entity.type] = (counts[entity.type] || 0) + 1;
      return counts;
    }, {});
    const layerCounts = currentEditorData.layers.reduce<Record<string, number>>((counts, layer) => {
      counts[layer.name] = 0;
      return counts;
    }, {});

    visibleEntities.forEach((entity) => {
      const resolvedLayerName = resolveFunctionalLayerName
        ? resolveFunctionalLayerName(entity)
        : entity.layer;
      layerCounts[resolvedLayerName] = (layerCounts[resolvedLayerName] || 0) + 1;
    });

    return {
      ...currentEditorData,
      entities: visibleEntities,
      entityCounts,
      layerCounts
    };
  }, [currentEditorData, hiddenLayerNameSet, resolveFunctionalLayerName]);
  const summaryConfrontationSelectionScope = useMemo(() => {
    const summaryConfrontationSourceData = viewerData || currentEditorData;
    if (!summaryConfrontationSourceData) {
      return {
        texts: [] as ConfirmedConfrontationText[],
        lotNumbers: [] as number[],
        lotSelections: [] as ConfirmedLotSelection[]
      };
    }

    const { detectedPolygons } = analyzeGeoLimitesLotDetection({
      dxfData: summaryConfrontationSourceData,
      manualBridgeSegments: []
    });

    if (detectedPolygons.length === 0) {
      const segmentedSourceIds = new Set(editorSegmentAnnotations.map((annotation) => annotation.sourceTextId));
      const segmentSelections = editorSegmentAnnotations.map<ConfirmedConfrontationText>((annotation) => ({
        id: annotation.sourceTextId,
        text: annotation.text,
        layer: annotation.layer,
        entityType: annotation.entityType,
        x: (annotation.startPoint.x + annotation.endPoint.x) / 2,
        y: (annotation.startPoint.y + annotation.endPoint.y) / 2,
        inferredDirection: null,
        selectionMode: annotation.selectionMode,
        segmentStartPoint: annotation.startPoint,
        segmentEndPoint: annotation.endPoint
      }));
      const textSelections = editorSelectedConfrontationTexts
        .filter((selectedText) => !segmentedSourceIds.has(selectedText.id))
        .map<ConfirmedConfrontationText>((selectedText) => ({
          ...selectedText,
          inferredDirection: null,
          selectionMode: 'text'
        }));
      return {
        texts: [...segmentSelections, ...textSelections],
        lotNumbers: [] as number[],
        lotSelections: [] as ConfirmedLotSelection[]
      };
    }

    const confirmedSelections = buildConfirmedSelections(
      detectedPolygons,
      summaryConfrontationSourceData,
      editorSelectedConfrontationTexts,
      editorSegmentAnnotations
    );

    const dedupedSelections = new Map<string, ConfirmedConfrontationText>();
    confirmedSelections.forEach((selection) => {
      selection.selectedConfrontationTexts.forEach((selectedText) => {
        const dedupeKey = buildConfirmedConfrontationTextKey(selectedText);
        if (!dedupedSelections.has(dedupeKey)) {
          dedupedSelections.set(dedupeKey, selectedText);
        }
      });
    });

    return {
      texts: Array.from(dedupedSelections.values()),
      lotNumbers: Array.from(
        new Set(
          confirmedSelections
            .map((selection) => selection.lotNumber)
            .filter((value): value is number => Number.isFinite(value))
        )
      ).sort((left, right) => left - right),
      lotSelections: confirmedSelections.filter((selection) => Number.isFinite(selection.lotNumber))
    };
  }, [currentEditorData, editorSegmentAnnotations, editorSelectedConfrontationTexts, viewerData]);
  const summarySelectedConfrontationTexts = summaryConfrontationSelectionScope.texts;
  const currentSelectedLotNumbersForTechnicalSummary = useMemo(
    () => Array.from(
      new Set(
        editorConfirmedSelections
          .map((selection) => selection.lotNumber)
          .filter((value): value is number => Number.isFinite(value))
      )
    ).sort((left, right) => left - right),
    [editorConfirmedSelections]
  );
  const selectedLotNumbersForTechnicalSummary = useMemo(
    () => {
      if (technicalSummaryScopeMode !== 'partial') {
        return [];
      }

      if (currentSelectedLotNumbersForTechnicalSummary.length > 0) {
        return currentSelectedLotNumbersForTechnicalSummary;
      }

      return savedPartialSelectionLotNumbers;
    },
    [
      currentSelectedLotNumbersForTechnicalSummary,
      savedPartialSelectionLotNumbers,
      technicalSummaryScopeMode
    ]
  );
  const selectedLotSelectionsForTechnicalSummary = useMemo(
    () => {
      if (technicalSummaryScopeMode !== 'partial') {
        return [];
      }

      const activeSelections = editorConfirmedSelections.filter((selection) => Number.isFinite(selection.lotNumber));
      if (activeSelections.length > 0) {
        return activeSelections;
      }

      return savedPartialSelections.filter((selection) => Number.isFinite(selection.lotNumber));
    },
    [
      editorConfirmedSelections,
      savedPartialSelections,
      technicalSummaryScopeMode
    ]
  );
  const selectedLotSelectionsForMixedSummary = useMemo(
    () => {
      if (technicalSummaryScopeMode !== 'mixed') {
        return [];
      }

      return (savedPartialSelections.length > 0 ? savedPartialSelections : savedPartialSelectionsRef.current)
        .filter((selection) => Number.isFinite(selection.lotNumber));
    },
    [
      savedPartialSelections,
      technicalSummaryScopeMode
    ]
  );
  const selectedLotNumbersForMixedSummary = useMemo(
    () => {
      if (technicalSummaryScopeMode !== 'mixed') {
        return [];
      }
      return savedPartialSelectionLotNumbers.length > 0
        ? savedPartialSelectionLotNumbers
        : savedPartialSelectionLotNumbersRef.current;
    },
    [
      savedPartialSelectionLotNumbers,
      technicalSummaryScopeMode
    ]
  );
  const selectedLotNumbersForRemovalExperiment = useMemo(
    () => {
      if (technicalSummaryScopeMode === 'exclude') {
        return currentSelectedLotNumbersForTechnicalSummary;
      }

      return currentSelectedLotNumbersForTechnicalSummary.length > 0
        ? currentSelectedLotNumbersForTechnicalSummary
        : savedPartialSelectionLotNumbers;
    },
    [currentSelectedLotNumbersForTechnicalSummary, savedPartialSelectionLotNumbers, technicalSummaryScopeMode]
  );
  const selectedLotSelectionsForRemovalExperiment = useMemo(
    () => {
      const activeSelections = editorConfirmedSelections.filter((selection) => Number.isFinite(selection.lotNumber));
      if (activeSelections.length > 0) {
        return activeSelections;
      }
      if (technicalSummaryScopeMode === 'exclude') {
        return [];
      }
      return savedPartialSelections.filter((selection) => Number.isFinite(selection.lotNumber));
    },
    [editorConfirmedSelections, savedPartialSelections, technicalSummaryScopeMode]
  );
  const partialSelectionsForPersistentReplacement = useMemo(
    () => {
      const activeSelections = editorConfirmedSelections
        .filter((selection) => selection.polygon.length >= 3);
      if (activeSelections.length > 0) {
        return activeSelections;
      }

      return (savedPartialSelections.length > 0 ? savedPartialSelections : savedPartialSelectionsRef.current)
        .filter((selection) => selection.polygon.length >= 3);
    },
    [editorConfirmedSelections, savedPartialSelections]
  );
  const partialSelectionCountForPersistentReplacement = partialSelectionsForPersistentReplacement.length;
  const partialLotNumbersForPersistentReplacement = useMemo(
    () => Array.from(new Set(
      partialSelectionsForPersistentReplacement
        .map((selection) => selection.lotNumber)
        .filter((value): value is number => Number.isFinite(value))
    )).sort((left, right) => left - right),
    [partialSelectionsForPersistentReplacement]
  );
  const effectiveManualReviewLotNumbers = useMemo(
    () => {
      if (technicalSummaryScopeMode === 'mixed') {
        return [];
      }

      const normalizedExplicitManualReviewLots = Array.from(
        new Set(manualReviewLotNumbers.filter((value): value is number => Number.isFinite(value)))
      ).sort((left, right) => left - right);
      if (normalizedExplicitManualReviewLots.length > 0) {
        return normalizedExplicitManualReviewLots;
      }

      if (technicalSummaryScopeMode === 'partial' || technicalSummaryScopeMode === 'full' || selectedLotNumbersForTechnicalSummary.length > 0) {
        return [];
      }

      return Array.from(
        new Set(savedPartialSelectionLotNumbers.filter((value): value is number => Number.isFinite(value)))
      ).sort((left, right) => left - right);
    },
    [manualReviewLotNumbers, savedPartialSelectionLotNumbers, selectedLotNumbersForTechnicalSummary.length, technicalSummaryScopeMode]
  );
  const technicalSummaryScopeDescription = useMemo(() => (
    technicalSummaryScopeMode === 'partial'
      ? (
        selectedLotNumbersForTechnicalSummary.length > 0
          ? `Parciais: o resumo saira apenas com ${selectedLotNumbersForTechnicalSummary.length} lote(s) do recorte salvo.`
          : 'Parciais: salve ao menos um recorte manual com Alt + Select para usar este modo.'
      )
      : technicalSummaryScopeMode === 'mixed'
        ? (
          selectedLotNumbersForMixedSummary.length > 0
            ? `Total + Parciais: o resumo saira para o terreno todo, substituindo os lotes ${selectedLotNumbersForMixedSummary.join(', ')} pelas geometrias salvas no parcial.`
            : 'Total + Parciais: salve ao menos um recorte manual para substituir lotes dentro do resumo total.'
        )
      : technicalSummaryScopeMode === 'exclude'
        ? 'Exclusao: marque os lotes com Alt + Select e remova do desenho sem depender do resumo tecnico.'
        : (
        'Total: o resumo saira para o terreno todo sem aproveitar os parciais salvos.'
        )
  ), [savedPartialSelectionLotNumbers, selectedLotNumbersForMixedSummary, selectedLotNumbersForTechnicalSummary.length, technicalSummaryScopeMode]);
  const rightSidebarFlowSummary = useMemo(() => {
    const partialDraftCount = currentSelectedLotNumbersForTechnicalSummary.length;
    const confrontationTextCount = editorSelectedConfrontationTexts.length;
    const confrontationSegmentCount = editorSegmentAnnotations.length;

    return {
      stage: technicalSummaryScopeMode === 'exclude'
        ? 'Pronto para Exclusao'
        : savedBaseAreaReferencePoints.length > 0
          ? (technicalSummaryScopeMode === 'partial' ? 'Pronto para Parciais' : technicalSummaryScopeMode === 'mixed' ? 'Pronto para Total + Parciais' : 'Pronto para Confrontacoes')
          : 'Aguardando Primaria',
      detail: technicalSummaryScopeMode === 'exclude'
        ? 'Selecionar lotes para remover.'
        : savedBaseAreaReferencePoints.length > 0
          ? (technicalSummaryScopeMode === 'partial' ? 'Definir o recorte manual.' : technicalSummaryScopeMode === 'mixed' ? 'Selecionar lotes para destaque manual dentro do resumo total.' : 'Selecionar ruas e confrontacoes.')
          : 'Limitar o terreno.',
      nextStep: savedBaseAreaReferencePoints.length === 0
        ? (technicalSummaryScopeMode === 'exclude' ? 'Marcar lotes' : 'Salvar Primarias')
        : partialDraftCount > 0
          ? (technicalSummaryScopeMode === 'exclude' ? 'Remover Lote' : 'Salvar Parcial')
          : confrontationTextCount > 0 || confrontationSegmentCount > 0
            ? 'Gerar Resumo'
            : (technicalSummaryScopeMode === 'partial' ? 'Fazer Parciais' : technicalSummaryScopeMode === 'mixed' ? 'Marcar Destaques' : technicalSummaryScopeMode === 'exclude' ? 'Marcar Exclusao' : 'Fazer Confrontacoes'),
      confrontationSummary: confrontationTextCount > 0 || confrontationSegmentCount > 0
        ? `${confrontationTextCount} texto(s) | ${confrontationSegmentCount} trecho(s).`
        : 'Nenhuma confrontacao.'
    };
  }, [
    currentSelectedLotNumbersForTechnicalSummary.length,
    editorSegmentAnnotations.length,
    editorSelectedConfrontationTexts.length,
    savedBaseAreaReferencePoints.length,
    savedPartialSelectionLotNumbers.length,
    technicalSummaryScopeMode
  ]);
  const rightSidebarSelectionSummary = useMemo(() => ({
    entitySummary: selectedEntities.length > 0
      ? `${selectedEntities.length} entidade(s) em destaque no canvas.`
      : 'Nenhuma entidade CAD destacada no momento.',
    manualLotsSummary: savedPartialSelectionLotNumbers.length > 0
      ? `Recorte salvo: lotes ${savedPartialSelectionLotNumbers.join(', ')}.`
      : currentSelectedLotNumbersForTechnicalSummary.length > 0
        ? `Recorte em montagem: lotes ${currentSelectedLotNumbersForTechnicalSummary.join(', ')}.`
        : 'Nenhum lote parcial salvo.',
    manualReviewSummary: technicalSummaryScopeMode === 'mixed'
      ? 'Total + Parciais: os parciais salvos substituem os lotes automaticos correspondentes.'
      : manualReviewLotNumbers.length > 0
        ? `${manualReviewLotNumbers.length} lote(s) em revisao manual separada.`
        : 'Sem revisao manual separada no momento.'
  }), [
    currentSelectedLotNumbersForTechnicalSummary,
    manualReviewLotNumbers.length,
    savedPartialSelectionLotNumbers,
    selectedEntities.length,
    technicalSummaryScopeMode
  ]);
  const technicalSummarySelectionScope = useMemo(() => (
    technicalSummaryScopeMode === 'partial'
      ? {
          mode: 'partial' as const,
          title: 'Resumo parcial',
          detail: currentSelectedLotNumbersForTechnicalSummary.length > 0
            ? 'O modo Parciais esta ativo e o resumo sera gerado somente para os lotes do recorte manual em andamento.'
            : selectedLotNumbersForTechnicalSummary.length > 0
              ? 'O modo Parciais esta ativo e o resumo sera gerado somente para os lotes salvos no parcial.'
              : 'O modo Parciais esta ativo, mas ainda nao existe recorte manual salvo para alimentar o resumo.',
          badgeLabel: selectedLotNumbersForTechnicalSummary.length > 0
            ? `${selectedLotNumbersForTechnicalSummary.length} lote(s) no recorte`
            : 'Aguardando parcial',
          lotNumbers: selectedLotNumbersForTechnicalSummary
        }
      : technicalSummaryScopeMode === 'mixed'
        ? {
          mode: 'full' as const,
          title: 'Resumo total com parciais',
          detail: selectedLotNumbersForMixedSummary.length > 0
            ? `O modo Total + Parciais esta ativo. O resumo saira com o terreno completo, e os lotes ${selectedLotNumbersForMixedSummary.join(', ')} serao substituidos pelas geometrias salvas no parcial.`
            : 'O modo Total + Parciais esta ativo, mas ainda nao existe parcial salva para substituir lotes no resumo.',
          badgeLabel: selectedLotNumbersForMixedSummary.length > 0
            ? `${selectedLotNumbersForMixedSummary.length} lote(s) substituidos`
            : 'Aguardando parciais',
          lotNumbers: []
        }
      : technicalSummaryScopeMode === 'exclude'
        ? {
            mode: 'full' as const,
            title: 'Exclusao de lotes',
            detail: 'O modo Exclusao esta ativo. Use Alt + Select para marcar os lotes e remova-os em Utilitarios.',
            badgeLabel: selectedLotNumbersForRemovalExperiment.length > 0
              ? `${selectedLotNumbersForRemovalExperiment.length} lote(s) marcados`
              : 'Aguardando exclusao',
            lotNumbers: []
          }
        : {
          mode: 'full' as const,
          title: 'Resumo total',
          detail: 'O modo Total esta ativo. O resumo sera gerado para o terreno completo sem aproveitar parciais salvos.',
          badgeLabel: 'Terreno completo',
          lotNumbers: []
        }
  ), [
    currentSelectedLotNumbersForTechnicalSummary.length,
    selectedLotNumbersForRemovalExperiment.length,
    savedPartialSelectionLotNumbers,
    selectedLotNumbersForMixedSummary,
    selectedLotNumbersForTechnicalSummary,
    technicalSummaryScopeMode
  ]);
  const rightSidebarSummaryModeInfo = useMemo(() => ({
    modeLabel: technicalSummaryScopeMode === 'partial' ? 'Parciais' : technicalSummaryScopeMode === 'mixed' ? 'Total + Parciais' : technicalSummaryScopeMode === 'exclude' ? 'Exclusao' : 'Total',
    modeDetail: technicalSummaryScopeDescription,
    scopeLabel: technicalSummarySelectionScope.badgeLabel,
    lastGeneratedSummary: technicalSummaryAnalyzedFileName
      ? `Ultimo resumo gerado para: ${technicalSummaryAnalyzedFileName}.`
      : 'Nenhum resumo tecnico gerado nesta sessao.'
  }), [
    technicalSummaryAnalyzedFileName,
    technicalSummaryScopeDescription,
    technicalSummaryScopeMode,
    technicalSummarySelectionScope.badgeLabel
  ]);
  const handleTechnicalSummaryScopeModeChange = useCallback((mode: TechnicalSummaryScopeMode) => {
    setTechnicalSummaryScopeMode(mode);
    if (mode === 'partial') {
      setEditorNotice(
        savedPartialSelectionLotNumbers.length > 0 || currentSelectedLotNumbersForTechnicalSummary.length > 0
          ? 'Modo Parciais ativado. O Resumo Tecnico saira apenas com os lotes do recorte manual.'
          : 'Modo Parciais ativado. Salve ao menos um recorte manual com Alt + Select antes de gerar o resumo.'
      );
      return;
    }

    if (mode === 'mixed') {
      setEditorNotice(
        savedPartialSelectionLotNumbers.length > 0
          ? 'Modo Total + Parciais ativado. O resumo saira para o terreno todo, e os parciais salvos substituirao os lotes automaticos correspondentes.'
          : 'Modo Total + Parciais ativado. Salve ao menos um parcial com Alt + Select para substituir lotes dentro do resumo total.'
      );
      return;
    }

    if (mode === 'exclude') {
      setEditorConfirmedSelections([]);
      setEditorReferencePoints((current) => current.filter((referencePoint) => isReservedBoundaryReferencePoint(referencePoint.label)));
      setEditorSelectedConfrontationTexts([]);
      setEditorSegmentAnnotations([]);
      setClearPrimarySelectionNonce((currentValue) => currentValue + 1);
      setEditorNotice(
        'Modo Exclusao ativado. A selecao anterior foi limpa. Marque os lotes que deseja remover com Alt + Select e use Remover Lote em Utilitarios.'
      );
      return;
    }

    setEditorNotice(
      'Modo Total ativado. O resumo sera gerado para o terreno completo sem usar os parciais salvos.'
    );
  }, [currentSelectedLotNumbersForTechnicalSummary.length, savedPartialSelectionLotNumbers.length, setEditorNotice]);
  const handleViewerConfrontationSelectionChange = useCallback((payload: {
    selectedConfrontationTexts: SelectedConfrontationText[];
    segmentAnnotations: SegmentConfrontationAnnotation[];
  }) => {
    setEditorSelectedConfrontationTexts(payload.selectedConfrontationTexts);
    setEditorSegmentAnnotations(payload.segmentAnnotations);
  }, []);
  const handleViewerReferencePointsChange = useCallback((payload: {
    referencePoints: ConfirmedReferencePoint[];
  }) => {
    setEditorReferencePoints(payload.referencePoints);
  }, []);
  const normalizeConfirmedSelectionsWithFullEditorData = useCallback((selections: ConfirmedLotSelection[]) => {
    if (!currentEditorData || selections.length === 0) {
      return selections;
    }

    return selections.map((selection) => {
      const fullEditorTextsInside = summarizePolygonTexts(selection.polygon, currentEditorData);
      const mergedTextsInside = Array.from(new Set([
        ...selection.textsInside,
        ...fullEditorTextsInside
      ])).filter(Boolean).slice(0, 8);
      const resolvedLotNumber = Number.isFinite(selection.lotNumber)
        ? selection.lotNumber
        : extractLotNumberFromTexts(mergedTextsInside);

      if (
        resolvedLotNumber === selection.lotNumber
        && mergedTextsInside.length === selection.textsInside.length
        && mergedTextsInside.every((text, index) => text === selection.textsInside[index])
      ) {
        return selection;
      }

      return {
        ...selection,
        lotNumber: resolvedLotNumber,
        textsInside: mergedTextsInside
      };
    });
  }, [currentEditorData]);
  const handleViewerPolygonConfirmed = useCallback((payload: {
    selections: ConfirmedLotSelection[];
    referencePoints?: ConfirmedReferencePoint[];
  }) => {
    const normalizedSelections = normalizeConfirmedSelectionsWithFullEditorData(payload.selections);
    // #region debug-point R:lot-selection-confirmed
    sendSelectionDebug('A', 'CadEditorBase:handleViewerPolygonConfirmed', '[DEBUG] Selecoes de lote confirmadas no editor', {
      mode: technicalSummaryScopeMode,
      selectionCount: normalizedSelections.length,
      selections: normalizedSelections.map((selection, index) => ({
        index,
        lotNumber: selection.lotNumber ?? null,
        polygonVertexCount: selection.polygon.length,
        textsInside: selection.textsInside.slice(0, 8),
        polygonSample: selection.polygon.slice(0, 4)
      }))
    });
    // #endregion
    setEditorConfirmedSelections(normalizedSelections);
    if (payload.referencePoints) {
      setEditorReferencePoints(payload.referencePoints);
    }

    const selectedLotNumbers = Array.from(
      new Set(
        normalizedSelections
          .map((selection) => selection.lotNumber)
          .filter((value): value is number => Number.isFinite(value))
      )
    ).sort((left, right) => left - right);

    if (selectedLotNumbers.length > 0) {
      setEditorNotice(
        technicalSummaryScopeMode === 'mixed'
          ? `Selecao confirmada para salvar parcial: lotes ${selectedLotNumbers.join(', ')}. Use Salvar Parcial para alimentar o modo Total + Parciais.`
          : `Selecao confirmada para resumo parcial: lotes ${selectedLotNumbers.join(', ')}.`
      );
      return;
    }

    if (normalizedSelections.length > 0) {
      setEditorNotice(`Selecao confirmada com ${normalizedSelections.length} contorno(s), mas sem numero de lote reconhecivel.`);
    }
  }, [normalizeConfirmedSelectionsWithFullEditorData, setEditorNotice, technicalSummaryScopeMode]);
  const handleViewerSelectionSummaryChange = useCallback((payload: {
    selections: ConfirmedLotSelection[];
    referencePoints?: ConfirmedReferencePoint[];
  }) => {
    setEditorConfirmedSelections(normalizeConfirmedSelectionsWithFullEditorData(payload.selections));
    if (payload.referencePoints) {
      setEditorReferencePoints(payload.referencePoints);
    }
  }, [normalizeConfirmedSelectionsWithFullEditorData]);
  const handleManualReviewLotSelectionChange = useCallback((payload: ManualReviewLotSelectionPayload) => {
    setManualReviewLotNumbers(payload.lotNumbers);
    setEditorNotice(
      payload.selected
        ? `Lote ${payload.lotNumber} marcado para revisao manual. Ele aparecera separado no Resumo Tecnico.`
        : `Lote ${payload.lotNumber} removido da revisao manual.`
    );
  }, [setEditorNotice]);
  const {
    geometryEntityCount,
    textEntityCount,
    layerSummaries,
    layerPlaceholderRows,
    topEntityTypes,
    activeLayerSummary,
    activeLayerEntityTypes,
    primarySelectedEntity,
    selectedTypeLabels,
    selectionPosition,
    selectionLength,
    selectionVertexCount,
    selectionEntityLabel,
    selectionLayerLabel,
    selectionTextLabel,
    weldAvailability,
    weldPreviewSegments,
    weldPreviewPoints
  } = useCadEditorRightSidebarViewModel({
    loadedDxfData,
    currentEditorData,
    selectedEntities,
    activeLayerName,
    activeToolId,
    weldTolerance,
    baseLayers: host.baseLayers,
    layerColorClasses: host.layerColorClasses,
    resolveFunctionalLayerName
  });
  const canGroupSelection = selectedEntities.length >= 2;
  const canUngroupSelection = selectedEntities.some((entity) => Boolean(entity.groupId));
  useEffect(() => {
    const availableLayerNames = new Set(layerSummaries.map((layer) => layer.name));
    setHiddenLayerNames((current) => current.filter((layerName) => availableLayerNames.has(layerName)));
  }, [layerSummaries]);
  useEffect(() => {
    if (hiddenLayerNameSet.size === 0) {
      return;
    }

    setSelectedEntities((current) => current.filter((entity) => {
      const resolvedLayerName = resolveFunctionalLayerName
        ? resolveFunctionalLayerName({
          layer: entity.layer,
          type: entity.type,
          text: entity.text || null
        })
        : entity.layer;
      return !hiddenLayerNameSet.has(resolvedLayerName);
    }));
  }, [hiddenLayerNameSet, resolveFunctionalLayerName]);
  useEffect(() => {
    setEditorCorrectiveIssues([]);
    setEditorCorrectiveFocusLotNumber(null);
  }, [openedDocument?.name, openedDocument?.sizeBytes]);
  useEffect(() => {
    setEditorConfirmedSelections([]);
  }, [openedDocument?.name, openedDocument?.sizeBytes]);
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const {
    menuItems,
    commandItems,
    leftSidebarTitle,
    topBarBackButtonLabel,
    topBarDocumentLabel,
    emptyStateTitle,
    emptyStateSubtitle,
    emptyStateHint,
    shortcutsDialogTexts,
    textDialogTexts,
    layerDialogTexts,
    statusBarTexts,
    rightSidebarTexts,
    toolDefinitions,
    measurementUnitOptions,
    zoomPresets,
    menuActionsByMenu,
    isCommandBarActionDisabled,
    activeZoomPresetId,
    leftSidebarDocks,
    leftSidebarTools,
    fileExtensionLabel,
    editorCommandValue,
    statusDocumentLabel,
    statusActiveLayerLabel,
    statusViewportLabel
  } = host.useCadEditorChrome({
    openedDocument,
    currentEditorDataAvailable: Boolean(currentEditorData),
    canUndo,
    canRedo,
    weldCanApply: weldAvailability.canApply,
    selectedEntityCount: selectedEntities.length,
    canGroupSelection,
    canUngroupSelection,
    viewerZoom,
    loadedDxfData,
    lastViewportCommandId,
    activeLayerSummaryName: activeLayerSummary?.name || null,
    measurementUnit
  });
  const effectiveLeftSidebarTools = useMemo(() => leftSidebarTools.map((tool: {
    id: string;
    statusText?: string;
    disabled?: boolean;
    disabledReason?: string;
  }) => {
    if (tool.id === 'save-primary-boundary') {
      const hasSavedPrimaryBoundary = savedBaseAreaReferencePoints.length > 0;
      const draftPartialLotCount = currentSelectedLotNumbersForTechnicalSummary.length;
      const savedPartialLotCount = savedPartialSelectionLotNumbers.length;
      if (hasSavedPrimaryBoundary && (draftPartialLotCount > 0 || savedPartialLotCount > 0)) {
        return {
          ...tool,
          label: 'Salvar Parcial',
          statusText: draftPartialLotCount > 0
            ? (
              isSavedPartialSelectionSynced
                ? `${draftPartialLotCount} lote(s) parciais salvos`
                : `${draftPartialLotCount} lote(s) parciais prontos para salvar`
            )
            : `${savedPartialLotCount} lote(s) parciais salvos`,
          disabled: draftPartialLotCount === 0,
          disabledReason: 'Confirme pelo menos um lote manual com Alt + Select para salvar o parcial.'
        };
      }

      const totalMarkedSegments = editorSegmentAnnotations.length;
      const validationError = totalMarkedSegments > 0 ? primaryBoundaryValidation.error : null;
      const primaryBoundaryStatusText = formatPrimaryBoundaryValidationMessage(validationError);
      return {
        ...tool,
        statusText: savedBaseAreaReferencePoints.length > 0
          ? `${savedBaseAreaReferencePoints.length} vertice(s) salvos | ${totalMarkedSegments} trecho(s) marcados`
          : primaryBoundaryStatusText
            ? primaryBoundaryStatusText
            : totalMarkedSegments > 0
            ? `${totalMarkedSegments} trecho(s) prontos para salvar`
            : 'Marque a perimetral com Ctrl + Shift',
        // O botao deve liberar assim que houver trechos marcados; a validacao
        // completa continua acontecendo no clique para orientar o usuario.
        disabled: totalMarkedSegments === 0,
        disabledReason: 'Marque os trechos da perimetral com Ctrl + Shift antes de salvar as Primarias.'
      };
    }
    return tool;
  }), [
    currentSelectedLotNumbersForTechnicalSummary.length,
    editorSegmentAnnotations.length,
    isSavedPartialSelectionSynced,
    leftSidebarTools,
    primaryBoundaryValidation.error,
    savedBaseAreaReferencePoints.length,
    savedPartialSelectionLotNumbers.length
  ]);
  const { applyTextToolPreset, restoreSelectedTextToolPreset } = host.useCadEditorTextToolController({
    textToolPresets: host.textToolPresets,
    selectedTextToolPresetId: selectedTextToolPreset.id,
    selectedTextToolPresetLabel: selectedTextToolPreset.label,
    annotationLayerName,
    textAnnotationLayerName,
    activeLayerName,
    activeLayerSummaryName: activeLayerSummary?.name || null,
    defaultTextAnnotationLayerName: host.defaultTextAnnotationLayerName,
    setTextToolPresetId,
    setDrawingTextValue,
    setDrawingTextHeight,
    setDrawingTextRotation,
    setDrawingTextAlignment,
    setDrawingTextVerticalAlignment,
    setTextUsesAnnotationLayer,
    setTextAnnotationLayerName,
    setEditorNotice
  });
  const {
    openLeftPanel,
    toggleLeftPanel,
    handleLeftPanelResizeStart,
    resetLeftPanelWidth,
    handleLeftPanelResizeKeyDown,
    toggleRightPanel,
    handleRightPanelResizeStart,
    resetRightPanelWidth,
    handleRightPanelResizeKeyDown,
    resetRulerOrigin
  } = host.useCadEditorLayoutController({
    canvasAreaRef,
    menuBarRef,
    guideContextMenuRef,
    entityContextMenuRef,
    leftPanelResizeRef,
    rightPanelResizeRef,
    rulerInteractionRef,
    pendingCanvasGuideDragRef,
    leftPanelWidth,
    rightPanelWidth,
    minLeftPanelWidth: MIN_LEFT_PANEL_WIDTH,
    maxLeftPanelWidth: MAX_LEFT_PANEL_WIDTH,
    defaultLeftPanelWidth: DEFAULT_LEFT_PANEL_WIDTH,
    minRightPanelWidth: MIN_RIGHT_PANEL_WIDTH,
    maxRightPanelWidth: MAX_RIGHT_PANEL_WIDTH,
    defaultRightPanelWidth: DEFAULT_RIGHT_PANEL_WIDTH,
    defaultRulerOrigin: DEFAULT_RULER_ORIGIN,
    selectedGuideId,
    hoveredGuideId,
    guideContextMenu,
    entityContextMenu,
    guidesVisible,
    embeddedToolMode,
    rulerGuides,
    rulerGuidePreview,
    selectedEntitiesCount: selectedEntities.length,
    setActiveDock,
    setLeftPanelState,
    setLeftPanelWidth,
    setRightPanelState,
    setRightPanelWidth,
    setCanvasAreaSize,
    setRulerOrigin,
    setSelectedGuideId,
    setHoveredGuideId,
    setGuideContextMenu,
    setEntityContextMenu,
    setRulerGuidePreview,
    setMenuOpenId,
    setEditorNotice
  });
  const {
    clearSelectedEntities,
    handleViewerViewportStateChange,
    handleViewerSelectionChange,
    handleCopySelectedEntity,
    handleEditSelectedEntityNode,
    handleExtendSelectedEntity,
    handleTrimSelectedEntity,
    handleOffsetSelectedEntity,
    handleTranslateSelectedEntity,
    handleTransformSelectedEntity,
    handleEntitiesDrawn
  } = host.useCadEditorViewerController({
    currentEditorData,
    drawingLineColor,
    setUndoStack,
    setRedoStack,
    setLoadedDxfData,
    setSelectedEntities,
    setViewerSelectionOverride,
    setEditorNotice,
    setEntityContextMenu,
    setSelectedGuideId,
    setGuideContextMenu,
    setActiveLayerName,
    setViewerZoom,
    setViewerViewportState,
    resolveFunctionalLayerName
  });
  const {
    applySelectedEntityColors,
    bringSelectedEntitiesForwardOneStep,
    bringSelectedEntitiesToFront,
    clearSelectedEntityFill,
    copySelectedEntities,
    cutSelectedEntities,
    duplicateSelectedEntities,
    groupSelectedEntities,
    pasteCopiedEntities,
    removeSelectedEntities,
    sendSelectedEntitiesBackwardOneStep,
    sendSelectedEntitiesToBack,
    ungroupSelectedEntities
  } = host.useCadEditorEntityActions({
    copiedEntitiesClipboard,
    currentEditorData,
    drawingFillColor,
    drawingLineColor,
    gridSnapSize,
    majorGridStep: measurementUnitDefinition.majorGridStep,
    paintFillEnabled,
    selectedEntities,
    closeEntityContextMenu: () => setEntityContextMenu(null),
    setCopiedEntitiesClipboard,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  });
  const rulerGuideSnapVertices = useMemo(
    () => getCadGeometryVertices(currentEditorData),
    [currentEditorData]
  );
  const rulerGuideSnapSegments = useMemo(
    () => getCadEntitySegments(currentEditorData),
    [currentEditorData]
  );
  const {
    toggleGuideLocked,
    removeGuideById,
    clearSelectedGuide,
    handleCanvasAreaMouseDownCapture,
    handleCanvasAreaContextMenuCapture,
    handleCanvasAreaDoubleClickCapture,
    handleCanvasAreaClickCapture,
    handleCanvasAreaMouseMoveCapture,
    handleCanvasAreaMouseLeave,
    handleRulerCornerMouseDown,
    handleHorizontalRulerMouseDown,
    handleVerticalRulerMouseDown
  } = host.useCadEditorGuideController({
    canvasAreaRef,
    canvasAreaSize,
    viewerViewportState,
    currentEditorData,
    openedDocument,
    embeddedToolMode,
    guidesVisible,
    enableObjectSnap,
    rulerGuides,
    rulerGuidePreview,
    selectedGuideId,
    hoveredGuideId,
    selectedEntities,
    rulerGuideSnapVertices,
    rulerGuideSnapSegments,
    rulerInteractionRef,
    suppressViewerCanvasClickRef,
    pendingCanvasGuideDragRef,
    setRulerOrigin,
    setRulerGuides,
    setRulerGuidePreview,
    setSelectedGuideId,
    setHoveredGuideId,
    setGuideContextMenu,
    setEntityContextMenu,
    setSelectedEntities,
    setViewerSelectionOverride,
    setEditorNotice,
    canInteractWithEntity
  });
  const {
    handleCloseOpenedFile,
    handleCreateNewDocument,
    handleApplyMeasurementUnit,
    handleOpenLocalFile,
    handleExportEditedDxf,
    handleSaveAsEditedDxf,
    handleFileInputChange
  } = host.useCadEditorDocumentController({
    fileInputRef,
    measurementUnitLabel: measurementUnitDefinition.label,
    workspaceSizeLabel,
    currentEditorData,
    openedDocument,
    setOpenedDocument,
    setLoadedDxfData,
    setActiveLayerName,
    setSelectedEntities,
    setViewerSelectionOverride,
    setUndoStack,
    setRedoStack,
    setViewerZoom,
    setMenuOpenId,
    setEditorNotice,
    setMeasurementUnit,
    setNewDocumentWorkspaceSize,
    setGridSnapSize,
    setEnableGridSnap,
    setIsConfiguratorOpen,
    setRulerGuides,
    setRulerGuidePreview,
    setSelectedGuideId,
    setHoveredGuideId,
    setGuideContextMenu,
    suppressViewerCanvasClickRef,
    pendingCanvasGuideDragRef,
    rulerInteractionRef
  });
  const handleSaveSystemSettings = useCallback(async (nextSettings: CadEditorSettings) => {
    if (!host.saveSystemSettings) {
      setEditorNotice('O host atual nao oferece configuracoes sistemicas para o Editor CAD.');
      return;
    }

    const savedSettings = await host.saveSystemSettings(nextSettings);
    const unitPreset = host.measurementUnitOptions.find((unit) => unit.id === savedSettings.measurementUnit)
      || host.measurementUnitOptions[0];

    setMeasurementUnit(savedSettings.measurementUnit);
    setNewDocumentWorkspaceSize(savedSettings.newDocumentWorkspaceSize);

    if (unitPreset) {
      setGridSnapSize(unitPreset.defaultGridSnapSize);
      setEnableGridSnap(true);
      setEditorNotice(
        `Configuracao sistemica aplicada: ${unitPreset.label} | area-base ${savedSettings.newDocumentWorkspaceSize} ${unitPreset.shortLabel}.`
      );
    } else {
      setEditorNotice('Configuracao sistemica aplicada ao Editor CAD.');
    }

    setIsConfiguratorOpen(false);
    setMenuOpenId(null);
  }, [
    host,
    setEditorNotice,
    setEnableGridSnap,
    setGridSnapSize,
    setMenuOpenId,
    setMeasurementUnit,
    setNewDocumentWorkspaceSize
  ]);
  const textToolSessionPayload = useMemo<TextToolSessionState>(() => ({
    presetId: selectedTextToolPreset.id,
    textValue: drawingTextValue,
    height: drawingTextHeight,
    rotation: drawingTextRotation,
    alignment: drawingTextAlignment,
    verticalAlignment: drawingTextVerticalAlignment,
    textUsesAnnotationLayer,
    textAnnotationLayerName
  }), [
    drawingTextAlignment,
    drawingTextHeight,
    drawingTextRotation,
    drawingTextValue,
    drawingTextVerticalAlignment,
    selectedTextToolPreset.id,
    textAnnotationLayerName,
    textUsesAnnotationLayer
  ]);
  const cadEditorSessionPreferencesPayload = useMemo<CadEditorSessionPreferences>(() => ({
    activeDock,
    activeToolId,
    weldTolerance,
    viewerZoom,
    lastViewportCommandId,
    activeLayerName,
    annotationLayerName,
    closePointToPointShape,
    showGrid,
    showCursorCoordinates,
    guidesVisible,
    enableGridSnap,
    enableObjectSnap,
    gridSnapSize,
    drawingLineColor,
    drawingFillColor,
    paintFillEnabled,
    leftPanelState,
    leftPanelWidth,
    rightPanelState,
    rightPanelWidth,
    rulerOrigin,
    rulerGuides
  }), [
    activeDock,
    activeLayerName,
    activeToolId,
    annotationLayerName,
    closePointToPointShape,
    drawingFillColor,
    drawingLineColor,
    enableGridSnap,
    enableObjectSnap,
    guidesVisible,
    gridSnapSize,
    leftPanelState,
    leftPanelWidth,
    lastViewportCommandId,
    paintFillEnabled,
    rightPanelState,
    rightPanelWidth,
    rulerGuides,
    rulerOrigin,
    showCursorCoordinates,
    showGrid,
    viewerZoom,
    weldTolerance
  ]);
  host.usePersistence({
    textToolSessionPayload,
    sessionPreferencesPayload: cadEditorSessionPreferencesPayload
  });
  host.useCadEditorStateSync({
    layerSummaries,
    activeLayerName,
    annotationLayerName,
    textAnnotationLayerName,
    defaultAnnotationLayerName: host.defaultAnnotationLayerName,
    defaultTextAnnotationLayerName: host.defaultTextAnnotationLayerName,
    enableGridSnap,
    gridSnapSize,
    measurementUnitShortLabel: measurementUnitDefinition.shortLabel,
    measurementUnitLabel: measurementUnitDefinition.label,
    workspaceSizeLabel,
    openedDocument,
    setActiveLayerName,
    setAnnotationLayerName,
    setTextAnnotationLayerName,
    setEditorNotice
  });
  const {
    handleApplyMirrorToSelection,
    handleApplyWeldToSelection
  } = host.useCadEditorModifyController({
    currentEditorData,
    primarySelectedEntity,
    selectedEntities,
    weldAvailability,
    weldTolerance,
    setUndoStack,
    setRedoStack,
    setLoadedDxfData,
    setViewerSelectionOverride,
    setEditorNotice
  });
  const {
    activeToolLabel,
    activeToolShortcutLabel,
    activateEditorTool,
    drawingToolHint,
    editorInfoMessage
  } = host.useCadEditorToolController({
    tools: toolDefinitions,
    activeToolId,
    activeLayerName,
    activeLayerSummaryName: activeLayerSummary?.name || null,
    annotationLayerName,
    textAnnotationLayerName,
    textUsesAnnotationLayer,
    activeTextToolPresetLabel,
    drawingTextHeight,
    drawingTextRotation,
    drawingTextAlignment,
    drawingTextVerticalAlignment,
    closePointToPointShape,
    enableGridSnap,
    enableObjectSnap,
    gridSnapSize,
    openedDocumentName: openedDocument?.name || null,
    selectedEntitiesCount: selectedEntities.length,
    weldReason: weldAvailability.reason,
    openLeftPanel,
    setActiveDock,
    setActiveToolId,
    setEditorNotice
  });
  const {
    handleUndoEdit,
    handleRedoEdit,
    handleMenuAction,
    handleCommandBarAction
  } = host.useCadEditorCommandController({
    currentEditorData,
    openedDocument,
    undoStack,
    redoStack,
    setUndoStack,
    setRedoStack,
    setLoadedDxfData,
    setSelectedEntities,
    setViewerSelectionOverride,
    setEditorNotice,
    setLastViewportCommandId,
    setViewportCommand,
    setMenuOpenId,
    setIsConfiguratorOpen,
    setIsShortcutsDialogOpen,
    activateEditorTool,
    handleCreateNewDocument,
    handleOpenLocalFile,
    handleExportEditedDxf,
    handleSaveAsEditedDxf,
    handleCloseOpenedFile,
    handleApplyMeasurementUnit,
    handleApplyWeldToSelection,
    handleApplyMirrorToSelection,
    handleGroupSelectedEntities: groupSelectedEntities,
    handleUngroupSelectedEntities: ungroupSelectedEntities
  });
  host.useCadEditorKeyboardShortcuts({
    selectedGuideId,
    rulerGuides,
    rulerGuidePreview,
    selectedEntities,
    copiedEntitiesCount: copiedEntitiesClipboard.length,
    pendingCanvasGuideDragRef,
    rulerInteractionRef,
    setRulerGuides,
    setRulerGuidePreview,
    setHoveredGuideId,
    setSelectedGuideId,
    setGuideContextMenu,
    setEditorNotice,
    isShortcutsDialogOpen,
    setIsShortcutsDialogOpen,
    handleUndoEdit,
    handleRedoEdit,
    handleCreateNewDocument,
    handleOpenLocalFile,
    handleExportEditedDxf,
    handleSaveAsEditedDxf,
    handleCloseOpenedFile,
    handleMenuAction,
    clearSelectedEntities,
    cutSelectedEntities,
    copySelectedEntities,
    pasteCopiedEntities,
    bringSelectedEntitiesToFront,
    bringSelectedEntitiesForwardOneStep,
    sendSelectedEntitiesToBack,
    sendSelectedEntitiesBackwardOneStep,
    removeSelectedEntities,
    groupSelectedEntities,
    ungroupSelectedEntities
  });
  const textTargetLayerLabel = pendingTextPlacement?.layerName || (
    textUsesAnnotationLayer
      ? textAnnotationLayerName
      : (activeLayerSummary?.name || activeLayerName)
  );
  const textPointLabel = pendingTextPlacement
    ? formatPoint(pendingTextPlacement.point)
    : null;
  const suggestedLayerName = useMemo(
    () => `CAMADA_${(currentEditorData?.layers.length || 0) + 1}`.toLocaleUpperCase('pt-BR'),
    [currentEditorData]
  );
  const activeLayerOrderIndex = useMemo(
    () => currentEditorData?.layers.findIndex((layer) => layer.name === activeLayerName) ?? -1,
    [activeLayerName, currentEditorData]
  );
  const canMoveActiveLayerUp = activeLayerOrderIndex > 0;
  const canMoveActiveLayerDown = Boolean(currentEditorData && activeLayerOrderIndex >= 0 && activeLayerOrderIndex < currentEditorData.layers.length - 1);
  const {
    handleShowGridChange,
    handleShowCursorCoordinatesChange,
    handleGuidesVisibleChange,
    handleEnableGridSnapChange,
    handleEnableObjectSnapChange,
    handleActiveLayerChange,
    handleAnnotationLayerChange,
    handleClosePointToPointShapeChange,
    handleDrawingTextAlignmentChange,
    handleDrawingTextVerticalAlignmentChange,
    handleTextUsesAnnotationLayerChange,
    handleTextAnnotationLayerNameChange
  } = host.useCadEditorUiActionController({
    gridSnapSize,
    activeLayerName,
    activeLayerSummaryName: activeLayerSummary?.name || null,
    textAnnotationLayerName,
    measurementUnitOptions,
    setShowGrid,
    setShowCursorCoordinates,
    setGuidesVisible,
    setHoveredGuideId,
    setEnableGridSnap,
    setEnableObjectSnap,
    setActiveLayerName,
    setAnnotationLayerName,
    setClosePointToPointShape,
    setDrawingTextAlignment,
    setDrawingTextVerticalAlignment,
    setTextUsesAnnotationLayer,
    setTextAnnotationLayerName,
    setMeasurementUnit,
    setNewDocumentWorkspaceSize,
    setEditorNotice
  });
  const handleMoveSelectedEntitiesToLayer = useCallback((targetLayerName: string) => {
    const normalizedLayerName = targetLayerName.trim();
    if (!normalizedLayerName) {
      return;
    }

    if (!currentEditorData) {
      setEditorNotice('Abra ou crie um desenho antes de mover entidades entre camadas.');
      return;
    }

    if (selectedEntities.length === 0) {
      setEditorNotice('Selecione entidades para mover entre camadas.');
      return;
    }

    const selectedIndexes = new Set(selectedEntities.map((entity) => entity.index));
    const hasSelectionOutsideDocument = selectedEntities.some((entity) => !currentEditorData.entities[entity.index]);
    if (selectedIndexes.size === 0 || hasSelectionOutsideDocument) {
      setEditorNotice('A selecao atual nao pode ser movida porque parte dela nao existe mais no desenho.');
      return;
    }

    const nextEntities = currentEditorData.entities.map((entity, index) => (
      selectedIndexes.has(index) && entity.layer !== normalizedLayerName
        ? { ...entity, layer: normalizedLayerName }
        : entity
    ));
    const hasLayerTransfer = nextEntities.some((entity, index) => entity !== currentEditorData.entities[index]);
    if (!hasLayerTransfer) {
      setEditorNotice(
        selectedEntities.length > 1
          ? `${selectedEntities.length} entidades ja estao na camada ${normalizedLayerName}.`
          : `A entidade selecionada ja esta na camada ${normalizedLayerName}.`
      );
      return;
    }

    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);
    const nextSelectedEntities = selectedEntities
      .map((entity) => nextData.entities[entity.index] ? buildSelectedEntityInfo(nextData.entities[entity.index], entity.index) : null)
      .filter((entity): entity is ViewerSelectedEntityInfo => entity !== null);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    syncCadEditorSelection({
      selectedEntities: nextSelectedEntities,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorNotice(
      nextSelectedEntities.length > 1
        ? `${nextSelectedEntities.length} entidades movidas para a camada ${normalizedLayerName}.`
        : `Entidade movida para a camada ${normalizedLayerName}.`
    );
  }, [
    currentEditorData,
    selectedEntities,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);
  const handleLayerActionActiveChange = useCallback((nextLayerName: string) => {
    const normalizedLayerName = nextLayerName.trim();
    if (!normalizedLayerName) {
      return;
    }

    handleActiveLayerChange(normalizedLayerName);
  }, [handleActiveLayerChange]);
  const handleMoveActiveLayer = useCallback((direction: 'up' | 'down') => {
    if (!currentEditorData) {
      setEditorNotice('Abra ou crie um desenho antes de reorganizar camadas.');
      return;
    }

    const currentIndex = currentEditorData.layers.findIndex((layer) => layer.name === activeLayerName);
    if (currentIndex < 0) {
      setEditorNotice(`A camada ${activeLayerName} nao foi encontrada na pilha atual.`);
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentEditorData.layers.length) {
      setEditorNotice(
        direction === 'up'
          ? `A camada ${activeLayerName} ja esta no topo da pilha.`
          : `A camada ${activeLayerName} ja esta na base da pilha.`
      );
      return;
    }

    const nextLayers = [...currentEditorData.layers];
    const [movedLayer] = nextLayers.splice(currentIndex, 1);
    nextLayers.splice(targetIndex, 0, movedLayer);
    const layerIndexByName = new Map(nextLayers.map((layer, index) => [layer.name, index]));
    const nextEntities = [...currentEditorData.entities]
      .map((entity, index) => ({ entity, index }))
      .sort((left, right) => {
        const leftLayerIndex = layerIndexByName.get(left.entity.layer) ?? Number.MAX_SAFE_INTEGER;
        const rightLayerIndex = layerIndexByName.get(right.entity.layer) ?? Number.MAX_SAFE_INTEGER;
        if (leftLayerIndex !== rightLayerIndex) {
          return rightLayerIndex - leftLayerIndex;
        }
        return left.index - right.index;
      })
      .map(({ entity }) => entity);
    const nextData = buildUpdatedDxfData({
      ...currentEditorData,
      layers: nextLayers
    }, nextEntities);
    const selectedEntityIds = new Set(selectedEntities.map((entity) => entity.id));
    const nextSelectedEntities = nextData.entities.reduce<ViewerSelectedEntityInfo[]>((accumulator, entity, index) => {
      const entityInfo = buildSelectedEntityInfo(entity, index);
      if (selectedEntityIds.has(entityInfo.id)) {
        accumulator.push(entityInfo);
      }
      return accumulator;
    }, []);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    syncCadEditorSelection({
      selectedEntities: nextSelectedEntities,
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorNotice(
      direction === 'up'
        ? `Camada ${activeLayerName} movida para cima na pilha visual.`
        : `Camada ${activeLayerName} movida para baixo na pilha visual.`
    );
  }, [
    activeLayerName,
    currentEditorData,
    selectedEntities,
    setEditorNotice,
    setLoadedDxfData,
    setRedoStack,
    setSelectedEntities,
    setUndoStack,
    setViewerSelectionOverride
  ]);
  const handleCreateLayer = useCallback(() => {
    if (!currentEditorData) {
      setEditorNotice('Abra ou crie um desenho antes de adicionar camadas.');
      return;
    }

    setPendingLayerName(suggestedLayerName);
    setIsLayerDialogOpen(true);
  }, [currentEditorData, setEditorNotice, suggestedLayerName]);
  const handleConfirmCreateLayer = useCallback((inputValue: string) => {
    if (!currentEditorData) {
      setIsLayerDialogOpen(false);
      setPendingLayerName('');
      setEditorNotice('Abra ou crie um desenho antes de adicionar camadas.');
      return;
    }

    const nextLayerName = inputValue.trim().toLocaleUpperCase('pt-BR');
    if (!nextLayerName) {
      setIsLayerDialogOpen(false);
      setPendingLayerName('');
      return;
    }

    const alreadyExists = currentEditorData.layers.some((layer) => layer.name.localeCompare(nextLayerName, undefined, { sensitivity: 'accent' }) === 0);
    if (alreadyExists) {
      setEditorNotice(layerDialogTexts.duplicateLayerNotice({ layerName: nextLayerName }));
      return;
    }

    const nextData = buildUpdatedDxfData({
      ...currentEditorData,
      layers: [...currentEditorData.layers, { name: nextLayerName, editorCreated: true }]
    }, currentEditorData.entities);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    setActiveLayerName(nextLayerName);
    setHiddenLayerNames((current) => current.filter((layerName) => layerName !== nextLayerName));
    setIsLayerDialogOpen(false);
    setPendingLayerName('');
    setEditorNotice(`Camada ${nextLayerName} criada.`);
  }, [
    currentEditorData,
    layerDialogTexts,
    setActiveLayerName,
    setEditorNotice,
    setHiddenLayerNames,
    setIsLayerDialogOpen,
    setLoadedDxfData,
    setPendingLayerName,
    setRedoStack,
    setUndoStack
  ]);
  const handleDeleteActiveLayer = useCallback(() => {
    if (!currentEditorData) {
      setEditorNotice('Abra ou crie um desenho antes de remover camadas.');
      return;
    }

    const normalizedActiveLayer = activeLayerName.trim();
    if (!normalizedActiveLayer) {
      setEditorNotice('Selecione uma camada para remover.');
      return;
    }

    if (currentEditorData.layers.length <= 1) {
      setEditorNotice('O desenho precisa manter pelo menos uma camada.');
      return;
    }

    const entityCount = currentEditorData.entities.filter((entity) => entity.layer === normalizedActiveLayer).length;
    if (entityCount > 0) {
      setEditorNotice(`A camada ${normalizedActiveLayer} ainda possui ${entityCount} entidade(s). Mova-as antes de remover.`);
      return;
    }

    const remainingLayers = currentEditorData.layers.filter((layer) => layer.name !== normalizedActiveLayer);
    const fallbackLayerName = remainingLayers[0]?.name || host.defaultActiveLayerName;
    const nextData = buildUpdatedDxfData({
      ...currentEditorData,
      layers: remainingLayers
    }, currentEditorData.entities);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    setActiveLayerName(fallbackLayerName);
    if (annotationLayerName === normalizedActiveLayer) {
      setAnnotationLayerName(fallbackLayerName);
    }
    if (textAnnotationLayerName === normalizedActiveLayer) {
      setTextAnnotationLayerName(fallbackLayerName);
    }
    setHiddenLayerNames((current) => current.filter((layerName) => layerName !== normalizedActiveLayer));
    setEditorNotice(`Camada ${normalizedActiveLayer} removida.`);
  }, [
    activeLayerName,
    annotationLayerName,
    currentEditorData,
    host.defaultActiveLayerName,
    setActiveLayerName,
    setAnnotationLayerName,
    setEditorNotice,
    setHiddenLayerNames,
    setLoadedDxfData,
    setRedoStack,
    setTextAnnotationLayerName,
    setUndoStack,
    textAnnotationLayerName
  ]);
  const handleScanErrorsInEditor = useCallback(() => {
    if (!currentEditorData) {
      setEditorNotice('Abra ou crie um desenho antes de buscar erros.');
      return;
    }

    if (!host.scanCorrectiveIssues) {
      setEditorNotice('O scanner de erros nao esta disponivel neste editor.');
      return;
    }

    const scanSourceData = viewerData || currentEditorData;
    const nextIssues = host.scanCorrectiveIssues(scanSourceData);
    setEditorCorrectiveIssues(nextIssues);
    setEditorCorrectiveFocusLotNumber(nextIssues[0]?.lotNumber ?? null);

    if (nextIssues.length === 0) {
      setEditorNotice('Nenhum erro relevante foi localizado no scan atual.');
      return;
    }

    const highlightedLotCount = new Set(nextIssues.map((issue) => issue.lotNumber)).size;
    const primaryIssue = nextIssues.find((issue) => issue.severity === 'BLOQUEANTE') || nextIssues[0];
    setEditorNotice(
      highlightedLotCount > 1
        ? `Scanner destacou ${highlightedLotCount} lotes. Primeiro caso: lote ${primaryIssue.lotNumber} (${primaryIssue.code}) - ${primaryIssue.message}`
        : `Scanner destacou o lote ${primaryIssue.lotNumber} (${primaryIssue.code}) - ${primaryIssue.message}`
    );
  }, [currentEditorData, hiddenLayerNames, host, setEditorNotice, viewerData]);
  const handleFocusNextEditorError = useCallback(() => {
    if (editorCorrectiveIssues.length === 0) {
      setEditorNotice('Nenhuma marcacao ativa. Execute Buscar Erros primeiro.');
      return;
    }

    const lotNumbers = Array.from(new Set(editorCorrectiveIssues.map((issue) => issue.lotNumber)));
    const currentIndex = editorCorrectiveFocusLotNumber === null
      ? -1
      : lotNumbers.findIndex((lotNumber) => lotNumber === editorCorrectiveFocusLotNumber);
    const nextLotNumber = lotNumbers[(currentIndex + 1 + lotNumbers.length) % lotNumbers.length];
    setEditorCorrectiveFocusLotNumber(nextLotNumber);
    setEditorNotice(`Foco movido para o lote ${nextLotNumber}.`);
  }, [editorCorrectiveFocusLotNumber, editorCorrectiveIssues, setEditorNotice]);
  const handleClearEditorErrorHighlights = useCallback(() => {
    if (editorCorrectiveIssues.length === 0 && editorCorrectiveFocusLotNumber === null) {
      setEditorNotice('Nao ha marcacoes de erro para limpar.');
      return;
    }

    setEditorCorrectiveIssues([]);
    setEditorCorrectiveFocusLotNumber(null);
    setEditorNotice('Marcacoes do scanner removidas do desenho.');
  }, [editorCorrectiveFocusLotNumber, editorCorrectiveIssues.length, setEditorNotice]);
  const handleSavePrimaryBoundaryInEditor = useCallback(() => {
    if (!currentEditorData && !viewerData) {
      // #region debug-point G:save-primary-no-document
      sendSelectionDebug('G', 'CadEditorBase:handleSavePrimaryBoundaryInEditor', '[DEBUG] Salvar Primarias sem desenho aberto', {
        hasCurrentEditorData: Boolean(currentEditorData),
        hasViewerData: Boolean(viewerData)
      });
      // #endregion
      setEditorNotice('Abra um desenho no editor antes de salvar as Primarias.');
      return;
    }

    const { vertices, error } = primaryBoundaryValidation;
    if (error) {
      // #region debug-point H:save-primary-validation-error
      sendSelectionDebug('H', 'CadEditorBase:handleSavePrimaryBoundaryInEditor', '[DEBUG] Salvar Primarias bloqueado por validacao', {
        error,
        vertexCandidateCount: vertices.length,
        segmentAnnotationCount: editorSegmentAnnotations.length
      });
      // #endregion
      setEditorNotice(formatPrimaryBoundaryValidationMessage(error));
      return;
    }

    const nextReferencePoints = buildBoundaryReferencePoints(vertices, BASE_AREA_REFERENCE_LABEL_PREFIX);
    // #region debug-point I:save-primary-success
    sendSelectionDebug('I', 'CadEditorBase:handleSavePrimaryBoundaryInEditor', '[DEBUG] Primarias salvas no editor', {
      vertexCount: nextReferencePoints.length,
      segmentAnnotationCount: editorSegmentAnnotations.length
    });
    // #endregion
    setSavedBaseAreaReferencePoints(nextReferencePoints);
    setIsBaseAreaVisible(false);
    setEditorSelectedConfrontationTexts([]);
    setEditorSegmentAnnotations([]);
    setClearPrimarySelectionNonce((currentValue) => currentValue + 1);
    setEditorNotice(`Primarias salvas com ${nextReferencePoints.length} vertice(s) a partir de ${editorSegmentAnnotations.length} trecho(s). A selecao foi limpa e a perimetral salva ficou oculta para nao confundir o proximo passo.`);
  }, [currentEditorData, editorSegmentAnnotations.length, primaryBoundaryValidation, setEditorNotice, viewerData]);
  useEffect(() => {
    // #region debug-point J:primary-boundary-ready-prop
    sendSelectionDebug('J', 'CadEditorBase:primaryBoundaryReadyProp', '[DEBUG] Estado de primaryBoundaryReady recalculado no editor', {
      savedBaseAreaReferencePointsCount: savedBaseAreaReferencePoints.length,
      primaryBoundaryReady: savedBaseAreaReferencePoints.length > 0,
      openedDocumentName: openedDocument?.name ?? null
    });
    // #endregion
  }, [openedDocument?.name, savedBaseAreaReferencePoints.length]);
  const handleSavePartialScopeInEditor = useCallback(() => {
    if (savedBaseAreaReferencePoints.length === 0) {
      setEditorNotice('Salve as Primarias primeiro. O parcial so aparece depois da base do terreno.');
      return;
    }

    if (currentSelectedLotNumbersForTechnicalSummary.length === 0) {
      setEditorNotice('Confirme pelo menos um lote manual com Alt + Select antes de salvar o parcial.');
      return;
    }

    // #region debug-point B:save-partial-selection
    void fetch('http://127.0.0.1:7777/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: 'mixed-partial-lot-shift',
        runId: 'pre-fix',
        hypothesisId: 'B',
        location: 'CadEditorBase.tsx:handleSavePartialScopeInEditor',
        msg: '[DEBUG] Saving partial lot selections',
        data: {
          currentSelectedLotNumbersForTechnicalSummary,
          savedBaseAreaReferencePointsCount: savedBaseAreaReferencePoints.length,
          savedSelections: editorConfirmedSelections
            .filter((selection) => (
              Number.isFinite(selection.lotNumber)
              && currentSelectedLotNumbersForTechnicalSummary.includes(selection.lotNumber as number)
            ))
            .map((selection) => ({
              lotNumber: selection.lotNumber,
              polygonPointCount: selection.polygon.length,
              firstPoint: selection.polygon[0] ?? null,
              lastPoint: selection.polygon[selection.polygon.length - 1] ?? null
            }))
        },
        ts: Date.now()
      })
    }).catch(() => undefined);
    // #endregion

    const partialSelectionsToSave = editorConfirmedSelections.filter((selection) => (
        Number.isFinite(selection.lotNumber)
        && currentSelectedLotNumbersForTechnicalSummary.includes(selection.lotNumber as number)
      ));
    savedPartialSelectionLotNumbersRef.current = currentSelectedLotNumbersForTechnicalSummary;
    savedPartialSelectionsRef.current = partialSelectionsToSave;
    setSavedPartialSelectionLotNumbers(currentSelectedLotNumbersForTechnicalSummary);
    setSavedPartialSelections(partialSelectionsToSave);
    setSavedPartialReferencePoints(
      editorReferencePoints.filter((referencePoint) => !isReservedBoundaryReferencePoint(referencePoint.label))
    );
    setClearPrimarySelectionNonce((currentValue) => currentValue + 1);
    setEditorNotice(
      `Parcial salvo com ${currentSelectedLotNumbersForTechnicalSummary.length} lote(s): ${currentSelectedLotNumbersForTechnicalSummary.join(', ')}. A selecao foi limpa. Agora prossiga com ruas e confrontacoes.`
    );
  }, [
    currentSelectedLotNumbersForTechnicalSummary,
    editorConfirmedSelections,
    editorReferencePoints,
    savedBaseAreaReferencePoints.length,
    setEditorNotice
  ]);
  const handleRemoveSelectedLotsFromDrawing = useCallback(() => {
    if (!currentEditorData) {
      setEditorNotice('Abra um desenho no editor antes de remover lotes do arquivo.');
      return;
    }

    const lotSelections = selectedLotSelectionsForRemovalExperiment.filter((selection) => selection.polygon.length >= 3);
    const lotNumbers = Array.from(new Set(
      lotSelections
        .map((selection) => selection.lotNumber)
        .filter((value): value is number => Number.isFinite(value))
    )).sort((left, right) => left - right);

    if (lotSelections.length === 0 || lotNumbers.length === 0) {
      setEditorNotice('Marque os lotes com Alt + Select e, se quiser, Salve Parciais antes de remover do arquivo.');
      return;
    }

    const targetPolygons = lotSelections.map((selection) => selection.polygon);
    const lotNumberSet = new Set(lotNumbers);
    const { detectedPolygonEntries } = analyzeGeoLimitesLotDetection({
      dxfData: currentEditorData,
      manualBridgeSegments: []
    });
    const remainingLotPolygons = detectedPolygonEntries
      .filter((entry) => Number.isFinite(entry.lotNumber) && !lotNumberSet.has(entry.lotNumber as number))
      .map((entry) => entry.polygon);

    const removedEntities = currentEditorData.entities.filter((entity) => (
      doesEntityIntersectSelectedLots(entity, targetPolygons)
      && !shouldPreserveEntityForRemainingLots(entity, remainingLotPolygons)
    ));
    const nextEntities = currentEditorData.entities.filter((entity) => (
      !doesEntityIntersectSelectedLots(entity, targetPolygons)
      || shouldPreserveEntityForRemainingLots(entity, remainingLotPolygons)
    ));
    const removedCount = removedEntities.length;

    // #region debug-point S:lot-removal-decision
    sendSelectionDebug('B', 'CadEditorBase:handleRemoveSelectedLotsFromDrawing', '[DEBUG] Decisao de remocao de lotes calculada', {
      mode: technicalSummaryScopeMode,
      lotNumbers,
      lotSelections: lotSelections.map((selection, index) => ({
        index,
        lotNumber: selection.lotNumber ?? null,
        polygonVertexCount: selection.polygon.length,
        textsInside: selection.textsInside.slice(0, 8),
        polygonSample: selection.polygon.slice(0, 4)
      })),
      originalEntityCount: currentEditorData.entities.length,
      removedCount,
      keptCount: nextEntities.length,
      removedEntitySample: removedEntities.slice(0, 12).map(buildEntityRemovalDebugSummary),
      keptEntitySample: nextEntities.slice(0, 12).map(buildEntityRemovalDebugSummary)
    });
    // #endregion

    if (removedCount <= 0) {
      setEditorNotice(`Nao encontrei entidades suficientes para remover os lotes ${lotNumbers.join(', ')} do desenho atual.`);
      return;
    }

    const nextData = buildUpdatedDxfData(currentEditorData, nextEntities);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    clearCadEditorSelection({
      setSelectedEntities,
      setViewerSelectionOverride
    });
    setEditorConfirmedSelections([]);
    setSavedPartialSelections((current) => current.filter((selection) => !lotNumberSet.has(selection.lotNumber ?? -1)));
    setSavedPartialSelectionLotNumbers((current) => current.filter((lotNumber) => !lotNumberSet.has(lotNumber)));
    setSavedPartialReferencePoints([]);
    setEditorSelectedConfrontationTexts([]);
    setEditorSegmentAnnotations([]);
    setEditorReferencePoints((current) => current.filter((referencePoint) => isReservedBoundaryReferencePoint(referencePoint.label)));
    setManualReviewLotNumbers((current) => current.filter((lotNumber) => !lotNumberSet.has(lotNumber)));
    setClearPrimarySelectionNonce((currentValue) => currentValue + 1);
    setEditorCorrectiveIssues([]);
    setEditorCorrectiveFocusLotNumber(null);
    setEditorNotice(
      `Lotes ${lotNumbers.join(', ')} removidos do desenho (${removedCount} entidade(s)). A selecao foi limpa para conferencia visual do resultado.`
    );
  }, [
    currentEditorData,
    selectedLotSelectionsForRemovalExperiment,
    technicalSummaryScopeMode,
    setEditorNotice
  ]);
  const handleApplySavedPartialReplacementsInEditor = useCallback(() => {
    if (!currentEditorData) {
      setEditorNotice('Abra um desenho no editor antes de aplicar substituicoes persistentes.');
      return;
    }

    if (
      partialSelectionsForPersistentReplacement.length === 0
    ) {
      setEditorNotice('Selecione ou salve ao menos um parcial valido com Alt + Select antes de aplicar a substituicao no desenho.');
      return;
    }

    const lotNumberSet = new Set(partialLotNumbersForPersistentReplacement);
    const targetPolygons = partialSelectionsForPersistentReplacement.map((selection) => selection.polygon);
    const replacementTargetLabel = partialLotNumbersForPersistentReplacement.length > 0
      ? `lotes ${partialLotNumbersForPersistentReplacement.join(', ')}`
      : `${partialSelectionsForPersistentReplacement.length} contorno(s) parcial(is) selecionado(s)`;
    const { detectedPolygonEntries } = analyzeGeoLimitesLotDetection({
      dxfData: currentEditorData,
      manualBridgeSegments: []
    });
    const remainingLotPolygons = detectedPolygonEntries
      .filter((entry) => (
        (Number.isFinite(entry.lotNumber) && !lotNumberSet.has(entry.lotNumber as number))
        || (!Number.isFinite(entry.lotNumber) && !doesDetectedPolygonMatchSelectedScope(entry.polygon, targetPolygons))
      ))
      .map((entry) => entry.polygon);

    const removedEntities = currentEditorData.entities.filter((entity) => (
      doesEntityIntersectSelectedLots(entity, targetPolygons)
      && !shouldPreserveEntityForRemainingLots(entity, remainingLotPolygons)
    ));
    if (removedEntities.length === 0) {
      setEditorNotice(
        `Nao encontrei a geometria original de ${replacementTargetLabel} para substituir no desenho atual.`
      );
      return;
    }

    const keptEntities = currentEditorData.entities.filter((entity) => (
      isTextLikeEntity(entity)
      || !doesEntityIntersectSelectedLots(entity, targetPolygons)
      || shouldPreserveEntityForRemainingLots(entity, remainingLotPolygons)
    ));
    const replacementEntities = partialSelectionsForPersistentReplacement.flatMap((selection) => {
      const selectionRemovedGeometry = removedEntities.filter((entity) => (
        !isTextLikeEntity(entity)
        && doesEntityIntersectSelectedLots(entity, [selection.polygon])
        && !shouldPreserveEntityForRemainingLots(entity, remainingLotPolygons)
      ));
      const replacementLayerName = chooseReplacementGeometryLayerName(
        selectionRemovedGeometry,
        currentEditorData.layers.map((layer) => layer.name)
      );
      return buildPartialReplacementEntities(selection, replacementLayerName);
    });
    if (replacementEntities.length === 0) {
      setEditorNotice('Os parciais salvos nao possuem geometria suficiente para montar a substituicao persistente.');
      return;
    }

    const nextData = buildUpdatedDxfData(currentEditorData, [...keptEntities, ...replacementEntities]);

    commitCadEditorHistoryEntry({
      currentEditorData,
      nextData,
      setUndoStack,
      setRedoStack,
      setLoadedDxfData
    });
    clearCadEditorSelection({
      setSelectedEntities,
      setViewerSelectionOverride
    });
    savedPartialSelectionLotNumbersRef.current = [];
    savedPartialSelectionsRef.current = [];
    setEditorConfirmedSelections([]);
    setSavedPartialSelections([]);
    setSavedPartialSelectionLotNumbers([]);
    setSavedPartialReferencePoints([]);
    setEditorSelectedConfrontationTexts([]);
    setEditorSegmentAnnotations([]);
    setEditorReferencePoints((current) => current.filter((referencePoint) => isReservedBoundaryReferencePoint(referencePoint.label)));
    setManualReviewLotNumbers((current) => current.filter((lotNumber) => !lotNumberSet.has(lotNumber)));
    setClearPrimarySelectionNonce((currentValue) => currentValue + 1);
    setEditorCorrectiveIssues([]);
    setEditorCorrectiveFocusLotNumber(null);
    setTechnicalSummaryScopeMode('full');
    setEditorNotice(
      `Substituicao persistente aplicada em ${replacementTargetLabel}. Salve o DXF para manter o desenho corrigido nas proximas aberturas.`
    );
  }, [
    currentEditorData,
    partialLotNumbersForPersistentReplacement,
    partialSelectionsForPersistentReplacement,
    setEditorNotice
  ]);
  const handleGenerateTechnicalSummaryInEditor = useCallback(async () => {
    if (!openedDocument || !currentEditorData) {
      setEditorNotice('Abra um desenho no editor antes de gerar o Resumo Tecnico.');
      return;
    }
    if (!host.generateTechnicalSummary) {
      setEditorNotice('O host atual nao oferece geracao de Resumo Tecnico.');
      return;
    }

    setIsTechnicalSummaryDialogOpen(true);
    setIsGeneratingTechnicalSummary(true);
    setTechnicalSummaryError('');
    setTechnicalSummaryProcessingContextStatus(null);
    if (technicalSummaryOperationalNotices.length > 0) {
      setEditorNotice(technicalSummaryOperationalNotices[0]?.message || 'Revise o contexto operacional antes de prosseguir.');
    }
    if (technicalSummaryScopeMode === 'partial' && selectedLotNumbersForTechnicalSummary.length === 0) {
      setIsGeneratingTechnicalSummary(false);
      setTechnicalSummaryError('Salve ao menos um recorte manual para gerar o resumo em modo Parciais.');
      setEditorNotice('Salve ao menos um recorte manual com Alt + Select antes de gerar o Resumo Tecnico em modo Parciais.');
      return;
    }
    const mixedReplacementSelections = technicalSummaryScopeMode === 'mixed'
      ? (selectedLotSelectionsForMixedSummary.length > 0 ? selectedLotSelectionsForMixedSummary : savedPartialSelectionsRef.current)
      : [];
    const mixedReplacementLotNumbers = technicalSummaryScopeMode === 'mixed'
      ? (selectedLotNumbersForMixedSummary.length > 0 ? selectedLotNumbersForMixedSummary : savedPartialSelectionLotNumbersRef.current)
      : [];

    if (technicalSummaryScopeMode === 'mixed' && mixedReplacementSelections.length === 0) {
      setIsGeneratingTechnicalSummary(false);
      setTechnicalSummaryError('Salve ao menos um parcial antes de gerar o resumo em modo Total + Parciais.');
      setEditorNotice('Salve ao menos um parcial com Alt + Select antes de gerar o Resumo Tecnico em modo Total + Parciais.');
      return;
    }

    try {
      const summarySourceData = viewerData || currentEditorData;
      const selectedLotNumbers = selectedLotNumbersForTechnicalSummary;
      const replacementLotSelections = technicalSummaryScopeMode === 'mixed'
        ? mixedReplacementSelections
        : selectedLotSelectionsForTechnicalSummary;
      const selectedConfrontationTexts = Array.from(new Map(
        [
          ...editorConfirmedSelections.flatMap((selection) => selection.selectedConfrontationTexts),
          ...summarySelectedConfrontationTexts
        ].map((selectedText) => [
          buildConfirmedConfrontationTextKey(selectedText),
          selectedText
        ] as const)
      ).values());
      const result = await host.generateTechnicalSummary({
        dxfData: summarySourceData,
        fileName: openedDocument.name,
        selectedLotNumbers,
        selectedLotSelections: replacementLotSelections,
        manualReviewLotNumbers: effectiveManualReviewLotNumbers,
        selectedConfrontationTexts,
        referencePoints: referencePointsForSummary
      });
      setTechnicalSummaryJson(result.summaryJson);
      setTechnicalSummaryText(result.summaryText);
      setTechnicalSummaryProcessingContextStatus(
        normalizeProcessingContextStatus(result.processingContextStatus)
      );
      setTechnicalSummaryAnalyzedFileName(result.analyzedFileName || openedDocument.name);
      setEditorNotice(
        technicalSummaryOperationalNotices.length > 0
          ? technicalSummaryOperationalNotices[0]?.message || 'Resumo Tecnico gerado no Editor CAD com avisos operacionais.'
          : selectedLotNumbers.length > 0
            ? `Resumo Tecnico gerado no Editor CAD para os lotes ${selectedLotNumbers.join(', ')}.`
          : technicalSummaryScopeMode === 'mixed'
            ? `Resumo Tecnico gerado no Editor CAD com substituicao total dos lotes ${mixedReplacementLotNumbers.join(', ')} pelos parciais salvos.`
          : hiddenLayerNames.length > 0
            ? `Resumo Tecnico gerado no Editor CAD considerando apenas as camadas visiveis (${hiddenLayerNames.length} oculta(s)).`
            : 'Resumo Tecnico gerado no Editor CAD.'
      );
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Nao foi possivel gerar o Resumo Tecnico do desenho atual.';
      setTechnicalSummaryError(message);
      setTechnicalSummaryProcessingContextStatus(null);
      setEditorNotice(message);
    } finally {
      setIsGeneratingTechnicalSummary(false);
    }
  }, [
    currentEditorData,
    editorConfirmedSelections,
    hiddenLayerNames.length,
    host,
    effectiveManualReviewLotNumbers,
    openedDocument,
    selectedLotNumbersForMixedSummary,
    selectedLotSelectionsForTechnicalSummary,
    selectedLotNumbersForTechnicalSummary,
    referencePointsForSummary,
    setEditorNotice,
    summarySelectedConfrontationTexts,
    technicalSummaryOperationalNotices,
    technicalSummaryScopeMode,
    viewerData
  ]);
  const handleOpenStandardsAndTemplates = useCallback(() => {
    if (!host.openStandardsAndTemplates) {
      setEditorNotice('O host atual nao oferece acesso a Configurar Memorial.');
      return;
    }
    host.openStandardsAndTemplates();
  }, [host, setEditorNotice]);
  const handleLeftSidebarToolActivate = useCallback((toolId: string) => {
    // #region debug-point K:left-sidebar-tool-activate
    sendSelectionDebug('K', 'CadEditorBase:handleLeftSidebarToolActivate', '[DEBUG] Acionamento de ferramenta na sidebar esquerda', {
      toolId,
      savedBaseAreaReferencePointsCount: savedBaseAreaReferencePoints.length,
      currentSelectedLotNumbersForTechnicalSummaryCount: currentSelectedLotNumbersForTechnicalSummary.length
    });
    // #endregion
    if (toolId === 'save-primary-boundary') {
      if (savedBaseAreaReferencePoints.length > 0 && currentSelectedLotNumbersForTechnicalSummary.length > 0) {
        // #region debug-point L:left-sidebar-save-routed-to-partial
        sendSelectionDebug('L', 'CadEditorBase:handleLeftSidebarToolActivate', '[DEBUG] Botao salvar roteado para parcial', {
          savedBaseAreaReferencePointsCount: savedBaseAreaReferencePoints.length,
          currentSelectedLotNumbersForTechnicalSummaryCount: currentSelectedLotNumbersForTechnicalSummary.length
        });
        // #endregion
        handleSavePartialScopeInEditor();
      } else {
        // #region debug-point M:left-sidebar-save-routed-to-primary
        sendSelectionDebug('M', 'CadEditorBase:handleLeftSidebarToolActivate', '[DEBUG] Botao salvar roteado para primarias', {
          savedBaseAreaReferencePointsCount: savedBaseAreaReferencePoints.length,
          currentSelectedLotNumbersForTechnicalSummaryCount: currentSelectedLotNumbersForTechnicalSummary.length
        });
        // #endregion
        handleSavePrimaryBoundaryInEditor();
      }
      return;
    }
    if (toolId === 'technical-summary') {
      void handleGenerateTechnicalSummaryInEditor();
      return;
    }
    if (toolId === 'open-standards-templates') {
      handleOpenStandardsAndTemplates();
      return;
    }
    if (toolId === 'scan-errors') {
      handleScanErrorsInEditor();
      return;
    }
    if (toolId === 'scan-errors-next') {
      handleFocusNextEditorError();
      return;
    }
    if (toolId === 'scan-errors-clear') {
      handleClearEditorErrorHighlights();
      return;
    }

    activateEditorTool(toolId);
  }, [
    activateEditorTool,
    handleClearEditorErrorHighlights,
    handleFocusNextEditorError,
    handleGenerateTechnicalSummaryInEditor,
    handleOpenStandardsAndTemplates,
    handleSavePartialScopeInEditor,
    handleSavePrimaryBoundaryInEditor,
    handleScanErrorsInEditor,
    currentSelectedLotNumbersForTechnicalSummary.length,
    savedBaseAreaReferencePoints.length,
  ]);

  return (
    <div className="cad-editor-page cad-editor-page--studio cad-editor-page--workspace">
      <CadEditorTopBar
        fileInputRef={fileInputRef}
        menuBarRef={menuBarRef}
        menuOpenId={menuOpenId}
        menuItems={menuItems}
        commandItems={commandItems}
        menuActionsByMenu={menuActionsByMenu}
        activeZoomPresetId={activeZoomPresetId}
        backButtonLabel={topBarBackButtonLabel}
        documentLabel={topBarDocumentLabel}
        editorCommandValue={editorCommandValue}
        onFileInputChange={handleFileInputChange}
        onMenuOpenChange={setMenuOpenId}
        onMenuAction={handleMenuAction}
        onCommandBarAction={(actionId) => handleCommandBarAction(actionId, zoomPresets)}
        isCommandBarActionDisabled={isCommandBarActionDisabled}
        onNavigateBack={handleNavigateBack}
      />

      <section className="cad-editor-shell cad-editor-shell--studio">
        <Suspense fallback={<div className="cad-editor-left-sidebar" style={{ width: leftPanelWidth }} />}>
          <CadEditorLeftSidebar
            leftPanelWidth={leftPanelWidth}
            minLeftPanelWidth={MIN_LEFT_PANEL_WIDTH}
            maxLeftPanelWidth={MAX_LEFT_PANEL_WIDTH}
            title={leftSidebarTitle}
            docks={leftSidebarDocks}
            tools={effectiveLeftSidebarTools}
            activeToolId={activeToolId}
            leftPanelState={leftPanelState}
            onToolActivate={handleLeftSidebarToolActivate}
            onToggleLeftPanel={(dockId) => toggleLeftPanel(dockId as CadDockSection)}
            onLeftPanelResizeStart={handleLeftPanelResizeStart}
            onResetLeftPanelWidth={resetLeftPanelWidth}
            onLeftPanelResizeKeyDown={handleLeftPanelResizeKeyDown}
            technicalSummaryScopeMode={technicalSummaryScopeMode}
            onTechnicalSummaryScopeModeChange={handleTechnicalSummaryScopeModeChange}
            replaceableLotNumbers={partialLotNumbersForPersistentReplacement}
            replaceableSelectionCount={partialSelectionCountForPersistentReplacement}
            onApplySavedPartialReplacementsInEditor={handleApplySavedPartialReplacementsInEditor}
            removableLotNumbers={selectedLotNumbersForRemovalExperiment}
            onRemoveSelectedLotsFromDrawing={handleRemoveSelectedLotsFromDrawing}
          />
        </Suspense>

        <Suspense fallback={<div className="cad-editor-center" />}>
          <CadEditorWorkspaceCenter
            canvasAreaRef={canvasAreaRef}
            canvasAreaSize={canvasAreaSize}
            horizontalRulerTicks={horizontalRulerTicks}
            verticalRulerTicks={verticalRulerTicks}
            horizontalRulerZeroScreen={horizontalRulerZeroScreen}
            verticalRulerZeroScreen={verticalRulerZeroScreen}
            horizontalRulerGuideMarkers={horizontalRulerGuideMarkers}
            verticalRulerGuideMarkers={verticalRulerGuideMarkers}
            embeddedToolMode={embeddedToolMode}
            hoveredGuide={hoveredGuide ? { orientation: hoveredGuide.orientation, locked: hoveredGuide.locked } : null}
            onRulerCornerMouseDown={handleRulerCornerMouseDown}
            onResetRulerOrigin={resetRulerOrigin}
            onHorizontalRulerMouseDown={handleHorizontalRulerMouseDown}
            onVerticalRulerMouseDown={handleVerticalRulerMouseDown}
            onCanvasAreaMouseDownCapture={handleCanvasAreaMouseDownCapture}
            onCanvasAreaContextMenuCapture={handleCanvasAreaContextMenuCapture}
            onCanvasAreaDoubleClickCapture={handleCanvasAreaDoubleClickCapture}
            onCanvasAreaClickCapture={handleCanvasAreaClickCapture}
            onCanvasAreaMouseMoveCapture={handleCanvasAreaMouseMoveCapture}
            onCanvasAreaMouseLeave={handleCanvasAreaMouseLeave}
          >
            <div className="cad-editor-canvas-frame cad-editor-canvas-frame--studio">
              {openedDocument ? (
                <ViewerComponent
                  key={`${openedDocument.name}-${openedDocument.sizeBytes}`}
                  data={viewerData || currentEditorData || openedDocument.dxfData}
                  boundsData={currentEditorData || openedDocument.dxfData}
                  className="cad-editor-embedded-viewer"
                  embeddedMode={true}
                  embeddedToolMode={embeddedToolMode}
                  activeToolId={activeToolId}
                  drawingTextValue={drawingTextValue}
                  drawingTextHeight={drawingTextHeight}
                  drawingTextRotation={drawingTextRotation}
                  drawingTextAlignment={drawingTextAlignment}
                  drawingTextVerticalAlignment={drawingTextVerticalAlignment}
                  closePointToPointShape={closePointToPointShape}
                  annotationLayerName={annotationLayerName}
                  textAnnotationLayerName={textAnnotationLayerName}
                  textUsesAnnotationLayer={textUsesAnnotationLayer}
                  propertyLandmarks={host.propertyLandmarks}
                  viewerMode={editorCorrectiveIssues.length > 0 ? 'correct' : 'view'}
                  correctiveIssues={editorCorrectiveIssues}
                  correctiveFocusLotNumber={editorCorrectiveFocusLotNumber}
                  activeCorrectiveTool="inspect"
                  manualReviewLotNumbers={manualReviewLotNumbers}
                  showGrid={showGrid}
                  showHoverCoordinates={showCursorCoordinates}
                  enableObjectSnap={enableObjectSnap}
                  enableGridSnap={enableGridSnap}
                  gridSnapSize={gridSnapSize}
                  gridMajorStep={measurementUnitDefinition.majorGridStep}
                  minimumWorkspaceSize={openedDocument.source === 'new' ? newDocumentWorkspaceSize : undefined}
                  viewportCommand={viewportCommand}
                  activeLayerName={
                    technicalSummaryScopeMode === 'partial' || technicalSummaryScopeMode === 'exclude'
                      ? undefined
                      : activeLayerName
                  }
                  selectedEntityIdsOverride={viewerSelectionOverride}
                  clearConfrontationSelectionNonce={clearPrimarySelectionNonce}
                  overlaySegments={[...weldPreviewSegments, ...rulerGuideSegments, ...savedBoundaryOverlaySegments]}
                  overlayPoints={[...weldPreviewPoints, ...savedBoundaryOverlayPoints]}
                  snapGuides={guidesVisible ? rulerGuides : []}
                  onViewportStateChange={handleViewerViewportStateChange}
                  onEntitiesDrawn={handleEntitiesDrawn}
                  onTextPlacementRequest={({ point, layerName }) => {
                    setPendingTextPlacement({ point, layerName });
                    setIsTextDialogOpen(true);
                  }}
                  onEntityCopy={handleCopySelectedEntity}
                  onEntityEditNode={handleEditSelectedEntityNode}
                  onEntityExtend={handleExtendSelectedEntity}
                  onEntityTrim={handleTrimSelectedEntity}
                  onEntityMirror={handleApplyMirrorToSelection}
                  onEntityOffset={handleOffsetSelectedEntity}
                  onEntityWeld={handleApplyWeldToSelection}
                  weldCanApply={weldAvailability.canApply}
                  weldReason={weldAvailability.reason}
                  onEntityTranslate={handleTranslateSelectedEntity}
                  onEntityTransform={handleTransformSelectedEntity}
                  onEntitySelectionChange={handleViewerSelectionChange}
                  onConfrontationSelectionChange={handleViewerConfrontationSelectionChange}
                  onReferencePointsChange={handleViewerReferencePointsChange}
                  onPolygonConfirmed={handleViewerPolygonConfirmed}
                  onSelectionSummaryChange={handleViewerSelectionSummaryChange}
                  onManualReviewLotSelectionChange={handleManualReviewLotSelectionChange}
                  interactive={false}
                  primaryBoundaryReady={savedBaseAreaReferencePoints.length > 0}
                  allowLotSelectionWithoutPrimaryBoundary={
                    technicalSummaryScopeMode === 'exclude' || technicalSummaryScopeMode === 'partial'
                  }
                  showDetectedPolygonMeasurements={true}
                />
              ) : (
                <div className="cad-editor-empty-stage">
                  <div className="cad-editor-empty-state">
                    <strong>{emptyStateTitle}</strong>
                    <span>{emptyStateSubtitle}</span>
                    <span>{emptyStateHint}</span>
                  </div>
                  <div className="cad-editor-empty-cursor" aria-hidden="true" />
                </div>
              )}
            </div>
            <CadEditorContextMenus
              guideContextMenuGuide={guideContextMenuGuide}
              guideContextMenuStyle={guideContextMenuStyle}
              guideContextMenuRef={guideContextMenuRef}
              entityContextMenuStyle={entityContextMenuStyle}
              entityContextMenuRef={entityContextMenuRef}
              selectedEntityCount={selectedEntities.length}
              selectionEntityLabel={selectionEntityLabel}
              selectionLayerLabel={selectionLayerLabel}
              selectionPositionLabel={formatPoint(selectionPosition)}
              copiedEntitiesCount={copiedEntitiesClipboard.length}
              onToggleGuideLocked={toggleGuideLocked}
              onCloseGuideContextMenu={() => setGuideContextMenu(null)}
              onRemoveGuideById={removeGuideById}
              onClearSelectedGuide={clearSelectedGuide}
              onCutSelectedEntities={cutSelectedEntities}
              onCopySelectedEntities={copySelectedEntities}
              onPasteCopiedEntities={pasteCopiedEntities}
              onBringSelectedEntitiesForwardOneStep={bringSelectedEntitiesForwardOneStep}
              onSendSelectedEntitiesBackwardOneStep={sendSelectedEntitiesBackwardOneStep}
              onBringSelectedEntitiesToFront={bringSelectedEntitiesToFront}
              onSendSelectedEntitiesToBack={sendSelectedEntitiesToBack}
              onDuplicateSelectedEntities={duplicateSelectedEntities}
              canGroupSelection={canGroupSelection}
              canUngroupSelection={canUngroupSelection}
              onGroupSelectedEntities={groupSelectedEntities}
              onUngroupSelectedEntities={ungroupSelectedEntities}
              onRemoveSelectedEntities={removeSelectedEntities}
              onClearSelectedEntities={() => clearSelectedEntities(host.texts.clearSelectedEntitiesByContextMenuNotice)}
            />
          </CadEditorWorkspaceCenter>
        </Suspense>

        <Suspense fallback={<div className="cad-editor-right-sidebar" style={{ width: rightPanelWidth }} />}>
          <CadEditorRightSidebar
            rightPanelWidth={rightPanelWidth}
            minRightPanelWidth={MIN_RIGHT_PANEL_WIDTH}
            maxRightPanelWidth={MAX_RIGHT_PANEL_WIDTH}
            rightPanelState={rightPanelState}
            activeToolId={activeToolId}
            activeToolLabel={activeToolLabel}
            activeToolShortcutLabel={activeToolShortcutLabel}
            drawingLineColor={drawingLineColor}
            drawingFillColor={drawingFillColor}
            paintFillEnabled={paintFillEnabled}
            selectedEntities={selectedEntities}
            openedDocumentName={openedDocument?.name || ''}
            openedDocumentSizeLabel={formatBytes(openedDocument?.sizeBytes)}
            fileExtensionLabel={fileExtensionLabel}
            measurementUnitLabel={measurementUnitDefinition.label}
            measurementUnitShortLabel={measurementUnitDefinition.shortLabel}
            workspaceSizeLabel={workspaceSizeLabel}
            selectionEntityLabel={selectionEntityLabel}
            selectionLayerLabel={selectionLayerLabel}
            selectionPositionLabel={formatPoint(selectionPosition)}
            selectionLength={selectionLength ?? null}
            selectionVertexCount={selectionVertexCount ?? null}
            selectionTextLabel={selectionTextLabel}
            selectedGuide={selectedGuide}
            showGrid={showGrid}
            showCursorCoordinates={showCursorCoordinates}
            guidesVisible={guidesVisible}
            enableGridSnap={enableGridSnap}
            enableObjectSnap={enableObjectSnap}
            gridSnapSize={gridSnapSize}
            majorGridStepLabel={majorGridStepLabel}
            layerCount={currentEditorData?.layers?.length || 0}
            textEntityCount={textEntityCount}
            weldTolerance={weldTolerance}
            weldGap={weldAvailability.gap}
            weldCanApply={weldAvailability.canApply}
            weldReason={weldAvailability.reason}
            activeLayerName={activeLayerName}
            activeLayerSummaryName={activeLayerSummary?.name || ''}
            annotationLayerName={annotationLayerName}
            textAnnotationLayerName={textAnnotationLayerName}
            textUsesAnnotationLayer={textUsesAnnotationLayer}
            closePointToPointShape={closePointToPointShape}
            layerSummaries={layerSummaries}
            hiddenLayerNames={hiddenLayerNames}
            activeTextToolPresetId={activeTextToolPresetId}
            activeTextToolPresetLabel={activeTextToolPresetLabel}
            customTextToolPresetId={host.customTextToolPresetId}
            customTextToolPresetLabel={host.customTextToolPresetLabel}
            textToolPresets={host.textToolPresets}
            hasCustomTextPreset={hasCustomTextPreset}
            textPresetDeviationLabels={textPresetDeviationLabels}
            selectedTextToolPresetLabel={selectedTextToolPreset.label}
            drawingTextValue={drawingTextValue}
            drawingTextHeight={drawingTextHeight}
            drawingTextRotation={drawingTextRotation}
            drawingTextAlignment={drawingTextAlignment}
            drawingTextVerticalAlignment={drawingTextVerticalAlignment}
            textFieldModifiedMap={textFieldModifiedMap}
            drawingToolHint={drawingToolHint}
            layerPlaceholderIds={host.layerPlaceholderIds.slice(0, layerPlaceholderRows)}
            geometryEntityCount={geometryEntityCount}
            totalEntityCount={currentEditorData?.entities?.length || 0}
            topEntityTypes={topEntityTypes}
            activeLayerEntityTypes={activeLayerEntityTypes}
            selectedTypeLabels={selectedTypeLabels}
            editorInfoMessage={editorInfoMessage}
            copiedEntitiesCount={copiedEntitiesClipboard.length}
            flowSummary={rightSidebarFlowSummary}
            selectionSummary={rightSidebarSelectionSummary}
            technicalSummaryModeInfo={rightSidebarSummaryModeInfo}
            texts={rightSidebarTexts}
            onRightPanelResizeStart={handleRightPanelResizeStart}
            onResetRightPanelWidth={resetRightPanelWidth}
            onRightPanelResizeKeyDown={handleRightPanelResizeKeyDown}
            onToggleRightPanel={toggleRightPanel}
            onDrawingLineColorChange={setDrawingLineColor}
            onDrawingFillColorChange={setDrawingFillColor}
            onPaintFillEnabledChange={setPaintFillEnabled}
            onApplySelectedEntityColors={applySelectedEntityColors}
            onClearSelectedEntityFill={clearSelectedEntityFill}
            onToggleGuideLocked={toggleGuideLocked}
            onRemoveGuideById={removeGuideById}
            onClearSelectedGuide={clearSelectedGuide}
            onShowGridChange={handleShowGridChange}
            onShowCursorCoordinatesChange={handleShowCursorCoordinatesChange}
            onGuidesVisibleChange={handleGuidesVisibleChange}
            onEnableGridSnapChange={handleEnableGridSnapChange}
            onEnableObjectSnapChange={handleEnableObjectSnapChange}
            onGridSnapSizeChange={setGridSnapSize}
            onWeldToleranceChange={setWeldTolerance}
            onActiveLayerChange={handleLayerActionActiveChange}
            onMoveSelectedEntitiesToActiveLayer={() => handleMoveSelectedEntitiesToLayer(activeLayerName)}
            canMoveActiveLayerUp={canMoveActiveLayerUp}
            canMoveActiveLayerDown={canMoveActiveLayerDown}
            onMoveActiveLayerUp={() => handleMoveActiveLayer('up')}
            onMoveActiveLayerDown={() => handleMoveActiveLayer('down')}
            onLayerVisibilityChange={(layerName, visible) => {
              setHiddenLayerNames((current) => {
                const next = visible
                  ? current.filter((name) => name !== layerName)
                  : (current.includes(layerName) ? current : [...current, layerName]);
                return next;
              });
            }}
            onCreateLayer={handleCreateLayer}
            onDeleteLayer={handleDeleteActiveLayer}
            onAnnotationLayerChange={handleAnnotationLayerChange}
            onClosePointToPointShapeChange={handleClosePointToPointShapeChange}
            onApplyTextToolPreset={applyTextToolPreset}
            onRestoreSelectedTextToolPreset={restoreSelectedTextToolPreset}
            onDrawingTextValueChange={setDrawingTextValue}
            onDrawingTextHeightChange={setDrawingTextHeight}
            onDrawingTextRotationChange={setDrawingTextRotation}
            onDrawingTextAlignmentChange={handleDrawingTextAlignmentChange}
            onDrawingTextVerticalAlignmentChange={handleDrawingTextVerticalAlignmentChange}
            onTextUsesAnnotationLayerChange={handleTextUsesAnnotationLayerChange}
            onTextAnnotationLayerNameChange={handleTextAnnotationLayerNameChange}
          />
        </Suspense>
      </section>

      <CadEditorStatusBar
        documentLabel={statusDocumentLabel}
        activeToolLabel={activeToolLabel}
        activeToolShortcutLabel={activeToolShortcutLabel}
        activeLayerLabel={statusActiveLayerLabel}
        measurementUnitShortLabel={measurementUnitDefinition.shortLabel}
        viewportLabel={statusViewportLabel}
        rulerOriginLabel={rulerOriginLabel}
        editorNotice={editorNotice}
        texts={statusBarTexts}
      />
      <Suspense fallback={null}>
        <CadEditorSystemSettingsPage
          isOpen={isConfiguratorOpen}
          canManageSettings={host.canManageSystemSettings ?? false}
          measurementUnit={measurementUnit}
          newDocumentWorkspaceSize={newDocumentWorkspaceSize}
          measurementUnitOptions={host.measurementUnitOptions}
          onClose={() => setIsConfiguratorOpen(false)}
          onSave={handleSaveSystemSettings}
        />
      </Suspense>

      <CadEditorShortcutsDialog
        isOpen={isShortcutsDialogOpen}
        texts={shortcutsDialogTexts}
        onClose={() => setIsShortcutsDialogOpen(false)}
      />
      <CadEditorTechnicalSummaryDialog
        isOpen={isTechnicalSummaryDialogOpen}
        isLoading={isGeneratingTechnicalSummary}
        summaryError={technicalSummaryError}
        summaryJson={technicalSummaryJson}
        summaryText={technicalSummaryText}
        processingContextStatus={technicalSummaryProcessingContextStatus}
        analyzedFileName={technicalSummaryAnalyzedFileName}
        manualReviewLotNumbers={effectiveManualReviewLotNumbers}
        boundaryContexts={boundaryContextsForSummaryDialog}
        operationalNotices={technicalSummaryOperationalNotices}
        selectionScope={technicalSummarySelectionScope}
        TechnicalSummaryPanelComponent={host.TechnicalSummaryPanelComponent}
        onClose={() => setIsTechnicalSummaryDialogOpen(false)}
      />
      <CadEditorTextDialog
        isOpen={isTextDialogOpen}
        initialValue={drawingTextValue}
        targetLayerLabel={textTargetLayerLabel}
        pointLabel={textPointLabel}
        texts={textDialogTexts}
        onClose={() => {
          setIsTextDialogOpen(false);
          setPendingTextPlacement(null);
        }}
        onConfirm={(value) => {
          const nextTextValue = value.trim() || textDialogTexts.defaultTextValue;
          setDrawingTextValue(nextTextValue);
          setIsTextDialogOpen(false);
          if (!pendingTextPlacement) {
            setEditorNotice(host.texts.textPlacementPointNotice);
            return;
          }
          handleEntitiesDrawn({
            entities: [
              buildTextEntity(pendingTextPlacement.point, nextTextValue, pendingTextPlacement.layerName, {
                height: drawingTextHeight,
                rotation: drawingTextRotation,
                horizontalAlign: getTextHorizontalAlignCode(drawingTextAlignment || 'left'),
                verticalAlign: getTextVerticalAlignCode(drawingTextVerticalAlignment || 'baseline'),
                alignmentPoint: pendingTextPlacement.point
              })
            ],
            mode: 'text',
            notice: textDialogTexts.buildInsertedNotice({
              layerName: pendingTextPlacement.layerName,
              pointLabel: formatPoint(pendingTextPlacement.point)
            })
          });
          setPendingTextPlacement(null);
        }}
      />
      <CadEditorLayerDialog
        isOpen={isLayerDialogOpen}
        initialValue={pendingLayerName}
        texts={layerDialogTexts}
        onClose={() => {
          setIsLayerDialogOpen(false);
          setPendingLayerName('');
        }}
        onConfirm={handleConfirmCreateLayer}
      />
    </div>
  );
};

export default CadEditorBase;
