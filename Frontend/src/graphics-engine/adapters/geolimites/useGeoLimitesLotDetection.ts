import { useMemo } from 'react';
import { extractFacesFromLines } from '@/graphics-engine/shared/polygon';
import type { DXFData, DXFEntity } from '@/graphics-engine/shared/dxf';
import { calculateDistance, calculatePolygonArea, type Point2D } from '@/graphics-engine/shared/geometry';
import { isTextLikeEntity } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import { buildPolylineSamplePoints, polylineHasBulgeVertices } from '@/graphics-engine/components/viewer-dxf/dxfGeometryUtils';
import {
  getPolygonEdges,
  isPointInPolygon,
  pointToSegmentDistance
} from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';
import { extractLotNumberFromTexts } from '@/graphics-engine/components/viewer-dxf/lotSelectionUtils';
import { resolveGeoLimitesFunctionalLayerNameFromEntity } from '@/graphics-engine/adapters/geolimites/functionalLayerUtils';
import { collectGeoLimitesLotTextAnchors, type GeoLimitesLotTextAnchor } from '@/graphics-engine/adapters/geolimites/geoLimitesLotTextUtils';

export type GeoLimitesRawSegmentSource = 'entity' | 'manual';
export type GeoLimitesDetectedPolygonSource = 'direct' | 'face';

export interface GeoLimitesRawSegment {
  id: string;
  p1: Point2D;
  p2: Point2D;
  source: GeoLimitesRawSegmentSource;
  entityLayerName?: string;
  functionalLayerName?: string;
  entityType?: string;
}

interface UseGeoLimitesLotDetectionParams {
  dxfData: DXFData | null;
  manualBridgeSegments: Array<{ p1: Point2D; p2: Point2D }>;
}

export interface GeoLimitesLotDetectionResult {
  rawSegments: GeoLimitesRawSegment[];
  detectedPolygons: Point2D[][];
  detectedPolygonEntries: Array<{
    polygon: Point2D[];
    lotNumber: number | null;
    textsInside: string[];
    lotAnchorPosition: Point2D | null;
    source: GeoLimitesDetectedPolygonSource;
    area: number;
    vertexCount: number;
  }>;
  extractionTolerance: number;
  segmentMedianLength: number;
}

const TABLE_KEYWORDS = ['vertice', 'vertice', 'azimute', 'distancia', 'distancia', 'coordenada', 'ponto', 'lado', 'rumo', 'descricao'];
const POLYGON_POINT_TOLERANCE = 0.000001;
const POLYGON_TEXT_MATCH_TOLERANCE = 1.2;

const pointsEqual = (left: Point2D, right: Point2D, tolerance = POLYGON_POINT_TOLERANCE) => (
  Math.abs(left.x - right.x) <= tolerance && Math.abs(left.y - right.y) <= tolerance
);

const normalizePolygonPoints = (points: Point2D[]): Point2D[] => {
  const normalized = points.reduce<Point2D[]>((accumulator, point) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return accumulator;
    }
    if (accumulator.length === 0 || !pointsEqual(accumulator[accumulator.length - 1], point)) {
      accumulator.push({ x: point.x, y: point.y });
    }
    return accumulator;
  }, []);

  while (normalized.length >= 2 && pointsEqual(normalized[0], normalized[normalized.length - 1])) {
    normalized.pop();
  }

  return normalized;
};

const isPointInsideOrNearPolygon = (
  point: Point2D,
  polygon: Point2D[],
  tolerance: number = POLYGON_TEXT_MATCH_TOLERANCE
) => (
  isPointInPolygon(point, polygon)
  || getPolygonEdges(polygon).some((edge) => pointToSegmentDistance(point, edge.start, edge.end) <= tolerance)
);

const summarizeTextsInsidePolygon = (polygon: Point2D[], dxfData: DXFData): string[] => dxfData.entities
  .filter((entity) => {
    if (!isTextLikeEntity(entity)) {
      return false;
    }

    const tx = entity.properties.x ?? entity.properties.alignmentX ?? entity.properties.x1;
    const ty = entity.properties.y ?? entity.properties.alignmentY ?? entity.properties.y1;
    return tx !== undefined && ty !== undefined
      ? isPointInsideOrNearPolygon({ x: tx as number, y: ty as number }, polygon)
      : false;
  })
  .map((entity) => String(entity.properties.text || '').trim())
  .filter(Boolean)
  .slice(0, 6);

const collectLotAnchorsInsidePolygon = (
  polygon: Point2D[],
  lotTextAnchors: GeoLimitesLotTextAnchor[]
) => lotTextAnchors.filter((anchor) => isPointInsideOrNearPolygon(anchor.position, polygon));

