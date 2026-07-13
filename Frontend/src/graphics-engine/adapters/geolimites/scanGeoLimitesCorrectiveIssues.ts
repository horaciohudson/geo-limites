import { getSegmentGapCandidates, getVertexGapCandidates } from '@/graphics-engine/components/viewer-dxf/correctiveUtils';
import { pointToSegmentDistance } from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import { extractLotNumberFromTexts, summarizePolygonTexts } from '@/graphics-engine/components/viewer-dxf/lotSelectionUtils';
import { analyzeGeoLimitesLotDetection } from '@/graphics-engine/adapters/geolimites/useGeoLimitesLotDetection';
import { collectGeoLimitesLotTextAnchors } from '@/graphics-engine/adapters/geolimites/geoLimitesLotTextUtils';
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

const getPolygonBounds = (polygon: Point2D[]) => polygon.reduce((bounds, point) => ({
  minX: Math.min(bounds.minX, point.x),
  minY: Math.min(bounds.minY, point.y),
  maxX: Math.max(bounds.maxX, point.x),
  maxY: Math.max(bounds.maxY, point.y)
}), {
  minX: Number.POSITIVE_INFINITY,
  minY: Number.POSITIVE_INFINITY,
  maxX: Number.NEGATIVE_INFINITY,
  maxY: Number.NEGATIVE_INFINITY
});

const calculatePolygonPerimeter = (polygon: Point2D[]) => {
  if (polygon.length < 2) {
    return 0;
  }

  let perimeter = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    perimeter += calculateDistance(start, end);
  }
  return perimeter;
};

const calculateMedian = (values: number[]) => {
  const validValues = values
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);

  if (validValues.length === 0) {
    return null;
  }

  const middleIndex = Math.floor(validValues.length / 2);
  if (validValues.length % 2 === 1) {
    return validValues[middleIndex];
  }

  return (validValues[middleIndex - 1] + validValues[middleIndex]) / 2;
};

