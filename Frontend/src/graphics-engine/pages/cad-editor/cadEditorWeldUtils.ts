import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import type { DXFData, DXFEntity, DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';
import { polylineHasBulgeVertices } from '@/graphics-engine/components/viewer-dxf/dxfGeometryUtils';

export interface CadOverlaySegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
  color?: string;
  dashed?: boolean;
}

export interface CadOverlayPoint {
  point: { x: number; y: number };
  color?: string;
  radius?: number;
}

export interface WeldFailureDiagnostic {
  gap: number;
  tolerance: number;
  leftLabel: string;
  rightLabel: string;
}

export interface WeldAvailability {
  canApply: boolean;
  reason: string;
  gap: number | null;
  previewSegments: CadOverlaySegment[];
  previewPoints: CadOverlayPoint[];
  mergedVertices: DXFVertex[] | null;
  mergedCount: number;
  failureDiagnostic: WeldFailureDiagnostic | null;
}

export const cloneVertex = (vertex: DXFVertex): DXFVertex => ({
  x: vertex.x,
  y: vertex.y
});

const buildOverlaySegmentsFromVertices = (
  vertices: DXFVertex[],
  options?: {
    color?: string;
    dashed?: boolean;
  }
): CadOverlaySegment[] => {
  if (vertices.length < 2) {
    return [];
  }

  const color = options?.color;
  const dashed = options?.dashed;
  const segments: CadOverlaySegment[] = [];
  for (let index = 1; index < vertices.length; index += 1) {
    segments.push({
      start: cloneVertex(vertices[index - 1]),
      end: cloneVertex(vertices[index]),
      color,
      dashed
    });
  }
  return segments;
};

const getVertexDistance = (left: DXFVertex, right: DXFVertex) => Math.hypot(left.x - right.x, left.y - right.y);
const getVertexPathLength = (vertices: DXFVertex[]): number => {
  if (vertices.length < 2) {
    return 0;
  }

  let total = 0;
  for (let index = 1; index < vertices.length; index += 1) {
    total += getVertexDistance(vertices[index - 1], vertices[index]);
  }
  return total;
};
const buildWeldSelectionLabel = (selectedEntity: ViewerSelectedEntityInfo) => `${selectedEntity.type} #${selectedEntity.index + 1}`;

const buildWeldChainLabel = (labels: string[]) => {
  if (labels.length <= 1) {
    return labels[0] || 'Trecho';
  }

  if (labels.length === 2) {
    return `${labels[0]} + ${labels[1]}`;
  }

  return `${labels[0]} + ${labels[1]} + ${labels.length - 2} trecho(s)`;
};

const buildOpenEntityVertexPath = (entity: DXFEntity): DXFVertex[] | null => {
  const props = entity.properties as DXFEntityProperties;

  if (entity.type === 'LINE') {
    if (
      typeof props.x1 === 'number' &&
      typeof props.y1 === 'number' &&
      typeof props.x2 === 'number' &&
      typeof props.y2 === 'number'
    ) {
      return [
        { x: props.x1, y: props.y1 },
        { x: props.x2, y: props.y2 }
      ];
    }

    return null;
  }

  if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices && props.vertices.length > 1) {
    if (props.closed || polylineHasBulgeVertices(props.vertices)) {
      return null;
    }

    return props.vertices.map(cloneVertex);
  }

  return null;
};

const collapseConsecutiveVertices = (vertices: DXFVertex[], tolerance: number): DXFVertex[] =>
  vertices.reduce<DXFVertex[]>((accumulator, vertex) => {
    if (accumulator.length === 0) {
      accumulator.push(cloneVertex(vertex));
      return accumulator;
    }

    const previousVertex = accumulator[accumulator.length - 1];
    if (getVertexDistance(previousVertex, vertex) <= tolerance) {
      accumulator[accumulator.length - 1] = {
        x: (previousVertex.x + vertex.x) / 2,
        y: (previousVertex.y + vertex.y) / 2
      };
      return accumulator;
    }

    accumulator.push(cloneVertex(vertex));
    return accumulator;
  }, []);