const isLotLikePolygon = (
  polygon: Point2D[],
  dxfData: DXFData,
  lotTextAnchors: GeoLimitesLotTextAnchor[]
): { textsInside: string[]; lotNumber: number | null; lotNumbersInside: number[]; lotAnchorPosition: Point2D | null } | null => {
  const area = Math.abs(calculatePolygonArea(polygon));
  if (area < 20) {
    return null;
  }

  const textsInside = summarizeTextsInsidePolygon(polygon, dxfData);
  if (textsInside.length === 0) {
    return null;
  }

  const hasLotKeyword = textsInside.some((text) => {
    const normalizedText = text.toLowerCase();
    return normalizedText.includes('lote') || normalizedText.includes('area') || normalizedText.includes('área') || normalizedText.includes('m2') || normalizedText.includes('m²') || normalizedText.includes('quadra');
  });
  if (!hasLotKeyword) {
    const isTable = textsInside.some((text) => {
      const normalizedText = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return TABLE_KEYWORDS.some((keyword) => normalizedText.includes(keyword));
    });
    if (isTable) {
      return null;
    }
  }

  const anchorsInside = collectLotAnchorsInsidePolygon(polygon, lotTextAnchors);
  const lotNumbersInside = Array.from(new Set(
    anchorsInside
      .map((anchor) => anchor.lotNumber)
      .filter((lotNumber): lotNumber is number => Number.isInteger(lotNumber) && lotNumber > 0)
  )).sort((left, right) => left - right);

  // Um lote valido nao deve englobar ainda outros numeros de lote.
  if (lotNumbersInside.length > 1) {
    return null;
  }

  return {
    textsInside,
    lotNumber: lotNumbersInside[0] ?? extractLotNumberFromTexts(textsInside),
    lotNumbersInside,
    lotAnchorPosition: anchorsInside[0]?.position ?? null
  };
};

const collectDirectClosedPolygons = (dxfData: DXFData): Point2D[][] => dxfData.entities.flatMap((entity) => {
  if ((entity.type !== 'LWPOLYLINE' && entity.type !== 'POLYLINE') || !entity.properties.closed || !Array.isArray(entity.properties.vertices)) {
    return [];
  }

  const sourcePoints = polylineHasBulgeVertices(entity.properties.vertices)
    ? buildPolylineSamplePoints(entity.properties.vertices, true)
    : entity.properties.vertices
      .filter((vertex) => Number.isFinite(vertex.x) && Number.isFinite(vertex.y))
      .map((vertex) => ({ x: vertex.x, y: vertex.y }));
  const normalized = normalizePolygonPoints(sourcePoints);
  return normalized.length >= 3 ? [normalized] : [];
});

