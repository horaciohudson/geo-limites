import { useEffect, useMemo } from 'react';
import { buildCorrectiveSnapshotData, buildSuggestedCorrectiveAction, getSegmentGapCandidates, getVertexGapCandidates, type CorrectiveIssueSeverity } from '@/graphics-engine/components/viewer-dxf/correctiveUtils';
import { extractTextPosition, isTextLikeEntity } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import { buildViewerGeoreferencingTransform, canonicalizeReferenceLabel, toFiniteNumber } from '@/graphics-engine/components/viewer-dxf/georeferencingUtils';
import { getPolygonCentroid } from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import { extractLotNumberFromTexts, summarizePolygonTexts } from '@/graphics-engine/components/viewer-dxf/lotSelectionUtils';
import { collectGeoLimitesLotTextAnchors } from '@/graphics-engine/adapters/geolimites/geoLimitesLotTextUtils';
import { analyzeGeoLimitesLotDetection } from '@/graphics-engine/adapters/geolimites/useGeoLimitesLotDetection';
import type { ConfirmedReferencePoint, HoverReferencePoint } from '@/graphics-engine/components/viewer-dxf/viewerState';
import type { DXFData } from '@/graphics-engine/shared/dxf';
import { calculatePolygonArea, findNearestPoint, type Point2D } from '@/graphics-engine/shared/geometry';
import type { CorrectiveIssueViewModel, CorrectiveLotInspectionView, PropertyLandmarkView } from '@/graphics-engine/shared/viewer-corrective';

export interface GeoLimitesCorrectiveInspectionEntry {
  lotNumber: number;
  polygonIndex: number;
  polygon: Point2D[] | null;
  centroid: Point2D | null;
  area: number | null;
  textsInside: string[];
  issueCount: number;
  severity: 'BLOQUEANTE' | 'AVISO' | null;
  detectionSource: 'direct' | 'face' | 'anchor';
  primaryIssueCode?: string | null;
  primaryIssueMessage?: string | null;
  vertexGapCandidates: ReturnType<typeof getVertexGapCandidates>;
  segmentGapCandidates: ReturnType<typeof getSegmentGapCandidates>;
}

interface UseGeoLimitesViewerIntegrationParams {
  dxfData: DXFData | null;
  geometryVertices: Point2D[];
  correctedPolygons: Point2D[][];
  propertyLandmarks?: PropertyLandmarkView[];
  correctiveIssues?: CorrectiveIssueViewModel[];
  correctiveFocusLotNumber: number | null;
  recentlyCorrectedLotNumber: number | null;
  selectedCorrectiveVertex: { polygonIndex: number; vertexIndex: number } | null;
  viewerMode: 'view' | 'correct';
  canUndoCorrectiveChange: boolean;
  canRedoCorrectiveChange: boolean;
  correctiveHistoryRevision: number;
  correctiveSnapshotFileId?: string;
  onCorrectiveSnapshotChanged?: (fileId: string | undefined, snapshotData: DXFData, referencePoints: ConfirmedReferencePoint[]) => void;
  onCorrectiveHistoryStatusChange?: (
    fileId: string | undefined,
    status: { canUndo: boolean; canRedo: boolean; revision: number }
  ) => void;
  onCorrectiveLotInspectionChange?: (
    fileId: string | undefined,
    inspection: CorrectiveLotInspectionView | null
  ) => void;
}

