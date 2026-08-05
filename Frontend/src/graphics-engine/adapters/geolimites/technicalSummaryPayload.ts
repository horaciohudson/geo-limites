import { analyzeGeoLimitesLotDetection } from '@/graphics-engine/adapters/geolimites/useGeoLimitesLotDetection';
import type { DXFData, DXFVertex } from '@/graphics-engine/shared/dxf';
import { serializeMemorialEntities } from '@/utils/memorialPayload';
import { collectGeoLimitesLotTextAnchors } from '@/graphics-engine/adapters/geolimites/geoLimitesLotTextUtils';

const SYNTHETIC_LOT_LAYER = '__RESUMO_TECNICO_LOTES_DETECTADOS__';
const POLYGON_SIGNATURE_DECIMALS = 4;

export interface TechnicalSummarySelectedLotShape {
  lotNumber: number;
  polygon: Array<{ x: number; y: number }>;
}

const roundCoordinate = (value: number) => value.toFixed(POLYGON_SIGNATURE_DECIMALS);

const stripClosingVertex = (vertices: DXFVertex[]): DXFVertex[] => {
  if (vertices.length < 2) {
    return vertices;
  }

  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  if (first && last && first.x === last.x && first.y === last.y) {
    return vertices.slice(0, -1);
  }

  return vertices;
};

const rotateKeys = (keys: string[], startIndex: number) => [
  ...keys.slice(startIndex),
  ...keys.slice(0, startIndex)
];

const buildCanonicalRotation = (keys: string[]) => {
  if (keys.length === 0) {
    return '';
  }

  let best = rotateKeys(keys, 0).join('|');
  for (let index = 1; index < keys.length; index += 1) {
    const candidate = rotateKeys(keys, index).join('|');
    if (candidate < best) {
      best = candidate;
    }
  }
  return best;
};

const buildPolygonSignature = (vertices: DXFVertex[] | undefined | null) => {
  if (!vertices || vertices.length < 3) {
    return null;
  }

  const normalizedVertices = stripClosingVertex(vertices);
  if (normalizedVertices.length < 3) {
    return null;
  }

  const forwardKeys = normalizedVertices.map(
    (vertex) => `${roundCoordinate(vertex.x)},${roundCoordinate(vertex.y)}`
  );
  const reverseKeys = [...forwardKeys].reverse();

  const forwardSignature = buildCanonicalRotation(forwardKeys);
  const reverseSignature = buildCanonicalRotation(reverseKeys);

  return forwardSignature < reverseSignature ? forwardSignature : reverseSignature;
};

const toClosedVertices = (polygon: Array<{ x: number; y: number }>): DXFVertex[] => {
  if (polygon.length === 0) {
    return [];
  }

  const vertices = polygon.map((point) => ({ x: point.x, y: point.y }));
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  if (first && last && (first.x !== last.x || first.y !== last.y)) {
    vertices.push({ x: first.x, y: first.y });
  }
  return vertices;
};

const collectDetectedPolygonLotNumbers = (sourceDxfData?: DXFData | null): number[] => {
  if (!sourceDxfData) {
    return [];
  }

  return Array.from(new Set(
    collectGeoLimitesLotTextAnchors(sourceDxfData)
      .map((anchor) => anchor.lotNumber)
      .filter((lotNumber): lotNumber is number => Number.isInteger(lotNumber) && lotNumber > 0)
  )).sort((left, right) => left - right);
};

export const collectGeoLimitesDetectedLotNumbers = (sourceDxfData?: DXFData | null) =>
  collectDetectedPolygonLotNumbers(sourceDxfData);

const isClosedPolylineEntity = (entity: Record<string, unknown>) => {
  if (entity.type !== 'LWPOLYLINE' && entity.type !== 'POLYLINE') {
    return false;
  }

  const properties = entity.properties as Record<string, unknown> | undefined;
  if (properties?.closed === true) {
    return true;
  }

  const vertices = entity.vertices as DXFVertex[] | undefined;
  if (!vertices || vertices.length < 3) {
    return false;
  }

  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  return Boolean(first && last && first.x === last.x && first.y === last.y);
};