export const analyzeGeoLimitesLotDetection = ({
  dxfData,
  manualBridgeSegments
}: UseGeoLimitesLotDetectionParams): GeoLimitesLotDetectionResult => {
  if (!dxfData) {
    return {
      rawSegments: [] as GeoLimitesRawSegment[],
      detectedPolygons: [] as Point2D[][],
      detectedPolygonEntries: [],
      extractionTolerance: 0.01,
      segmentMedianLength: 0
    };
  }

  const segments: GeoLimitesRawSegment[] = [];

  const buildSegmentId = (source: GeoLimitesRawSegmentSource, p1: Point2D, p2: Point2D): string => {
    const a = `${p1.x.toFixed(4)},${p1.y.toFixed(4)}`;
    const b = `${p2.x.toFixed(4)},${p2.y.toFixed(4)}`;
    const [left, right] = a <= b ? [a, b] : [b, a];
    return `${source}|${left}|${right}`;
  };

  const registerSegment = (
    p1: Point2D,
    p2: Point2D,
    source: GeoLimitesRawSegmentSource,
    metadata?: {
      entityLayerName?: string;
      functionalLayerName?: string;
      entityType?: string;
    }
  ) => {
    if (!Number.isFinite(p1.x) || !Number.isFinite(p1.y) || !Number.isFinite(p2.x) || !Number.isFinite(p2.y)) {
      return;
    }
    if (calculateDistance(p1, p2) <= 0.000001) {
      return;
    }
    segments.push({
      id: buildSegmentId(source, p1, p2),
      p1,
      p2,
      source,
      entityLayerName: metadata?.entityLayerName,
      functionalLayerName: metadata?.functionalLayerName,
      entityType: metadata?.entityType
    });
  };

  dxfData.entities.forEach((entity: DXFEntity) => {
    const props = entity.properties;
    const functionalLayerName = resolveGeoLimitesFunctionalLayerNameFromEntity(entity);
    const segmentMetadata = {
      entityLayerName: entity.layer,
      functionalLayerName,
      entityType: entity.type
    };
    if (entity.type === 'LINE') {
      if (props.x1 !== undefined && props.y1 !== undefined && props.x2 !== undefined && props.y2 !== undefined) {
        registerSegment(
          { x: props.x1 as number, y: props.y1 as number },
          { x: props.x2 as number, y: props.y2 as number },
          'entity',
          segmentMetadata
        );
      }
    } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
      if (props.vertices && props.vertices.length > 1) {
        const validVerts = props.vertices.filter((vertex) => vertex.x !== undefined && vertex.y !== undefined);
        for (let i = 0; i < validVerts.length - 1; i++) {
          registerSegment(
            { x: validVerts[i].x as number, y: validVerts[i].y as number },
            { x: validVerts[i + 1].x as number, y: validVerts[i + 1].y as number },
            'entity',
            segmentMetadata
          );
        }
        if (props.closed) {
          registerSegment(
            { x: validVerts[validVerts.length - 1].x as number, y: validVerts[validVerts.length - 1].y as number },
            { x: validVerts[0].x as number, y: validVerts[0].y as number },
            'entity',
            segmentMetadata
          );
        }
      }
    }
  });

  manualBridgeSegments.forEach((manualSegment) => {
    registerSegment(manualSegment.p1, manualSegment.p2, 'manual');
  });

  const rawSegments = Array.from(new Map(segments.map((segment) => [segment.id, segment])).values());
  const segmentLengths = rawSegments
    .map((segment) => calculateDistance(segment.p1, segment.p2))
    .filter((length) => Number.isFinite(length) && length > 0.000001)
    .sort((a, b) => a - b);
  const segmentMedianLength = segmentLengths.length > 0
    ? segmentLengths[Math.floor(segmentLengths.length / 2)]
    : 0;
  const extractionTolerance = Math.max(0.01, Math.min(1, segmentMedianLength * 0.02));

  const extractedFacePolygons = extractFacesFromLines(
    rawSegments.map((segment) => ({ p1: segment.p1, p2: segment.p2 })),
    extractionTolerance
  );
  const directClosedPolygons = collectDirectClosedPolygons(dxfData);
  const lotTextAnchors = collectGeoLimitesLotTextAnchors(dxfData);

  const polygonEntries = [...directClosedPolygons, ...extractedFacePolygons]
    .map((polygon, index) => {
      const normalizedPolygon = normalizePolygonPoints(polygon);
      if (normalizedPolygon.length < 3) {
        return null;
      }

      const lotInfo = isLotLikePolygon(normalizedPolygon, dxfData, lotTextAnchors);
      if (!lotInfo) {
        return null;
      }

      const polygonArea = Math.abs(calculatePolygonArea(normalizedPolygon));
      const source: GeoLimitesDetectedPolygonSource = index < directClosedPolygons.length ? 'direct' : 'face';
      const priorityKey = lotInfo.lotNumber !== null
        ? `lot:${lotInfo.lotNumber}`
        : `shape:${polygonArea.toFixed(3)}:${normalizedPolygon[0].x.toFixed(3)}:${normalizedPolygon[0].y.toFixed(3)}`;

      return {
        polygon: normalizedPolygon,
        lotNumber: lotInfo.lotNumber,
        lotNumbersInside: lotInfo.lotNumbersInside,
        textsInside: lotInfo.textsInside,
        lotAnchorPosition: lotInfo.lotAnchorPosition,
        priorityKey,
        source,
        vertexCount: normalizedPolygon.length,
        area: polygonArea
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const detectedPolygonByKey = new Map<string, (typeof polygonEntries)[number]>();
  polygonEntries.forEach((entry) => {
    const existing = detectedPolygonByKey.get(entry.priorityKey);
    if (!existing) {
      detectedPolygonByKey.set(entry.priorityKey, entry);
      return;
    }

    const entryIsDirect = entry.source === 'direct';
    const existingIsDirect = existing.source === 'direct';
    const entryHasSingleLotAnchor = entry.lotNumbersInside.length <= 1;
    const existingHasSingleLotAnchor = existing.lotNumbersInside.length <= 1;
    const entryIsBetter = (
      (entryIsDirect && !existingIsDirect)
      || (entryIsDirect === existingIsDirect && entryHasSingleLotAnchor && !existingHasSingleLotAnchor)
      || (entryIsDirect === existingIsDirect && entryHasSingleLotAnchor === existingHasSingleLotAnchor && entry.area < existing.area)
      || (entryIsDirect === existingIsDirect && entryHasSingleLotAnchor === existingHasSingleLotAnchor && Math.abs(entry.area - existing.area) <= 0.001 && entry.vertexCount > existing.vertexCount)
    );

    if (entryIsBetter) {
      detectedPolygonByKey.set(entry.priorityKey, entry);
    }
  });

  const detectedPolygons = Array.from(detectedPolygonByKey.values()).map((entry) => entry.polygon);
  const detectedPolygonEntries = Array.from(detectedPolygonByKey.values()).map((entry) => ({
    polygon: entry.polygon,
    lotNumber: entry.lotNumber,
    textsInside: entry.textsInside,
    lotAnchorPosition: entry.lotAnchorPosition,
    source: entry.source,
    area: entry.area,
    vertexCount: entry.vertexCount
  }));

  return {
    rawSegments,
    detectedPolygons,
    detectedPolygonEntries,
    extractionTolerance,
    segmentMedianLength
  };
};

export const useGeoLimitesLotDetection = ({
  dxfData,
  manualBridgeSegments
}: UseGeoLimitesLotDetectionParams) => useMemo(
  () => analyzeGeoLimitesLotDetection({ dxfData, manualBridgeSegments }),
  [dxfData, manualBridgeSegments]
);