const buildPolygonInterferenceHint = (
  polygon: Point2D[],
  rawSegments: ReturnType<typeof analyzeGeoLimitesLotDetection>['rawSegments'],
  segmentMedianLength: number
) => {
  const bounds = getPolygonBounds(polygon);
  const padding = Math.max(segmentMedianLength * 0.35, 2);
  return buildLayerInterferenceHint(rawSegments, (segment) => (
    (
      segment.p1.x >= bounds.minX - padding
      && segment.p1.x <= bounds.maxX + padding
      && segment.p1.y >= bounds.minY - padding
      && segment.p1.y <= bounds.maxY + padding
    ) || (
      segment.p2.x >= bounds.minX - padding
      && segment.p2.x <= bounds.maxX + padding
      && segment.p2.y >= bounds.minY - padding
      && segment.p2.y <= bounds.maxY + padding
    )
  ));
};

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

  const polygonEntries = detectedPolygonEntries
    .map((entry) => {
      const textsInside = entry.textsInside.length > 0
        ? entry.textsInside
        : summarizePolygonTexts(entry.polygon, dxfData);
      const lotNumber = entry.lotNumber ?? extractLotNumberFromTexts(textsInside);
      if (lotNumber === null) {
        return null;
      }

      const nearestVertexGapDistance = getVertexGapCandidates(entry.polygon)[0]?.distance ?? null;
      const nearestSegmentGapDistance = getSegmentGapCandidates(entry.polygon)[0]?.distance ?? null;

      return {
        polygon: entry.polygon,
        lotNumber,
        textsInside,
        detectionSource: entry.source,
        area: entry.area,
        perimeter: calculatePolygonPerimeter(entry.polygon),
        nearestVertexGapDistance,
        nearestSegmentGapDistance
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.lotNumber - right.lotNumber);

  const polygonAreaMedian = calculateMedian(polygonEntries.map((entry) => entry.area));
  const polygonPerimeterMedian = calculateMedian(polygonEntries.map((entry) => entry.perimeter));

  const polygonEntryByLotNumber = new Map(
    polygonEntries.map((entry) => [entry.lotNumber, entry] as const)
  );
  const lotTextAnchors = collectGeoLimitesLotTextAnchors(dxfData);
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
        return {
          id: `scan-lot-${lotNumber}-contorno-aberto`,
          lotNumber,
          code: 'CONTORNO_ABERTO',
          severity: 'BLOQUEANTE',
          message: openContourHint.closestGapDistance !== null
            ? `O texto do lote foi encontrado e a geometria proxima indica contorno aberto. O menor vao estimado e ${openContourHint.closestGapDistance.toFixed(2)}. Revise o fechamento manualmente.${layerInterferenceHint ? ` ${layerInterferenceHint}` : ''}`
            : `O texto do lote foi encontrado e a geometria proxima indica contorno aberto. Revise o fechamento manualmente.${layerInterferenceHint ? ` ${layerInterferenceHint}` : ''}`,
          statusLabel: 'SCAN_MANUAL',
          detectionSource: 'anchor'
        } satisfies CorrectiveIssueView;
      }

      return {
        id: `scan-lot-${lotNumber}-contorno-nao-identificado`,
        lotNumber,
        code: 'CONTORNO_NAO_IDENTIFICADO',
        severity: 'BLOQUEANTE',
        message: `O texto do lote foi encontrado, mas o contorno nao foi materializado no scan atual. Revise a regiao do lote e feche manualmente o desenho.${layerInterferenceHint ? ` ${layerInterferenceHint}` : ''}`,
        statusLabel: 'SCAN_MANUAL',
        detectionSource: 'anchor'
      } satisfies CorrectiveIssueView;
    }

    const polygonInterferenceHint = buildPolygonInterferenceHint(polygonEntry.polygon, rawSegments, segmentMedianLength);

    if (polygonEntry.nearestVertexGapDistance !== null && polygonEntry.nearestVertexGapDistance <= 1.5) {
      return {
        id: `scan-lot-${lotNumber}-pontas-proximas`,
        lotNumber,
        code: 'PONTAS_PROXIMAS',
        severity: 'BLOQUEANTE',
        message: polygonEntry.detectionSource === 'face'
          ? `O lote foi identificado por face inferida e o scan encontrou pontas muito proximas (${polygonEntry.nearestVertexGapDistance.toFixed(2)}). Revise o fechamento manualmente antes de gerar o memorial.${polygonInterferenceHint ? ` ${polygonInterferenceHint}` : ''}`
          : `O scan encontrou pontas muito proximas (${polygonEntry.nearestVertexGapDistance.toFixed(2)}). Revise o fechamento manualmente antes de gerar o memorial.${polygonInterferenceHint ? ` ${polygonInterferenceHint}` : ''}`,
        statusLabel: 'SCAN_MANUAL',
        detectionSource: polygonEntry.detectionSource
      } satisfies CorrectiveIssueView;
    }

    if (polygonEntry.nearestSegmentGapDistance !== null && polygonEntry.nearestSegmentGapDistance <= 3) {
      return {
        id: `scan-lot-${lotNumber}-arestas-proximas`,
        lotNumber,
        code: 'ARESTAS_PROXIMAS',
        severity: 'AVISO',
        message: polygonEntry.detectionSource === 'face'
          ? `O lote foi identificado por face inferida e o scan encontrou arestas proximas (${polygonEntry.nearestSegmentGapDistance.toFixed(2)}). Vale revisar manualmente a lacuna deste lote.${polygonInterferenceHint ? ` ${polygonInterferenceHint}` : ''}`
          : `O scan encontrou arestas proximas (${polygonEntry.nearestSegmentGapDistance.toFixed(2)}). Vale revisar manualmente a lacuna deste lote.${polygonInterferenceHint ? ` ${polygonInterferenceHint}` : ''}`,
        statusLabel: 'SCAN_MANUAL',
        detectionSource: polygonEntry.detectionSource
      } satisfies CorrectiveIssueView;
    }

    if (polygonEntry.nearestVertexGapDistance !== null && polygonEntry.nearestVertexGapDistance <= 8) {
      return {
        id: `scan-lot-${lotNumber}-ajuste-local`,
        lotNumber,
        code: 'AJUSTE_LOCAL',
        severity: 'AVISO',
        message: polygonEntry.detectionSource === 'face'
          ? `O lote foi identificado por face inferida e o scan sugere ajuste local de vertice (${polygonEntry.nearestVertexGapDistance.toFixed(2)}).`
          : `O scan sugere ajuste local de vertice (${polygonEntry.nearestVertexGapDistance.toFixed(2)}). Use a correcao manual se o lote parecer desalinhado.`,
        statusLabel: 'SCAN_MANUAL',
        detectionSource: polygonEntry.detectionSource
      } satisfies CorrectiveIssueView;
    }

    const suspiciousAreaRatio = polygonAreaMedian && polygonAreaMedian > 0
      ? polygonEntry.area / polygonAreaMedian
      : null;
    const suspiciousPerimeterRatio = polygonPerimeterMedian && polygonPerimeterMedian > 0
      ? polygonEntry.perimeter / polygonPerimeterMedian
      : null;

    if (
      suspiciousAreaRatio !== null
      && suspiciousPerimeterRatio !== null
      && suspiciousAreaRatio >= 6
      && suspiciousPerimeterRatio >= 1.8
    ) {
      return {
        id: `scan-lot-${lotNumber}-contorno-fora-do-padrao`,
        lotNumber,
        code: 'CONTORNO_FORA_DO_PADRAO',
        severity: 'BLOQUEANTE',
        message: polygonEntry.detectionSource === 'direct'
          ? `O lote esta fechado no desenho, mas o contorno ficou fora do padrao do conjunto. Area ${polygonEntry.area.toFixed(2)} m2 e perimetro ${polygonEntry.perimeter.toFixed(2)} m, contra medianas aproximadas de ${polygonAreaMedian?.toFixed(2)} m2 e ${polygonPerimeterMedian?.toFixed(2)} m. Isso sugere captura de contorno maior que o lote esperado ou associacao incorreta do texto.`
          : `O lote foi inferido por face e ficou fora do padrao do conjunto. Area ${polygonEntry.area.toFixed(2)} m2 e perimetro ${polygonEntry.perimeter.toFixed(2)} m, contra medianas aproximadas de ${polygonAreaMedian?.toFixed(2)} m2 e ${polygonPerimeterMedian?.toFixed(2)} m. Revise o contorno porque ele pode ter absorvido geometria vizinha.`,
        statusLabel: 'SCAN_MANUAL',
        detectionSource: polygonEntry.detectionSource
      } satisfies CorrectiveIssueView;
    }

    if (
      suspiciousAreaRatio !== null
      && suspiciousPerimeterRatio !== null
      && suspiciousAreaRatio >= 3
      && suspiciousPerimeterRatio >= 1.35
      && (lotNumber <= 3 || lotNumber >= Math.max(...allLotNumbers) - 2)
    ) {
      return {
        id: `scan-lot-${lotNumber}-contorno-suspeito-extremo`,
        lotNumber,
        code: 'CONTORNO_SUSPEITO_EXTREMO',
        severity: 'AVISO',
        message: `O lote esta nos extremos da sequencia e ficou bem acima do padrao do conjunto. Area ${polygonEntry.area.toFixed(2)} m2 e perimetro ${polygonEntry.perimeter.toFixed(2)} m, contra medianas aproximadas de ${polygonAreaMedian?.toFixed(2)} m2 e ${polygonPerimeterMedian?.toFixed(2)} m. Vale revisar a associacao do texto e o contorno usado pelo resumo.`,
        statusLabel: 'SCAN_MANUAL',
        detectionSource: polygonEntry.detectionSource
      } satisfies CorrectiveIssueView;
    }

    return null;
  });

  return issues.filter((issue): issue is CorrectiveIssueView => issue !== null);
};