export const useGeoLimitesViewerIntegration = ({
  dxfData,
  geometryVertices,
  correctedPolygons,
  propertyLandmarks,
  correctiveIssues = [],
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
}: UseGeoLimitesViewerIntegrationParams) => {
  const matchedReferencePoints = useMemo<HoverReferencePoint[]>(() => {
    if (!dxfData || !propertyLandmarks || propertyLandmarks.length === 0 || geometryVertices.length === 0) {
      return [];
    }

    const anchorsByLabel = new Map<string, { rawLabel: string; x: number; y: number }>();
    for (const entity of dxfData.entities) {
      if (!isTextLikeEntity(entity)) {
        continue;
      }

      const position = extractTextPosition(entity);
      const rawText = String(entity.properties.text || '').trim();
      if (!position || !rawText) {
        continue;
      }

      const canonicalLabel = canonicalizeReferenceLabel(rawText);
      if (!canonicalLabel || anchorsByLabel.has(canonicalLabel)) {
        continue;
      }

      anchorsByLabel.set(canonicalLabel, {
        rawLabel: rawText,
        x: position.x,
        y: position.y
      });
    }

    const matchedPoints: HoverReferencePoint[] = [];

    propertyLandmarks
      .filter((landmark) => landmark && landmark.landmarkName && landmark.landmarkName.trim().length > 0)
      .forEach((landmark) => {
        const coordinateX = toFiniteNumber(landmark.coordinateX);
        const coordinateY = toFiniteNumber(landmark.coordinateY);
        if (coordinateX === null || coordinateY === null) {
          return;
        }

        const anchor = anchorsByLabel.get(canonicalizeReferenceLabel(landmark.landmarkName));
        if (!anchor) {
          return;
        }

        const snappedVertex = findNearestPoint({ x: anchor.x, y: anchor.y }, geometryVertices, Number.POSITIVE_INFINITY);
        if (!snappedVertex) {
          return;
        }

        matchedPoints.push({
          id: `REF_${anchor.rawLabel}_${snappedVertex.x.toFixed(3)}_${snappedVertex.y.toFixed(3)}`,
          label: landmark.landmarkName!.trim(),
          x: snappedVertex.x,
          y: snappedVertex.y,
          originalX: snappedVertex.x,
          originalY: snappedVertex.y,
          georeferencedX: coordinateX,
          georeferencedY: coordinateY
        });
      });

    return matchedPoints.sort((left, right) => {
      const leftOrder = propertyLandmarks.find((candidate) => candidate.landmarkName?.trim() === left.label)?.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = propertyLandmarks.find((candidate) => candidate.landmarkName?.trim() === right.label)?.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
  }, [dxfData, geometryVertices, propertyLandmarks]);

  const georeferencingTransform = useMemo(
    () => buildViewerGeoreferencingTransform(matchedReferencePoints),
    [matchedReferencePoints]
  );

  const confirmedReferencePoints = useMemo<ConfirmedReferencePoint[]>(
    () => matchedReferencePoints.map((point) => ({
      label: point.label,
      x: point.originalX,
      y: point.originalY,
      georeferencedX: point.georeferencedX,
      georeferencedY: point.georeferencedY
    })),
    [matchedReferencePoints]
  );

  const technicalSummarySnapshot = useMemo<DXFData | null>(() => {
    if (!dxfData) {
      return null;
    }

    if (viewerMode === 'correct' && correctedPolygons.length > 0) {
      return buildCorrectiveSnapshotData(dxfData, correctedPolygons);
    }

    return dxfData;
  }, [correctedPolygons, dxfData, viewerMode]);

  const correctiveFocusPolygon = useMemo(() => {
    if (!dxfData || correctiveFocusLotNumber === null) {
      return null;
    }

    return correctedPolygons.find((polygon) =>
      extractLotNumberFromTexts(summarizePolygonTexts(polygon, dxfData)) === correctiveFocusLotNumber
    ) || null;
  }, [correctedPolygons, correctiveFocusLotNumber, dxfData]);

  const correctiveFocusPolygonIndex = useMemo(() => {
    if (!dxfData || correctiveFocusLotNumber === null) {
      return -1;
    }

    return correctedPolygons.findIndex((polygon) =>
      extractLotNumberFromTexts(summarizePolygonTexts(polygon, dxfData)) === correctiveFocusLotNumber
    );
  }, [correctedPolygons, correctiveFocusLotNumber, dxfData]);

  const recentlyCorrectedPolygon = useMemo(() => {
    if (!dxfData || recentlyCorrectedLotNumber === null) {
      return null;
    }

    return correctedPolygons.find((polygon) =>
      extractLotNumberFromTexts(summarizePolygonTexts(polygon, dxfData)) === recentlyCorrectedLotNumber
    ) || null;
  }, [correctedPolygons, dxfData, recentlyCorrectedLotNumber]);

  const recentlyCorrectedPolygonCentroid = useMemo(
    () => (recentlyCorrectedPolygon ? getPolygonCentroid(recentlyCorrectedPolygon) : null),
    [recentlyCorrectedPolygon]
  );

  const correctiveLotInspectionEntries = useMemo<GeoLimitesCorrectiveInspectionEntry[]>(() => {
    if (!dxfData) {
      return [];
    }

    const detectionEntriesByLotNumber = new Map(
      analyzeGeoLimitesLotDetection({
        dxfData,
        manualBridgeSegments: []
      }).detectedPolygonEntries
        .filter((entry) => entry.lotNumber !== null)
        .map((entry) => [entry.lotNumber as number, entry] as const)
    );
    const lotTextAnchorByLotNumber = new Map(
      collectGeoLimitesLotTextAnchors(dxfData).map((anchor) => [anchor.lotNumber, anchor] as const)
    );
    const issueMap = correctiveIssues.reduce<Map<number, CorrectiveIssueViewModel[]>>((map, issue) => {
      const existing = map.get(issue.lotNumber) || [];
      existing.push(issue);
      map.set(issue.lotNumber, existing);
      return map;
    }, new Map());

    const detectedEntries: GeoLimitesCorrectiveInspectionEntry[] = [];
    correctedPolygons.forEach((polygon, polygonIndex) => {
        const textsInside = summarizePolygonTexts(polygon, dxfData);
        const lotNumber = extractLotNumberFromTexts(textsInside);
        if (lotNumber === null) {
          return;
        }

        const vertexGapCandidates = getVertexGapCandidates(polygon);
        const segmentGapCandidates = getSegmentGapCandidates(polygon);
        const issues = issueMap.get(lotNumber) || [];
        const detectionEntry = detectionEntriesByLotNumber.get(lotNumber);
        const severity: CorrectiveIssueSeverity = issues.some((issue) => issue.severity === 'BLOQUEANTE')
          ? 'BLOQUEANTE'
          : (issues.length > 0 ? 'AVISO' : null);

        detectedEntries.push({
          lotNumber,
          polygonIndex,
          polygon,
          centroid: getPolygonCentroid(polygon),
          area: Math.abs(calculatePolygonArea(polygon)),
          textsInside,
          issueCount: issues.length,
          severity,
          detectionSource: issues[0]?.detectionSource ?? detectionEntry?.source ?? 'face',
          primaryIssueCode: issues[0]?.code ?? null,
          primaryIssueMessage: issues[0]?.message ?? null,
          vertexGapCandidates,
          segmentGapCandidates
        });
      });

    const detectedLots = new Set(detectedEntries.map((entry) => entry.lotNumber));
    const missingIssueEntries = Array.from(issueMap.entries())
      .filter(([lotNumber]) => !detectedLots.has(lotNumber))
      .map(([lotNumber, issues]) => {
        const anchor = lotTextAnchorByLotNumber.get(lotNumber);
        return {
          lotNumber,
          polygonIndex: -1,
          polygon: null,
          centroid: anchor?.position ?? null,
          area: null,
          textsInside: anchor ? [anchor.sourceText] : [],
          issueCount: issues.length,
          severity: (issues.some((issue) => issue.severity === 'BLOQUEANTE') ? 'BLOQUEANTE' : 'AVISO') as Exclude<CorrectiveIssueSeverity, null>,
          detectionSource: issues[0]?.detectionSource ?? 'anchor',
          primaryIssueCode: issues[0]?.code ?? null,
          primaryIssueMessage: issues[0]?.message ?? null,
          vertexGapCandidates: [],
          segmentGapCandidates: []
        };
      });

    return [...detectedEntries, ...missingIssueEntries];
  }, [correctedPolygons, correctiveIssues, dxfData]);

  const focusedCorrectiveLotInspection = useMemo(() => {
    if (correctiveFocusLotNumber === null) {
      return null;
    }

    return correctiveLotInspectionEntries.find((entry) => entry.lotNumber === correctiveFocusLotNumber) || null;
  }, [correctiveFocusLotNumber, correctiveLotInspectionEntries]);

  const selectedCorrectiveVertexPoint = selectedCorrectiveVertex && correctiveFocusPolygon
    ? correctiveFocusPolygon[selectedCorrectiveVertex.vertexIndex] || null
    : null;

  useEffect(() => {
    if (technicalSummarySnapshot && onCorrectiveSnapshotChanged) {
      onCorrectiveSnapshotChanged(correctiveSnapshotFileId, technicalSummarySnapshot, confirmedReferencePoints);
    }
  }, [confirmedReferencePoints, correctiveSnapshotFileId, onCorrectiveSnapshotChanged, technicalSummarySnapshot]);

  useEffect(() => {
    onCorrectiveHistoryStatusChange?.(correctiveSnapshotFileId, {
      canUndo: canUndoCorrectiveChange,
      canRedo: canRedoCorrectiveChange,
      revision: correctiveHistoryRevision
    });
  }, [
    canRedoCorrectiveChange,
    canUndoCorrectiveChange,
    correctiveHistoryRevision,
    correctiveSnapshotFileId,
    onCorrectiveHistoryStatusChange
  ]);

  useEffect(() => {
    if (!onCorrectiveLotInspectionChange) {
      return;
    }

    if (!focusedCorrectiveLotInspection) {
      onCorrectiveLotInspectionChange(correctiveSnapshotFileId, null);
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

    onCorrectiveLotInspectionChange(correctiveSnapshotFileId, {
      lotNumber: focusedCorrectiveLotInspection.lotNumber,
      detected,
      area: focusedCorrectiveLotInspection.area,
      textsInside: focusedCorrectiveLotInspection.textsInside,
      issueCount: focusedCorrectiveLotInspection.issueCount,
      severity: focusedCorrectiveLotInspection.severity,
      detectionSource: focusedCorrectiveLotInspection.detectionSource,
      nearestVertexGapDistance,
      nearestSegmentGapDistance,
      suggestedTool: suggestion.tool,
      suggestionConfidence: suggestion.confidence,
      suggestionReason: suggestion.reason
    });
  }, [
    correctiveSnapshotFileId,
    focusedCorrectiveLotInspection,
    onCorrectiveLotInspectionChange
  ]);

  return {
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
  };
};