const buildSelectedLotSyntheticEntities = (selectedLotShapes: TechnicalSummarySelectedLotShape[]) => (
  selectedLotShapes.reduce<Array<Record<string, unknown>>>((acc, selection, index) => {
    const vertices = toClosedVertices(selection.polygon);
    if (vertices.length < 4) {
      return acc;
    }

    acc.push({
      type: 'LWPOLYLINE',
      layer: SYNTHETIC_LOT_LAYER,
      x: vertices[0]?.x,
      y: vertices[0]?.y,
      vertices,
      properties: {
        closed: true,
        syntheticTechnicalSummaryLot: true,
        selectedTechnicalSummaryLot: true,
        syntheticLotSource: 'selected-partial',
        technicalSummaryLotNumberHint: selection.lotNumber,
        technicalSummaryLotSource: 'selected-partial',
        syntheticLotIndex: index,
        vertices
      }
    });
    return acc;
  }, [])
);

export const buildGeoLimitesTechnicalSummaryEntities = (
  sourceDxfData?: DXFData | null,
  options?: {
    selectedLotShapes?: TechnicalSummarySelectedLotShape[];
  }
) => {
  const serializedEntities = serializeMemorialEntities(sourceDxfData);
  if (!sourceDxfData) {
    return serializedEntities;
  }

  const selectedLotShapes = (options?.selectedLotShapes || [])
    .filter((selection) => Number.isInteger(selection.lotNumber) && selection.lotNumber > 0 && selection.polygon.length >= 3);
  const selectedLotNumberSet = new Set(selectedLotShapes.map((selection) => selection.lotNumber));
  const selectedPolygonSignatureSet = new Set(
    selectedLotShapes
      .map((selection) => buildPolygonSignature(toClosedVertices(selection.polygon)))
      .filter((signature): signature is string => Boolean(signature))
  );

  const { detectedPolygonEntries } = analyzeGeoLimitesLotDetection({
    dxfData: sourceDxfData,
    manualBridgeSegments: []
  });
  const detectedLotHintBySignature = detectedPolygonEntries.reduce<Map<string, { lotNumber: number; source: string }>>((acc, entry) => {
    if (entry.lotNumber === null) {
      return acc;
    }

    const signature = buildPolygonSignature(toClosedVertices(entry.polygon));
    if (!signature) {
      return acc;
    }

    const existing = acc.get(signature);
    if (!existing || (existing.source !== 'direct' && entry.source === 'direct')) {
      acc.set(signature, {
        lotNumber: entry.lotNumber,
        source: entry.source
      });
    }
    return acc;
  }, new Map());

  const scopedSerializedEntities = selectedLotNumberSet.size === 0
    ? serializedEntities
    : serializedEntities.filter((entity) => {
      if (!isClosedPolylineEntity(entity)) {
        return true;
      }

      const entitySignature = buildPolygonSignature(entity.vertices as DXFVertex[] | undefined);
      if (entitySignature && selectedPolygonSignatureSet.has(entitySignature)) {
        return false;
      }

      const detectedHint = entitySignature ? detectedLotHintBySignature.get(entitySignature) : null;
      if (
        detectedHint
        && selectedLotNumberSet.has(detectedHint.lotNumber)
      ) {
        return false;
      }

      const properties = entity.properties as Record<string, unknown> | undefined;
      const lotNumberHint = properties?.technicalSummaryLotNumberHint;
      const normalizedHint = typeof lotNumberHint === 'number'
        ? lotNumberHint
        : Number.parseInt(String(lotNumberHint || ''), 10);

      return !Number.isInteger(normalizedHint) || !selectedLotNumberSet.has(normalizedHint);
    });
  const filteredDetectedPolygonEntries = selectedLotNumberSet.size === 0
    ? detectedPolygonEntries
    : detectedPolygonEntries.filter((entry) => !selectedLotNumberSet.has(entry.lotNumber ?? -1));

  const lotNumberHintBySignature = filteredDetectedPolygonEntries.reduce<Map<string, { lotNumber: number; source: string }>>((acc, entry) => {
    if (entry.lotNumber === null) {
      return acc;
    }

    const signature = buildPolygonSignature(toClosedVertices(entry.polygon));
    if (!signature) {
      return acc;
    }

    const existing = acc.get(signature);
    if (!existing || (existing.source !== 'direct' && entry.source === 'direct')) {
      acc.set(signature, {
        lotNumber: entry.lotNumber,
        source: entry.source
      });
    }
    return acc;
  }, new Map());

  const polygonSignatures = new Set(
    scopedSerializedEntities
      .filter((entity) => entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE')
      .map((entity) => buildPolygonSignature(entity.vertices as DXFVertex[] | undefined))
      .filter((signature): signature is string => Boolean(signature))
  );

  const annotatedSerializedEntities = scopedSerializedEntities.map((entity) => {
    if (entity.type !== 'LWPOLYLINE' && entity.type !== 'POLYLINE') {
      return entity;
    }

    const signature = buildPolygonSignature(entity.vertices as DXFVertex[] | undefined);
    const lotHint = signature ? lotNumberHintBySignature.get(signature) : null;
    const shouldSkipFromLotSummary = isClosedPolylineEntity(entity)
      && !lotHint
      && (filteredDetectedPolygonEntries.length > 0 || selectedLotShapes.length > 0);

    return {
      ...entity,
      properties: {
        ...(entity.properties as Record<string, unknown> | undefined),
        ...(lotHint ? {
          technicalSummaryLotNumberHint: lotHint.lotNumber,
          technicalSummaryLotSource: lotHint.source
        } : null),
        technicalSummarySkipLotSummary: shouldSkipFromLotSummary || undefined
      }
    };
  });

  const syntheticLotEntities = filteredDetectedPolygonEntries.reduce<Array<Record<string, unknown>>>((acc, entry, index) => {
    if (entry.source !== 'face') {
      return acc;
    }

    const vertices = toClosedVertices(entry.polygon);
    const signature = buildPolygonSignature(vertices);
    if (!signature || polygonSignatures.has(signature)) {
      return acc;
    }

    polygonSignatures.add(signature);
    acc.push({
      type: 'LWPOLYLINE',
      layer: SYNTHETIC_LOT_LAYER,
      x: vertices[0]?.x,
      y: vertices[0]?.y,
      vertices,
      properties: {
        closed: true,
        syntheticTechnicalSummaryLot: true,
        syntheticLotSource: 'face',
        technicalSummaryLotNumberHint: entry.lotNumber,
        technicalSummaryLotSource: entry.source,
        syntheticLotIndex: index,
        vertices
      }
    });
    return acc;
  }, []);

  // #region debug-point C:technical-summary-entities
  void fetch('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: 'mixed-partial-lot-shift',
      runId: 'pre-fix',
      hypothesisId: 'C',
      location: 'technicalSummaryPayload.ts:buildGeoLimitesTechnicalSummaryEntities',
      msg: '[DEBUG] Built technical summary entities',
      data: {
        selectedLotShapes: selectedLotShapes.map((selection) => ({
          lotNumber: selection.lotNumber,
          polygonPointCount: selection.polygon.length
        })),
        selectedLotNumberSet: Array.from(selectedLotNumberSet.values()),
        scopedSerializedEntityCount: scopedSerializedEntities.length,
        filteredDetectedPolygonEntries: filteredDetectedPolygonEntries.map((entry) => ({
          lotNumber: entry.lotNumber,
          source: entry.source,
          polygonPointCount: entry.polygon.length
        })),
        syntheticFaceLotCount: syntheticLotEntities.length
      },
      ts: Date.now()
    })
  }).catch(() => undefined);
  // #endregion

  return [
    ...annotatedSerializedEntities,
    ...syntheticLotEntities,
    ...buildSelectedLotSyntheticEntities(selectedLotShapes)
  ];
};
