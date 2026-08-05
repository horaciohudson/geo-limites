import { pointToSegmentDistance } from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import { extractLotNumberFromTexts, summarizePolygonTexts } from '@/graphics-engine/components/viewer-dxf/lotSelectionUtils';
import { analyzeGeoLimitesLotDetection } from '@/graphics-engine/adapters/geolimites/useGeoLimitesLotDetection';
import { collectPrimaryGeoLimitesLotTextAnchors } from '@/graphics-engine/adapters/geolimites/geoLimitesLotTextUtils';
import type { DXFData } from '@/graphics-engine/shared/dxf';
import { calculateDistance, type Point2D } from '@/graphics-engine/shared/geometry';
import type { CorrectiveIssueView } from '@/utils/viewerCorrective';
import { GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM } from '@/graphics-engine/adapters/geolimites/functionalLayerUtils';

const buildPointKey = (point: Point2D, tolerance: number) => (
  `${Math.round(point.x / tolerance)}:${Math.round(point.y / tolerance)}`
);

const analyzeOpenContourNearAnchor = (
  anchorPoint: Point2D,
  rawSegments: ReturnType<typeof analyzeGeoLimitesLotDetection>['rawSegments'],
  segmentMedianLength: number,
  extractionTolerance: number
) => {
  const searchRadius = Math.max(segmentMedianLength * 2.5, 18);
  const nearbySegments = rawSegments.filter((segment) => (
    pointToSegmentDistance(anchorPoint, segment.p1, segment.p2) <= searchRadius
  ));

  if (nearbySegments.length === 0) {
    return {
      nearbySegmentsCount: 0,
      openNodeCount: 0,
      closestGapDistance: null as number | null
    };
  }

  const degreeByNode = new Map<string, { point: Point2D; degree: number }>();
  const tolerance = Math.max(extractionTolerance * 2, 0.5);
  const bumpNodeDegree = (point: Point2D) => {
    const key = buildPointKey(point, tolerance);
    const existing = degreeByNode.get(key);
    if (existing) {
      degreeByNode.set(key, { point: existing.point, degree: existing.degree + 1 });
      return;
    }

    degreeByNode.set(key, { point, degree: 1 });
  };

  nearbySegments.forEach((segment) => {
    bumpNodeDegree(segment.p1);
    bumpNodeDegree(segment.p2);
  });

  const openNodes = Array.from(degreeByNode.values())
    .filter((entry) => entry.degree === 1)
    .map((entry) => entry.point);

  let closestGapDistance: number | null = null;
  for (let i = 0; i < openNodes.length; i += 1) {
    for (let j = i + 1; j < openNodes.length; j += 1) {
      const gapDistance = calculateDistance(openNodes[i], openNodes[j]);
      if (closestGapDistance === null || gapDistance < closestGapDistance) {
        closestGapDistance = gapDistance;
      }
    }
  }

  return {
    nearbySegmentsCount: nearbySegments.length,
    openNodeCount: openNodes.length,
    closestGapDistance
  };
};

const buildLayerInterferenceHint = (
  rawSegments: ReturnType<typeof analyzeGeoLimitesLotDetection>['rawSegments'],
  isNearby: (segment: ReturnType<typeof analyzeGeoLimitesLotDetection>['rawSegments'][number]) => boolean
) => {
  const suspiciousSegments = rawSegments.filter((segment) => (
    segment.source === 'entity'
    && isNearby(segment)
    && segment.functionalLayerName
    && segment.functionalLayerName !== GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM
  ));
  if (suspiciousSegments.length === 0) {
    return null;
  }

  const functionalLayerCounts = new Map<string, number>();
  const originalLayerCounts = new Map<string, number>();
  suspiciousSegments.forEach((segment) => {
    const functionalLayerName = segment.functionalLayerName?.trim();
    if (functionalLayerName) {
      functionalLayerCounts.set(functionalLayerName, (functionalLayerCounts.get(functionalLayerName) || 0) + 1);
    }
    const originalLayerName = segment.entityLayerName?.trim();
    if (originalLayerName) {
      originalLayerCounts.set(originalLayerName, (originalLayerCounts.get(originalLayerName) || 0) + 1);
    }
  });

  const functionalLayerSummary = Array.from(functionalLayerCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([layerName, count]) => `${layerName} (${count})`)
    .join(', ');
  const originalLayerSummary = Array.from(originalLayerCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([layerName, count]) => `${layerName} (${count})`)
    .join(', ');

  return `Ha segmentos proximos vindos de outras camadas funcionais: ${functionalLayerSummary}.${originalLayerSummary ? ` Camadas DXF suspeitas: ${originalLayerSummary}.` : ''}`;
};

const buildIssueMessage = (baseMessage: string, extraHint?: string | null) => (
  extraHint ? `${baseMessage} ${extraHint}` : baseMessage
);

const getOpenContourBlockingGapLimit = (
  extractionTolerance: number,
  segmentMedianLength: number
) => Math.max(extractionTolerance * 120, Math.min(Math.max(segmentMedianLength * 0.08, 0.8), 2.5));

