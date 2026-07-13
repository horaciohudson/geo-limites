import { useCallback, useEffect, useRef, useState } from 'react';
import { buildSuggestedCorrectiveAction, getSegmentGapCandidates, getVertexGapCandidates } from '@/graphics-engine/components/viewer-dxf/correctiveUtils';
import { pointKey } from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import type { GeoLimitesCorrectiveInspectionEntry } from '@/graphics-engine/adapters/geolimites/useGeoLimitesViewerIntegration';
import { calculateDistance, findNearestPoint, type Point2D } from '@/graphics-engine/shared/geometry';
import type { CorrectiveDraftOperation, CorrectiveHistoryCommand, RestoredCorrectiveSnapshotView } from '@/graphics-engine/shared/viewer-corrective';

interface UseGeoLimitesCorrectiveExecutionParams {
  correctedPolygons: Point2D[][];
  setCorrectedPolygons: React.Dispatch<React.SetStateAction<Point2D[][]>>;
  setSelectedPolygons: React.Dispatch<React.SetStateAction<Point2D[][]>>;
  clearCorrectiveToolSelections: () => void;
  correctiveSnapshotFileId?: string;
  onRegisterCorrectiveDraftOperation?: (operation: CorrectiveDraftOperation) => void;
  restoredCorrectiveSnapshot?: RestoredCorrectiveSnapshotView | null;
  correctiveHistoryCommand?: CorrectiveHistoryCommand;
}