const getPathStartDirection = (vertices: DXFVertex[]): DXFVertex | null => {
  if (vertices.length < 2) {
    return null;
  }

  return {
    x: vertices[1].x - vertices[0].x,
    y: vertices[1].y - vertices[0].y
  };
};

const getPathEndDirection = (vertices: DXFVertex[]): DXFVertex | null => {
  if (vertices.length < 2) {
    return null;
  }

  const lastIndex = vertices.length - 1;
  return {
    x: vertices[lastIndex].x - vertices[lastIndex - 1].x,
    y: vertices[lastIndex].y - vertices[lastIndex - 1].y
  };
};

const getLineIntersection = (
  pointA: DXFVertex,
  directionA: DXFVertex,
  pointB: DXFVertex,
  directionB: DXFVertex
): DXFVertex | null => {
  const denominator = (directionA.x * directionB.y) - (directionA.y * directionB.x);
  if (Math.abs(denominator) < 1e-6) {
    return null;
  }

  const deltaX = pointB.x - pointA.x;
  const deltaY = pointB.y - pointA.y;
  const factorA = ((deltaX * directionB.y) - (deltaY * directionB.x)) / denominator;
  const intersection = {
    x: pointA.x + (directionA.x * factorA),
    y: pointA.y + (directionA.y * factorA)
  };

  if (!Number.isFinite(intersection.x) || !Number.isFinite(intersection.y)) {
    return null;
  }

  return intersection;
};

const getBestLinearVertexConnection = (
  leftVertices: DXFVertex[],
  rightVertices: DXFVertex[],
  tolerance: number
): {
  distance: number;
  gap: number;
  first: DXFVertex[];
  second: DXFVertex[];
  joint: DXFVertex;
  previewStart: DXFVertex;
  previewEnd: DXFVertex;
} | null => {
  if (leftVertices.length < 2 || rightVertices.length < 2) {
    return null;
  }

  const options = [
    {
      first: leftVertices,
      second: rightVertices,
      previewStart: leftVertices[leftVertices.length - 1],
      previewEnd: rightVertices[0]
    },
    {
      first: leftVertices,
      second: [...rightVertices].reverse(),
      previewStart: leftVertices[leftVertices.length - 1],
      previewEnd: rightVertices[rightVertices.length - 1]
    },
    {
      first: [...leftVertices].reverse(),
      second: rightVertices,
      previewStart: leftVertices[0],
      previewEnd: rightVertices[0]
    },
    {
      first: rightVertices,
      second: leftVertices,
      previewStart: rightVertices[rightVertices.length - 1],
      previewEnd: leftVertices[0]
    }
  ].map((option) => {
    const firstConnection = option.first[option.first.length - 1];
    const secondConnection = option.second[0];
    const gap = getVertexDistance(firstConnection, secondConnection);
    const midpoint = {
      x: (firstConnection.x + secondConnection.x) / 2,
      y: (firstConnection.y + secondConnection.y) / 2
    };
    const endDirection = getPathEndDirection(option.first);
    const startDirection = getPathStartDirection(option.second);
    const tangentJoint = endDirection && startDirection
      ? getLineIntersection(firstConnection, endDirection, secondConnection, startDirection)
      : null;
    const canUseGapMerge = gap <= tolerance;
    const canUseTangentMerge = Boolean(tangentJoint);
    const joint = canUseGapMerge
      ? midpoint
      : (canUseTangentMerge ? tangentJoint! : null);

    return joint
      ? {
          distance: canUseGapMerge ? gap : 0,
          gap,
          first: option.first,
          second: option.second,
          joint,
          previewStart: option.previewStart,
          previewEnd: option.previewEnd
        }
      : {
          distance: gap,
          gap,
          first: option.first,
          second: option.second,
          joint: midpoint,
          previewStart: option.previewStart,
          previewEnd: option.previewEnd
        };
  }).sort((left, right) => left.distance - right.distance);

  const bestOption = options[0];
  if (!bestOption) {
    return null;
  }

  return {
    distance: bestOption.distance,
    gap: bestOption.gap,
    first: bestOption.first.map(cloneVertex),
    second: bestOption.second.map(cloneVertex),
    joint: cloneVertex(bestOption.joint),
    previewStart: cloneVertex(bestOption.previewStart),
    previewEnd: cloneVertex(bestOption.previewEnd)
  };
};