export const scanGeoLimitesCorrectiveIssues = (dxfData: DXFData | null | undefined): CorrectiveIssueView[] => {
  if (!dxfData) {
    return [];
  }

  const {
    detectedPolygonEntries,
    rawSegments,
    segmentMedianLength,
    extractionTolerance
  } = analyzeGeoLimitesLotDetection({
    dxfData,
    manualBridgeSegments: []
  });
  const lotTextAnchors = collectPrimaryGeoLimitesLotTextAnchors(dxfData);
  const primaryLotNumberSet = new Set(lotTextAnchors.map((anchor) => anchor.lotNumber));

  const polygonEntries = detectedPolygonEntries
    .map((entry) => {
      const textsInside = entry.textsInside.length > 0
        ? entry.textsInside
        : summarizePolygonTexts(entry.polygon, dxfData);
      const lotNumber = entry.lotNumber ?? extractLotNumberFromTexts(textsInside);
      if (lotNumber === null) {
        return null;
      }
      if (primaryLotNumberSet.size > 0 && !primaryLotNumberSet.has(lotNumber)) {
        return null;
      }

      return {
        polygon: entry.polygon,
        lotNumber,
        textsInside,
        detectionSource: entry.source
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.lotNumber - right.lotNumber);

  const polygonEntryByLotNumber = new Map(
    polygonEntries.map((entry) => [entry.lotNumber, entry] as const)
  );
  const lotTextAnchorByLotNumber = new Map(
    lotTextAnchors.map((anchor) => [anchor.lotNumber, anchor] as const)
  );
  const allLotNumbers = Array.from(
    new Set([
      ...polygonEntries.map((entry) => entry.lotNumber),
      ...lotTextAnchors.map((anchor) => anchor.lotNumber)
    ])
  ).sort((left, right) => left - right);

  const issues: Array<CorrectiveIssueView | null> = allLotNumbers.map((lotNumber) => {
    const polygonEntry = polygonEntryByLotNumber.get(lotNumber);

    if (!polygonEntry) {
      const lotTextAnchor = lotTextAnchorByLotNumber.get(lotNumber);
      const openContourHint = lotTextAnchor
        ? analyzeOpenContourNearAnchor(lotTextAnchor.position, rawSegments, segmentMedianLength, extractionTolerance)
        : null;
      const layerInterferenceHint = lotTextAnchor
        ? buildLayerInterferenceHint(
            rawSegments,
            (segment) => pointToSegmentDistance(lotTextAnchor.position, segment.p1, segment.p2) <= Math.max(segmentMedianLength * 2.5, 18)
          )
        : null;

      if (openContourHint && openContourHint.nearbySegmentsCount > 0) {
        const blockingGapLimit = getOpenContourBlockingGapLimit(extractionTolerance, segmentMedianLength);
        const isLikelyBlockingGap = openContourHint.openNodeCount >= 2
          && openContourHint.openNodeCount <= 6
          && openContourHint.closestGapDistance !== null
          && openContourHint.closestGapDistance <= blockingGapLimit;
        const severity = isLikelyBlockingGap ? 'BLOQUEANTE' : 'AVISO';
        return {
          id: `scan-lot-${lotNumber}-contorno-aberto`,
          lotNumber,
          code: 'CONTORNO_ABERTO',
          severity,
          message: openContourHint.closestGapDistance !== null
            ? buildIssueMessage(
                isLikelyBlockingGap
                  ? `O texto do lote foi encontrado e a geometria proxima indica contorno aberto. O menor vao estimado e ${openContourHint.closestGapDistance.toFixed(2)}. Feche essa lacuna antes de seguir.`
                  : `O texto do lote foi encontrado e a geometria proxima indica contorno aberto. O menor vao estimado e ${openContourHint.closestGapDistance.toFixed(2)}. Vale revisar o fechamento manualmente.`,
                layerInterferenceHint
              )
            : buildIssueMessage(
                'O texto do lote foi encontrado e a geometria proxima indica contorno aberto. Vale revisar o fechamento manualmente.',
                layerInterferenceHint
              ),
          statusLabel: 'SCAN_MANUAL',
          detectionSource: 'anchor'
        } satisfies CorrectiveIssueView;
      }

      return {
        id: `scan-lot-${lotNumber}-contorno-nao-identificado`,
        lotNumber,
        code: 'CONTORNO_NAO_IDENTIFICADO',
        severity: 'AVISO',
        message: buildIssueMessage(
          'O texto do lote foi encontrado, mas o contorno nao foi materializado no scan atual. Revise a regiao do lote antes de concluir o desenho.',
          layerInterferenceHint
        ),
        statusLabel: 'SCAN_MANUAL',
        detectionSource: 'anchor'
      } satisfies CorrectiveIssueView;
    }

    return null;
  });

  return issues.filter((issue): issue is CorrectiveIssueView => issue !== null);
};
