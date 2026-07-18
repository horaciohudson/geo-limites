import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  collectGeoLimitesLotTextAnchors,
  collectPrimaryGeoLimitesLotTextAnchors,
  inferPrimaryGeoLimitesLotCount
} from '@/graphics-engine/adapters/geolimites/geoLimitesLotTextUtils';
import { scanGeoLimitesCorrectiveIssues } from '@/graphics-engine/adapters/geolimites/scanGeoLimitesCorrectiveIssues';
import { buildGeoLimitesTechnicalSummaryEntities } from '@/graphics-engine/adapters/geolimites/technicalSummaryPayload';
import { analyzeGeoLimitesLotDetection } from '@/graphics-engine/adapters/geolimites/useGeoLimitesLotDetection';
import { parseDXF } from '@/utils/dxfParser';
import { serializeMemorialEntities } from '@/utils/memorialPayload';

const fixturePath = resolve(process.cwd(), 'arquivos_dxf', 'TESTE AGENTE_DBL TERRA NOBRE_2.dxf');
const dxfText = readFileSync(fixturePath, 'utf8');
const dxfData = parseDXF(dxfText);

const serializedEntities = serializeMemorialEntities(dxfData);
const lotDetection = analyzeGeoLimitesLotDetection({
  dxfData,
  manualBridgeSegments: []
});
const technicalSummaryEntities = buildGeoLimitesTechnicalSummaryEntities(dxfData);
const lotTextAnchors = collectGeoLimitesLotTextAnchors(dxfData);
const primaryLotTextAnchors = collectPrimaryGeoLimitesLotTextAnchors(dxfData);
const correctiveIssues = scanGeoLimitesCorrectiveIssues(dxfData);

const countPolylines = (entities: Array<Record<string, unknown>>) => entities.filter(
  (entity) => entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE'
).length;

const syntheticEntities = technicalSummaryEntities.filter(
  (entity) => entity.layer === '__RESUMO_TECNICO_LOTES_DETECTADOS__'
);

const sourceCounts = lotDetection.detectedPolygonEntries.reduce<Record<string, number>>((acc, entry) => {
  acc[entry.source] = (acc[entry.source] ?? 0) + 1;
  return acc;
}, {});

const detectedLotNumbers = Array.from(new Set(
  lotDetection.detectedPolygonEntries.map((entry) => entry.lotNumber).filter((value) => value !== null)
)).sort((left, right) => left - right);

const anchorLotNumbers = Array.from(new Set(
  lotTextAnchors.map((anchor) => anchor.lotNumber)
)).sort((left, right) => left - right);

const primaryAnchorLotNumbers = Array.from(new Set(
  primaryLotTextAnchors.map((anchor) => anchor.lotNumber)
)).sort((left, right) => left - right);

const missingLotNumbers = primaryAnchorLotNumbers.filter((lotNumber) => !detectedLotNumbers.includes(lotNumber));
const missingLotIssues = correctiveIssues
  .filter((issue) => missingLotNumbers.includes(issue.lotNumber))
  .map((issue) => ({
    lotNumber: issue.lotNumber,
    code: issue.code,
    severity: issue.severity,
    detectionSource: issue.detectionSource ?? null,
    message: issue.message
  }));

console.log(JSON.stringify({
  fixturePath,
  totalParsedEntities: dxfData.entities.length,
  serializedPolylineCount: countPolylines(serializedEntities as Array<Record<string, unknown>>),
  detectedPolygonCount: lotDetection.detectedPolygonEntries.length,
  detectedPolygonSourceCounts: sourceCounts,
  detectedLotNumbers,
  lotTextAnchorCount: lotTextAnchors.length,
  anchorLotNumbers,
  primaryLotTextAnchorCount: primaryLotTextAnchors.length,
  primaryAnchorLotNumbers,
  inferredPrimaryLotCount: inferPrimaryGeoLimitesLotCount(dxfData),
  missingLotNumbers,
  missingLotIssues,
  enrichedPolylineCount: countPolylines(technicalSummaryEntities),
  syntheticPolylineCount: syntheticEntities.length
}, null, 2));