const mergeLinearVertexPaths = (
  leftVertices: DXFVertex[],
  rightVertices: DXFVertex[],
  tolerance: number
): {
  vertices: DXFVertex[];
  gap: number;
  previewStart: DXFVertex;
  previewEnd: DXFVertex;
} | null => {
  const bestOption = getBestLinearVertexConnection(leftVertices, rightVertices, tolerance);
  if (!bestOption) {
    return null;
  }

  const firstPath = bestOption.first.map(cloneVertex);
  const secondPath = bestOption.second.map(cloneVertex);
  const firstConnection = firstPath[firstPath.length - 1];
  const secondConnection = secondPath[0];
  const weldedPoint = cloneVertex(bestOption.joint);

  const mergedVertices = collapseConsecutiveVertices(
    [...firstPath.slice(0, -1), weldedPoint, ...secondPath.slice(1)],
    tolerance / 2
  );

  if (mergedVertices.length < 2) {
    return null;
  }

  return {
    vertices: mergedVertices,
    gap: bestOption.gap,
    previewStart: cloneVertex(firstConnection),
    previewEnd: cloneVertex(secondConnection)
  };
};

const chainLinearVertexPaths = (
  nodes: Array<{
    vertices: DXFVertex[];
    labels: string[];
  }>,
  tolerance: number
): {
  vertices: DXFVertex[] | null;
  totalGap: number | null;
  previewSegments: CadOverlaySegment[];
  previewPoints: CadOverlayPoint[];
  failureDiagnostic: WeldFailureDiagnostic | null;
} => {
  if (nodes.length < 2) {
    return {
      vertices: null,
      totalGap: null,
      previewSegments: [],
      previewPoints: [],
      failureDiagnostic: null
    };
  }

  const workingNodes = nodes.map((node) => ({
    vertices: node.vertices.map(cloneVertex),
    labels: [...node.labels]
  }));
  const previewSegments: CadOverlaySegment[] = [];
  const previewPoints: CadOverlayPoint[] = [];
  let totalGap = 0;

  while (workingNodes.length > 1) {
    let bestMerge:
      | {
          leftIndex: number;
          rightIndex: number;
          result: ReturnType<typeof mergeLinearVertexPaths>;
        }
      | null = null;
    let closestPair:
      | {
          leftIndex: number;
          rightIndex: number;
          result: NonNullable<ReturnType<typeof getBestLinearVertexConnection>>;
        }
      | null = null;

    for (let leftIndex = 0; leftIndex < workingNodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < workingNodes.length; rightIndex += 1) {
        const connection = getBestLinearVertexConnection(workingNodes[leftIndex].vertices, workingNodes[rightIndex].vertices, tolerance);
        if (!connection) {
          continue;
        }

        if (!closestPair || connection.distance < closestPair.result.distance) {
          closestPair = { leftIndex, rightIndex, result: connection };
        }

        const result = mergeLinearVertexPaths(workingNodes[leftIndex].vertices, workingNodes[rightIndex].vertices, tolerance);
        if (!result) {
          continue;
        }

        if (!bestMerge || result.gap < (bestMerge.result?.gap ?? Number.POSITIVE_INFINITY)) {
          bestMerge = { leftIndex, rightIndex, result };
        }
      }
    }

    if (!bestMerge || !bestMerge.result) {
      if (closestPair) {
        const leftNode = workingNodes[closestPair.leftIndex];
        const rightNode = workingNodes[closestPair.rightIndex];

        previewSegments.push({
          start: cloneVertex(closestPair.result.previewStart),
          end: cloneVertex(closestPair.result.previewEnd),
          color: '#dc2626',
          dashed: true
        });
        previewPoints.push(
          { point: cloneVertex(closestPair.result.previewStart), color: '#dc2626', radius: 8 },
          { point: cloneVertex(closestPair.result.previewEnd), color: '#dc2626', radius: 8 }
        );

        return {
          vertices: null,
          totalGap: null,
          previewSegments,
          previewPoints,
          failureDiagnostic: {
            gap: closestPair.result.distance,
            tolerance,
            leftLabel: buildWeldChainLabel(leftNode.labels),
            rightLabel: buildWeldChainLabel(rightNode.labels)
          }
        };
      }

      return {
        vertices: null,
        totalGap: null,
        previewSegments,
        previewPoints,
        failureDiagnostic: null
      };
    }

    previewSegments.push({
      start: cloneVertex(bestMerge.result.previewStart),
      end: cloneVertex(bestMerge.result.previewEnd),
      color: '#f59e0b',
      dashed: true
    });
    previewPoints.push(
      { point: cloneVertex(bestMerge.result.previewStart), color: '#f59e0b', radius: 7 },
      { point: cloneVertex(bestMerge.result.previewEnd), color: '#f59e0b', radius: 7 }
    );
    totalGap += bestMerge.result.gap;

    const mergedPath = bestMerge.result.vertices.map(cloneVertex);
    const mergedLabels = [
      ...workingNodes[bestMerge.leftIndex].labels,
      ...workingNodes[bestMerge.rightIndex].labels
    ];
    const nextNodes = workingNodes.filter((_, index) => index !== bestMerge.leftIndex && index !== bestMerge.rightIndex);
    nextNodes.push({
      vertices: mergedPath,
      labels: mergedLabels
    });
    workingNodes.splice(0, workingNodes.length, ...nextNodes);
  }

  return {
    vertices: workingNodes[0].vertices.map(cloneVertex),
    totalGap,
    previewSegments,
    previewPoints,
    failureDiagnostic: null
  };
};

