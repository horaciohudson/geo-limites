import type { DXFData, DXFEntity } from '@/graphics-engine/shared/dxf';
import { calculateDistance } from '@/graphics-engine/shared/geometry';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import {
  getParallelismScore,
  getPolygonEdges,
  getProjectedOverlapRatio,
  segmentToSegmentDistance
} from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';

const GEOMETRY_ENTITY_TYPES = new Set(['LINE', 'POLYLINE', 'LWPOLYLINE']);

const countEntitiesByType = (entities: DXFEntity[]): Record<string, number> =>
  entities.reduce<Record<string, number>>((accumulator, entity) => {
    accumulator[entity.type] = (accumulator[entity.type] || 0) + 1;
    return accumulator;
  }, {});

const countEntitiesByLayer = (entities: DXFEntity[]): Record<string, number> =>
  entities.reduce<Record<string, number>>((accumulator, entity) => {
    accumulator[entity.layer] = (accumulator[entity.layer] || 0) + 1;
    return accumulator;
  }, {});

export const buildCorrectiveSnapshotData = (baseData: DXFData, polygons: Point2D[][]): DXFData => {
  const syntheticPolygonEntities: DXFEntity[] = polygons
    .filter((polygon) => polygon.length >= 3)
    .map((polygon, index) => ({
      type: 'LWPOLYLINE',
      layer: 'CORRETIVO_SNAPSHOT',
      properties: {
        x: polygon[0]?.x,
        y: polygon[0]?.y,
        closed: true,
        polylineFlag: 1,
        vertexCount: polygon.length,
        vertices: polygon.map((point) => ({ x: point.x, y: point.y })),
        correctivePolygonIndex: index
      }
    }));

  const preservedEntities = (baseData.entities || []).filter((entity) => !GEOMETRY_ENTITY_TYPES.has(entity.type));
  const entities = [...preservedEntities, ...syntheticPolygonEntities];
  const layers = baseData.layers.some((layer) => layer.name === 'CORRETIVO_SNAPSHOT')
    ? baseData.layers
    : [...baseData.layers, { name: 'CORRETIVO_SNAPSHOT' }];

  return {
    entities,
    layers,
    entityCounts: countEntitiesByType(entities),
    layerCounts: countEntitiesByLayer(entities)
  };
};

export const getIssueSeverityColor = (severity: 'BLOQUEANTE' | 'AVISO' | null) => {
  if (severity === 'BLOQUEANTE') {
    return '#dc2626';
  }
  if (severity === 'AVISO') {
    return '#d97706';
  }
  return '#2563eb';
};

export type CorrectiveIssueSeverity = 'BLOQUEANTE' | 'AVISO' | null;

export const getVertexGapCandidates = (polygon: Point2D[]) => {
  if (polygon.length < 4) {
    return [];
  }

  const candidates: Array<{
    distance: number;
    startIndex: number;
    endIndex: number;
    startPoint: Point2D;
    endPoint: Point2D;
  }> = [];

  for (let i = 0; i < polygon.length; i++) {
    for (let j = i + 1; j < polygon.length; j++) {
      const isAdjacent = j === i + 1 || (i === 0 && j === polygon.length - 1);
      if (isAdjacent) {
        continue;
      }

      candidates.push({
        distance: calculateDistance(polygon[i], polygon[j]),
        startIndex: i,
        endIndex: j,
        startPoint: polygon[i],
        endPoint: polygon[j]
      });
    }
  }

  return candidates.sort((left, right) => left.distance - right.distance).slice(0, 3);
};

export const getSegmentGapCandidates = (polygon: Point2D[]) => {
  const edges = getPolygonEdges(polygon);
  if (edges.length < 4) {
    return [];
  }

  const candidates: Array<{
    distance: number;
    overlapRatio: number;
    parallelismScore: number;
    firstEdgeIndex: number;
    secondEdgeIndex: number;
    firstStart: Point2D;
    firstEnd: Point2D;
    secondStart: Point2D;
    secondEnd: Point2D;
  }> = [];

  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const isSameOrAdjacent =
        j === i ||
        j === i + 1 ||
        i === j + 1 ||
        (i === 0 && j === edges.length - 1);
      if (isSameOrAdjacent) {
        continue;
      }

      const first = edges[i];
      const second = edges[j];
      const parallelismScore = getParallelismScore(first.start, first.end, second.start, second.end);
      const overlapRatio = getProjectedOverlapRatio(first.start, first.end, second.start, second.end);
      const distance = segmentToSegmentDistance(first.start, first.end, second.start, second.end);

      candidates.push({
        distance,
        overlapRatio,
        parallelismScore,
        firstEdgeIndex: i,
        secondEdgeIndex: j,
        firstStart: first.start,
        firstEnd: first.end,
        secondStart: second.start,
        secondEnd: second.end
      });
    }
  }

  return candidates
    .filter((candidate) => candidate.parallelismScore >= 0.85 || candidate.overlapRatio >= 0.35)
    .sort((left, right) => {
      if (Math.abs(left.distance - right.distance) > 0.0001) {
        return left.distance - right.distance;
      }
      return right.parallelismScore - left.parallelismScore;
    })
    .slice(0, 3);
};

export const buildSuggestedCorrectiveAction = (params: {
  detected: boolean;
  nearestVertexGapDistance: number | null;
  nearestSegmentGapDistance: number | null;
}) => {
  const { detected, nearestVertexGapDistance, nearestSegmentGapDistance } = params;

  if (!detected) {
    return {
      tool: 'inspect' as const,
      confidence: 'alta' as const,
      reason: 'O lote ainda nao foi materializado no canvas; primeiro confirme a extracao antes de editar.'
    };
  }

  if (nearestVertexGapDistance !== null && nearestVertexGapDistance <= 1.5) {
    return {
      tool: 'join-endpoints' as const,
      confidence: 'alta' as const,
      reason: `A menor lacuna entre vertices e ${nearestVertexGapDistance.toFixed(2)}, sugerindo uniao direta das pontas.`
    };
  }

  if (
    nearestSegmentGapDistance !== null &&
    nearestSegmentGapDistance <= 3 &&
    (nearestVertexGapDistance === null || nearestSegmentGapDistance <= nearestVertexGapDistance * 1.35)
  ) {
    return {
      tool: 'close-gap-guided' as const,
      confidence: 'media' as const,
      reason: `Existem arestas proximas com afastamento de ${nearestSegmentGapDistance.toFixed(2)}, favorecendo fechamento guiado.`
    };
  }

  if (nearestVertexGapDistance !== null && nearestVertexGapDistance <= 8) {
    return {
      tool: 'move-vertex' as const,
      confidence: 'media' as const,
      reason: `A lacuna de ${nearestVertexGapDistance.toFixed(2)} sugere ajuste localizado de vertices antes de fechar o lote.`
    };
  }

  return {
    tool: 'inspect' as const,
    confidence: 'baixa' as const,
    reason: 'Nao ha heuristica segura para correcao automatica; revise visualmente antes de editar.'
  };
};