export const useGeoLimitesCorrectiveExecution = ({
  correctedPolygons,
  setCorrectedPolygons,
  setSelectedPolygons,
  clearCorrectiveToolSelections,
  correctiveSnapshotFileId,
  onRegisterCorrectiveDraftOperation,
  restoredCorrectiveSnapshot,
  correctiveHistoryCommand
}: UseGeoLimitesCorrectiveExecutionParams) => {
  const correctiveHistoryEntriesRef = useRef<Point2D[][][]>([]);
  const correctiveHistoryIndexRef = useRef(0);
  const lastUndoTokenRef = useRef(0);
  const lastRedoTokenRef = useRef(0);
  const [correctiveHistoryRevision, setCorrectiveHistoryRevision] = useState(0);

  const clonePolygons = useCallback((polygons: Point2D[][]): Point2D[][] =>
    polygons.map((polygon) => polygon.map((point) => ({ x: point.x, y: point.y }))),
  []);

  const applyCorrectivePolygons = useCallback((polygons: Point2D[][]) => {
    const clonedPolygons = clonePolygons(polygons);
    setCorrectedPolygons(clonedPolygons);
    setSelectedPolygons(clonedPolygons);
    clearCorrectiveToolSelections();
    return clonedPolygons;
  }, [clearCorrectiveToolSelections, clonePolygons, setCorrectedPolygons, setSelectedPolygons]);

  const resetCorrectiveHistory = useCallback((polygons: Point2D[][]) => {
    const clonedPolygons = applyCorrectivePolygons(polygons);
    correctiveHistoryEntriesRef.current = [clonedPolygons];
    correctiveHistoryIndexRef.current = 0;
    setCorrectiveHistoryRevision(0);
  }, [applyCorrectivePolygons]);

  const pushCorrectiveHistory = useCallback((polygons: Point2D[][]) => {
    const clonedPolygons = applyCorrectivePolygons(polygons);
    const nextEntries = [
      ...correctiveHistoryEntriesRef.current.slice(0, correctiveHistoryIndexRef.current + 1),
      clonedPolygons
    ];
    correctiveHistoryEntriesRef.current = nextEntries;
    correctiveHistoryIndexRef.current = nextEntries.length - 1;
    setCorrectiveHistoryRevision(correctiveHistoryIndexRef.current);
  }, [applyCorrectivePolygons]);

  const commitCorrectiveOperation = useCallback((updatedPolygons: Point2D[][], operation: { id: string; label: string }) => {
    const nextRevision = correctiveHistoryIndexRef.current + 1;
    pushCorrectiveHistory(updatedPolygons);
    onRegisterCorrectiveDraftOperation?.({
      id: operation.id,
      label: operation.label,
      status: 'draft',
      fileId: correctiveSnapshotFileId,
      revision: nextRevision
    });
    return nextRevision;
  }, [correctiveSnapshotFileId, onRegisterCorrectiveDraftOperation, pushCorrectiveHistory]);

  const applyJoinEndpointsCorrection = useCallback((params: {
    polygonIndex: number;
    firstIndex: number;
    secondIndex: number;
    lotNumber: number | null;
    operationId: string;
    label: string;
  }) => {
    const { polygonIndex, firstIndex, secondIndex, lotNumber, operationId, label } = params;
    if (firstIndex === secondIndex) {
      return false;
    }

    const polygon = correctedPolygons[polygonIndex];
    const firstPoint = polygon?.[firstIndex];
    const secondPoint = polygon?.[secondIndex];
    if (!polygon || !firstPoint || !secondPoint) {
      return false;
    }

    const updatedPolygons = correctedPolygons.map((currentPolygon, currentPolygonIndex) => {
      if (currentPolygonIndex !== polygonIndex) {
        return currentPolygon;
      }

      return currentPolygon.map((point, currentVertexIndex) =>
        currentVertexIndex === secondIndex
          ? { ...point, x: firstPoint.x, y: firstPoint.y }
          : point
      );
    });

    commitCorrectiveOperation(updatedPolygons, {
      id: `${operationId}-${polygonIndex}-${firstIndex}-${secondIndex}`,
      label: label || `Unir pontas do Lote ${lotNumber ?? '?'} entre os vertices ${firstIndex + 1} e ${secondIndex + 1}`
    });
    return true;
  }, [commitCorrectiveOperation, correctedPolygons]);

  const applyCloseGapGuidedCorrection = useCallback((params: {
    polygonIndex: number;
    firstIndex: number;
    secondIndex: number;
    lotNumber: number | null;
    operationId: string;
    label: string;
  }) => {
    const { polygonIndex, firstIndex, secondIndex, lotNumber, operationId, label } = params;
    if (firstIndex === secondIndex) {
      return false;
    }

    const polygon = correctedPolygons[polygonIndex];
    const firstPoint = polygon?.[firstIndex];
    const secondPoint = polygon?.[secondIndex];
    if (!polygon || !firstPoint || !secondPoint) {
      return false;
    }

    const midpoint = {
      x: (firstPoint.x + secondPoint.x) / 2,
      y: (firstPoint.y + secondPoint.y) / 2
    };
    const updatedPolygons = correctedPolygons.map((currentPolygon, currentPolygonIndex) => {
      if (currentPolygonIndex !== polygonIndex) {
        return currentPolygon;
      }

      return currentPolygon.map((point, currentVertexIndex) => {
        if (currentVertexIndex === firstIndex || currentVertexIndex === secondIndex) {
          return { ...point, x: midpoint.x, y: midpoint.y };
        }
        return point;
      });
    });

    commitCorrectiveOperation(updatedPolygons, {
      id: `${operationId}-${polygonIndex}-${firstIndex}-${secondIndex}`,
      label: label || `Fechar lacuna guiada do Lote ${lotNumber ?? '?'} entre os vertices ${firstIndex + 1} e ${secondIndex + 1}`
    });
    return true;
  }, [commitCorrectiveOperation, correctedPolygons]);

  const applyMoveVertexCorrection = useCallback((params: {
    polygonIndex: number;
    vertexIndex: number;
    targetPoint: Point2D;
    lotNumber: number | null;
    operationId: string;
    label: string;
  }) => {
    const { polygonIndex, vertexIndex, targetPoint, lotNumber, operationId, label } = params;
    const polygon = correctedPolygons[polygonIndex];
    const sourcePoint = polygon?.[vertexIndex];
    if (!polygon || !sourcePoint) {
      return false;
    }

    const updatedPolygons = correctedPolygons.map((currentPolygon, currentPolygonIndex) => {
      if (currentPolygonIndex !== polygonIndex) {
        return currentPolygon;
      }

      return currentPolygon.map((point, currentVertexIndex) =>
        currentVertexIndex === vertexIndex
          ? { ...point, x: targetPoint.x, y: targetPoint.y }
          : point
      );
    });

    commitCorrectiveOperation(updatedPolygons, {
      id: `${operationId}-${polygonIndex}-${vertexIndex}-${targetPoint.x.toFixed(3)}-${targetPoint.y.toFixed(3)}`,
      label: label || `Mover vertice do Lote ${lotNumber ?? '?'} para X ${targetPoint.x.toFixed(3)} / Y ${targetPoint.y.toFixed(3)}`
    });
    return true;
  }, [commitCorrectiveOperation, correctedPolygons]);

  const resolveSuggestedCloseGapPair = useCallback((
    polygon: Point2D[],
    segmentGapCandidate: ReturnType<typeof getSegmentGapCandidates>[number] | undefined
  ) => {
    if (!segmentGapCandidate || polygon.length < 2) {
      return null;
    }

    const firstEdgeVertexIndices = [
      segmentGapCandidate.firstEdgeIndex,
      (segmentGapCandidate.firstEdgeIndex + 1) % polygon.length
    ];
    const secondEdgeVertexIndices = [
      segmentGapCandidate.secondEdgeIndex,
      (segmentGapCandidate.secondEdgeIndex + 1) % polygon.length
    ];

    const pairs = firstEdgeVertexIndices.flatMap((firstIndex) =>
      secondEdgeVertexIndices.map((secondIndex) => ({
        firstIndex,
        secondIndex,
        distance: calculateDistance(polygon[firstIndex], polygon[secondIndex])
      }))
    );

    return pairs
      .filter((pair) => pair.firstIndex !== pair.secondIndex)
      .sort((left, right) => left.distance - right.distance)[0] || null;
  }, []);

  const resolveSuggestedMoveVertexPlan = useCallback((
    polygon: Point2D[],
    validPoints: Point2D[],
    vertexGapCandidate: ReturnType<typeof getVertexGapCandidates>[number] | undefined
  ) => {
    if (!vertexGapCandidate || polygon.length === 0) {
      return null;
    }

    const polygonVertexKeys = new Set(polygon.map((point) => pointKey(point)));
    const snapCandidates = validPoints.filter((point) => !polygonVertexKeys.has(pointKey(point)));
    if (snapCandidates.length === 0) {
      return null;
    }

    const maxSnapDistance = Math.max(12, vertexGapCandidate.distance * 2.5);
    const startTarget = findNearestPoint(vertexGapCandidate.startPoint, snapCandidates, maxSnapDistance);
    const endTarget = findNearestPoint(vertexGapCandidate.endPoint, snapCandidates, maxSnapDistance);
    const candidates = [
      startTarget ? {
        vertexIndex: vertexGapCandidate.startIndex,
        targetPoint: startTarget,
        distance: calculateDistance(vertexGapCandidate.startPoint, startTarget)
      } : null,
      endTarget ? {
        vertexIndex: vertexGapCandidate.endIndex,
        targetPoint: endTarget,
        distance: calculateDistance(vertexGapCandidate.endPoint, endTarget)
      } : null
    ].filter((candidate): candidate is { vertexIndex: number; targetPoint: Point2D; distance: number } => candidate !== null);

    return candidates.sort((left, right) => left.distance - right.distance)[0] || null;
  }, []);

  useEffect(() => {
    if (!restoredCorrectiveSnapshot || restoredCorrectiveSnapshot.polygons.length === 0) {
      return;
    }

    resetCorrectiveHistory(restoredCorrectiveSnapshot.polygons);
  }, [resetCorrectiveHistory, restoredCorrectiveSnapshot?.appliedAt, restoredCorrectiveSnapshot?.snapshotId]);

  useEffect(() => {
    const nextUndoToken = correctiveHistoryCommand?.undoToken ?? 0;
    if (nextUndoToken === lastUndoTokenRef.current) {
      return;
    }

    lastUndoTokenRef.current = nextUndoToken;
    if (correctiveHistoryIndexRef.current <= 0) {
      return;
    }

    const nextIndex = correctiveHistoryIndexRef.current - 1;
    correctiveHistoryIndexRef.current = nextIndex;
    setCorrectiveHistoryRevision(nextIndex);
    applyCorrectivePolygons(correctiveHistoryEntriesRef.current[nextIndex] || []);
  }, [applyCorrectivePolygons, correctiveHistoryCommand?.undoToken]);

  useEffect(() => {
    const nextRedoToken = correctiveHistoryCommand?.redoToken ?? 0;
    if (nextRedoToken === lastRedoTokenRef.current) {
      return;
    }

    lastRedoTokenRef.current = nextRedoToken;
    if (correctiveHistoryIndexRef.current >= correctiveHistoryEntriesRef.current.length - 1) {
      return;
    }

    const nextIndex = correctiveHistoryIndexRef.current + 1;
    correctiveHistoryIndexRef.current = nextIndex;
    setCorrectiveHistoryRevision(nextIndex);
    applyCorrectivePolygons(correctiveHistoryEntriesRef.current[nextIndex] || []);
  }, [applyCorrectivePolygons, correctiveHistoryCommand?.redoToken]);

  const applySuggestedCorrection = useCallback((params: {
    viewerMode: 'view' | 'correct';
    correctiveFocusLotNumber: number | null;
    correctiveFocusPolygon: Point2D[] | null;
    correctiveFocusPolygonIndex: number;
    focusedCorrectiveLotInspection: GeoLimitesCorrectiveInspectionEntry | null;
    validPoints: Point2D[];
  }) => {
    const {
      viewerMode,
      correctiveFocusLotNumber,
      correctiveFocusPolygon,
      correctiveFocusPolygonIndex,
      focusedCorrectiveLotInspection,
      validPoints
    } = params;

    if (
      viewerMode !== 'correct' ||
      !focusedCorrectiveLotInspection ||
      !correctiveFocusPolygon ||
      correctiveFocusPolygonIndex < 0
    ) {
      return;
    }

    const detected = focusedCorrectiveLotInspection.polygonIndex >= 0;
    const nearestVertexGapDistance = focusedCorrectiveLotInspection.vertexGapCandidates[0]?.distance ?? null;
    const nearestSegmentGapDistance = focusedCorrectiveLotInspection.segmentGapCandidates[0]?.distance ?? null;
    const suggestion = buildSuggestedCorrectiveAction({
      detected,
      nearestVertexGapDistance,
      nearestSegmentGapDistance
    });

    if (suggestion.tool === 'join-endpoints') {
      const topVertexGap = focusedCorrectiveLotInspection.vertexGapCandidates[0];
      if (topVertexGap) {
        applyJoinEndpointsCorrection({
          polygonIndex: correctiveFocusPolygonIndex,
          firstIndex: topVertexGap.startIndex,
          secondIndex: topVertexGap.endIndex,
          lotNumber: correctiveFocusLotNumber,
          operationId: 'suggestion-join-endpoints',
          label: `Aplicar sugestao automatica de unir pontas no Lote ${correctiveFocusLotNumber ?? '?'}`
        });
      }
      return;
    }

    if (suggestion.tool === 'close-gap-guided') {
      const topSegmentGap = focusedCorrectiveLotInspection.segmentGapCandidates[0];
      const pair = resolveSuggestedCloseGapPair(correctiveFocusPolygon, topSegmentGap);
      if (pair) {
        applyCloseGapGuidedCorrection({
          polygonIndex: correctiveFocusPolygonIndex,
          firstIndex: pair.firstIndex,
          secondIndex: pair.secondIndex,
          lotNumber: correctiveFocusLotNumber,
          operationId: 'suggestion-close-gap-guided',
          label: `Aplicar sugestao automatica de fechar lacuna no Lote ${correctiveFocusLotNumber ?? '?'}`
        });
      }
      return;
    }

    if (suggestion.tool === 'move-vertex') {
      const topVertexGap = focusedCorrectiveLotInspection.vertexGapCandidates[0];
      const plan = resolveSuggestedMoveVertexPlan(correctiveFocusPolygon, validPoints, topVertexGap);
      if (plan) {
        applyMoveVertexCorrection({
          polygonIndex: correctiveFocusPolygonIndex,
          vertexIndex: plan.vertexIndex,
          targetPoint: plan.targetPoint,
          lotNumber: correctiveFocusLotNumber,
          operationId: 'suggestion-move-vertex',
          label: `Aplicar sugestao automatica de mover vertice no Lote ${correctiveFocusLotNumber ?? '?'}`
        });
      }
      return;
    }

    clearCorrectiveToolSelections();
  }, [
    applyCloseGapGuidedCorrection,
    applyJoinEndpointsCorrection,
    applyMoveVertexCorrection,
    clearCorrectiveToolSelections,
    resolveSuggestedCloseGapPair,
    resolveSuggestedMoveVertexPlan
  ]);

  return {
    correctiveHistoryRevision,
    canUndoCorrectiveChange: correctiveHistoryIndexRef.current > 0,
    canRedoCorrectiveChange: correctiveHistoryIndexRef.current < correctiveHistoryEntriesRef.current.length - 1,
    resetCorrectiveHistory,
    applyJoinEndpointsCorrection,
    applyCloseGapGuidedCorrection,
    applyMoveVertexCorrection,
    applySuggestedCorrection
  };
};