export const getWeldAvailability = (
  editorData: DXFData | null,
  selection: ViewerSelectedEntityInfo[],
  weldTolerance: number
): WeldAvailability => {
  if (!editorData) {
    return {
      canApply: false,
      reason: 'Abra um DXF antes de aplicar Weld.',
      gap: null,
      previewSegments: [],
      previewPoints: [],
      mergedVertices: null,
      mergedCount: 0,
      failureDiagnostic: null
    };
  }

  if (selection.length < 2) {
    return {
      canApply: false,
      reason: 'Selecione pelo menos 2 entidades para aplicar Weld.',
      gap: null,
      previewSegments: [],
      previewPoints: [],
      mergedVertices: null,
      mergedCount: selection.length,
      failureDiagnostic: null
    };
  }

  const uniqueIndexes = new Set(selection.map((entity) => entity.index));
  if (uniqueIndexes.size !== selection.length) {
    return {
      canApply: false,
      reason: 'A selecao de Weld contem entidades duplicadas.',
      gap: null,
      previewSegments: [],
      previewPoints: [],
      mergedVertices: null,
      mergedCount: selection.length,
      failureDiagnostic: null
    };
  }

  const selectedEditorEntities = selection
    .map((selectedEntity) => editorData.entities[selectedEntity.index] || null)
    .filter((entity): entity is DXFEntity => entity !== null);

  if (selectedEditorEntities.length !== selection.length) {
    return {
      canApply: false,
      reason: 'Nao foi possivel localizar todas as entidades selecionadas.',
      gap: null,
      previewSegments: [],
      previewPoints: [],
      mergedVertices: null,
      mergedCount: selection.length,
      failureDiagnostic: null
    };
  }

  const selectedLayers = Array.from(new Set(selectedEditorEntities.map((entity) => entity.layer)));
  if (selectedLayers.length !== 1) {
    return {
      canApply: false,
      reason: 'O Weld em cadeia exige que todas as entidades estejam na mesma camada.',
      gap: null,
      previewSegments: [],
      previewPoints: [],
      mergedVertices: null,
      mergedCount: selection.length,
      failureDiagnostic: null
    };
  }

  if (selectedEditorEntities.some((entity) => {
    const props = entity.properties as DXFEntityProperties;
    return (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && polylineHasBulgeVertices(props.vertices);
  })) {
    return {
      canApply: false,
      reason: 'O Weld ainda nao suporta polylines com bulge. Converta a curva em segmentos ou remova o bulge antes de unir.',
      gap: null,
      previewSegments: [],
      previewPoints: [],
      mergedVertices: null,
      mergedCount: selection.length,
      failureDiagnostic: null
    };
  }

  const paths = selectedEditorEntities.map((entity) => buildOpenEntityVertexPath(entity));
  if (paths.some((path) => !path)) {
    return {
      canApply: false,
      reason: 'O Weld em cadeia suporta apenas LINE, POLYLINE e LWPOLYLINE abertas.',
      gap: null,
      previewSegments: [],
      previewPoints: [],
      mergedVertices: null,
      mergedCount: selection.length,
      failureDiagnostic: null
    };
  }

  const chained = chainLinearVertexPaths(
    (paths as DXFVertex[][]).map((path, index) => ({
      vertices: path,
      labels: [buildWeldSelectionLabel(selection[index])]
    })),
    weldTolerance
  );

  if (!chained.vertices || chained.vertices.length < 2) {
    return {
      canApply: false,
      reason: chained.failureDiagnostic
        ? `Falha entre ${chained.failureDiagnostic.leftLabel} e ${chained.failureDiagnostic.rightLabel}. Menor gap restante: ${chained.failureDiagnostic.gap.toFixed(3)} (tol. ${chained.failureDiagnostic.tolerance.toFixed(2)}).`
        : `Nao foi possivel montar uma cadeia de Weld com tolerancia de ${weldTolerance.toFixed(2)}.`,
      gap: chained.failureDiagnostic?.gap ?? null,
      previewSegments: chained.previewSegments,
      previewPoints: chained.previewPoints,
      mergedVertices: null,
      mergedCount: selection.length,
      failureDiagnostic: chained.failureDiagnostic
    };
  }

  const sourceLength = (paths as DXFVertex[][]).reduce((total, path) => total + getVertexPathLength(path), 0);
  const mergedLength = getVertexPathLength(chained.vertices);
  if ((mergedLength + weldTolerance) < sourceLength) {
    return {
      canApply: false,
      reason: `Weld parcial detectado. O resultado perderia ${(sourceLength - mergedLength).toFixed(3)} unidades da selecao original.`,
      gap: chained.totalGap ?? 0,
      previewSegments: [
        ...buildOverlaySegmentsFromVertices(chained.vertices, { color: '#dc2626', dashed: false }),
        ...chained.previewSegments
      ],
      previewPoints: [
        ...chained.previewPoints,
        { point: cloneVertex(chained.vertices[0]), color: '#dc2626', radius: 6 },
        { point: cloneVertex(chained.vertices[chained.vertices.length - 1]), color: '#dc2626', radius: 6 }
      ],
      mergedVertices: null,
      mergedCount: selection.length,
      failureDiagnostic: {
        gap: sourceLength - mergedLength,
        tolerance: weldTolerance,
        leftLabel: buildWeldChainLabel(selection.map(buildWeldSelectionLabel)),
        rightLabel: 'resultado parcial'
      }
    };
  }

  return {
    canApply: true,
    reason: `Weld pronto para ${selection.length} entidades. Gap total: ${(chained.totalGap ?? 0).toFixed(3)}.`,
    gap: chained.totalGap ?? 0,
    previewSegments: [
      ...buildOverlaySegmentsFromVertices(chained.vertices, { color: '#16a34a', dashed: false }),
      ...chained.previewSegments
    ],
    previewPoints: [
      ...chained.previewPoints,
      { point: cloneVertex(chained.vertices[0]), color: '#16a34a', radius: 6 },
      { point: cloneVertex(chained.vertices[chained.vertices.length - 1]), color: '#16a34a', radius: 6 }
    ],
    mergedVertices: chained.vertices,
    mergedCount: selection.length,
    failureDiagnostic: null
  };
};


