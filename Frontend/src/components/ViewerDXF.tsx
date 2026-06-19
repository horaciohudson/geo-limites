import React, { useRef, useEffect, useState } from 'react';
import api from '@/services/api';
import { parseDXF } from '@/utils/dxfParser';
import type { DXFData, DXFEntity } from '@/utils/dxfParser';
import { findNearestPoint, calculatePolygonArea, calculateDistance } from '@/utils/geometry';
import type { Point2D } from '@/utils/geometry';
import { extractFacesFromLines } from '@/utils/polygonExtraction';

const isPointInPolygon = (point: Point2D, polygon: Point2D[]) => {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
};

interface DXFVertex {
  x: number;
  y: number;
}

interface DXFEntityProperties {
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  centerX?: number;
  centerY?: number;
  text?: string;
  height?: number;
  rotation?: number;
  closed?: boolean;
  vertices?: DXFVertex[];
}

interface DrawingBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  drawingWidth: number;
  drawingHeight: number;
}

interface ErrorLike {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const errorLike = error as ErrorLike;
    if (errorLike.response?.status === 404) {
      return 'Arquivo DXF nao encontrado no servidor.';
    }
    return errorLike.response?.data?.message || errorLike.message || fallback;
  }

  return fallback;
};

interface ViewerDXFProps {
  fileId?: string;
  data?: DXFData;
  className?: string;
  onDXFDataLoaded?: (data: DXFData) => void;
  interactive?: boolean;
  onPolygonConfirmed?: (selections: ConfirmedLotSelection[]) => void;
}

export interface ConfirmedLotSelection {
  polygon: Point2D[];
  lotNumber: number | null;
  textsInside: string[];
  selectedConfrontationTexts: ConfirmedConfrontationText[];
}

export interface SelectedConfrontationText {
  id: string;
  text: string;
  layer: string;
  entityType: string;
  x: number;
  y: number;
}

export interface ConfirmedConfrontationText extends SelectedConfrontationText {
  inferredDirection: string | null;
  selectionMode: 'text' | 'segment';
  segmentStartPoint?: Point2D;
  segmentEndPoint?: Point2D;
}

interface SegmentConfrontationAnnotation {
  id: string;
  sourceTextId: string;
  text: string;
  layer: string;
  entityType: string;
  startPoint: Point2D;
  endPoint: Point2D;
}

interface HoverConfrontationText {
  text: string;
  x: number;
  y: number;
  id: string;
}

const DEBUG_SELECTION_URL = 'http://127.0.0.1:7778/event';
const DEBUG_SELECTION_SESSION = 'lot-selection-mismatch';
const SHIFT_CLICK_DEDUP_MS = 300;
const SHIFT_CLICK_DEDUP_DISTANCE = 1.5;

const sendSelectionDebug = (hypothesisId: string, location: string, msg: string, data: Record<string, unknown>) => {
  // #region debug-point A:browser-selection-report
  fetch(DEBUG_SELECTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: DEBUG_SELECTION_SESSION,
      runId: 'pre-fix',
      hypothesisId,
      location,
      msg,
      data,
      ts: Date.now()
    })
  }).catch(() => {});
  // #endregion
};

const summarizePolygonTexts = (polygon: Point2D[], dxfData: DXFData | null): string[] => {
  if (!dxfData) return [];
  return dxfData.entities
    .filter(e => {
      if (e.type !== 'TEXT' && e.type !== 'MTEXT') return false;
      const tx = e.properties.x ?? e.properties.alignmentX ?? e.properties.x1;
      const ty = e.properties.y ?? e.properties.alignmentY ?? e.properties.y1;
      return tx !== undefined && ty !== undefined && isPointInPolygon({ x: tx as number, y: ty as number }, polygon);
    })
    .map(e => String(e.properties.text || '').trim())
    .filter(Boolean)
    .slice(0, 6);
};

const extractLotNumberFromTexts = (texts: string[]): number | null => {
  for (const text of texts) {
    const match = text.match(/lote\s*(\d+)/i);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      if (Number.isFinite(value)) {
        return value;
      }
    }
  }
  return null;
};

const extractTextPosition = (entity: DXFEntity): Point2D | null => {
  const x = entity.properties.x ?? entity.properties.alignmentX ?? entity.properties.x1;
  const y = entity.properties.y ?? entity.properties.alignmentY ?? entity.properties.y1;
  if (typeof x !== 'number' || typeof y !== 'number') {
    return null;
  }

  return { x, y };
};

const buildSelectedTextId = (entity: DXFEntity, position: Point2D): string => {
  const text = String(entity.properties.text || '').trim();
  return [entity.layer || '0', entity.type || 'TEXT', position.x.toFixed(3), position.y.toFixed(3), text].join('|');
};

const getPolygonCentroid = (polygon: Point2D[]): Point2D => {
  if (polygon.length === 0) {
    return { x: 0, y: 0 };
  }

  const total = polygon.reduce((acc, point) => ({
    x: acc.x + point.x,
    y: acc.y + point.y
  }), { x: 0, y: 0 });

  return {
    x: total.x / polygon.length,
    y: total.y / polygon.length
  };
};

const getPolygonEdges = (polygon: Point2D[]): { start: Point2D; end: Point2D }[] => {
  if (polygon.length < 2) {
    return [];
  }

  return polygon.map((point, index) => ({
    start: point,
    end: polygon[(index + 1) % polygon.length]
  }));
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const pointToSegmentDistance = (point: Point2D, start: Point2D, end: Point2D): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const segmentLengthSquared = dx * dx + dy * dy;

  if (segmentLengthSquared === 0) {
    return calculateDistance(point, start);
  }

  const t = clamp((((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / segmentLengthSquared, 0, 1);
  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy
  };

  return calculateDistance(point, projection);
};

const segmentToSegmentDistance = (a1: Point2D, a2: Point2D, b1: Point2D, b2: Point2D): number =>
  Math.min(
    pointToSegmentDistance(a1, b1, b2),
    pointToSegmentDistance(a2, b1, b2),
    pointToSegmentDistance(b1, a1, a2),
    pointToSegmentDistance(b2, a1, a2)
  );

const getSegmentLength = (start: Point2D, end: Point2D): number =>
  calculateDistance(start, end);

const getNormalizedSegmentVector = (start: Point2D, end: Point2D): Point2D | null => {
  const length = getSegmentLength(start, end);
  if (length === 0) {
    return null;
  }

  return {
    x: (end.x - start.x) / length,
    y: (end.y - start.y) / length
  };
};

const getAxisProjection = (point: Point2D, axis: Point2D): number =>
  point.x * axis.x + point.y * axis.y;

const getProjectedOverlapRatio = (
  aStart: Point2D,
  aEnd: Point2D,
  bStart: Point2D,
  bEnd: Point2D
): number => {
  const axis = getNormalizedSegmentVector(aStart, aEnd) ?? getNormalizedSegmentVector(bStart, bEnd);
  if (!axis) {
    return 0;
  }

  const a1 = getAxisProjection(aStart, axis);
  const a2 = getAxisProjection(aEnd, axis);
  const b1 = getAxisProjection(bStart, axis);
  const b2 = getAxisProjection(bEnd, axis);

  const aMin = Math.min(a1, a2);
  const aMax = Math.max(a1, a2);
  const bMin = Math.min(b1, b2);
  const bMax = Math.max(b1, b2);

  const overlap = Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin));
  const referenceLength = Math.max(1, Math.min(Math.abs(aMax - aMin), Math.abs(bMax - bMin)));
  return overlap / referenceLength;
};

const getParallelismScore = (
  aStart: Point2D,
  aEnd: Point2D,
  bStart: Point2D,
  bEnd: Point2D
): number => {
  const aVector = getNormalizedSegmentVector(aStart, aEnd);
  const bVector = getNormalizedSegmentVector(bStart, bEnd);

  if (!aVector || !bVector) {
    return 0;
  }

  return Math.abs(aVector.x * bVector.x + aVector.y * bVector.y);
};

const getSegmentMidpoint = (start: Point2D, end: Point2D): Point2D => ({
  x: (start.x + end.x) / 2,
  y: (start.y + end.y) / 2
});

const inferDirectionFromPolygon = (polygon: Point2D[], textPoint: Point2D): string | null => {
  if (polygon.length === 0) {
    return null;
  }

  const centroid = getPolygonCentroid(polygon);
  const dx = textPoint.x - centroid.x;
  const dy = textPoint.y - centroid.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'LESTE' : 'OESTE';
  }

  return dy >= 0 ? 'NORTE' : 'SUL';
};

const inferDirectionFromSegment = (polygon: Point2D[], startPoint: Point2D, endPoint: Point2D): string | null => {
  const centroid = getPolygonCentroid(polygon);
  const closestEdge = getPolygonEdges(polygon)
    .map((edge) => ({
      edge,
      distance: segmentToSegmentDistance(startPoint, endPoint, edge.start, edge.end)
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  if (!closestEdge) {
    return inferDirectionFromPolygon(polygon, getSegmentMidpoint(startPoint, endPoint));
  }

  const edgeMidpoint = getSegmentMidpoint(closestEdge.edge.start, closestEdge.edge.end);
  const dx = edgeMidpoint.x - centroid.x;
  const dy = edgeMidpoint.y - centroid.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'LESTE' : 'OESTE';
  }

  return dy >= 0 ? 'NORTE' : 'SUL';
};

const polygonTouchesAnnotationSegment = (
  polygon: Point2D[],
  annotation: SegmentConfrontationAnnotation,
  tolerance: number = 1.2
): boolean => {
  const annotationLength = getSegmentLength(annotation.startPoint, annotation.endPoint);
  const corridorDistance = Math.max(tolerance, Math.min(20, annotationLength * 0.18));

  return getPolygonEdges(polygon).some((edge) => {
    const distance = segmentToSegmentDistance(annotation.startPoint, annotation.endPoint, edge.start, edge.end);
    if (distance <= tolerance) {
      return true;
    }

    const overlapRatio = getProjectedOverlapRatio(annotation.startPoint, annotation.endPoint, edge.start, edge.end);
    const parallelism = getParallelismScore(annotation.startPoint, annotation.endPoint, edge.start, edge.end);

    return parallelism >= 0.9 && overlapRatio >= 0.3 && distance <= corridorDistance;
  });
};

const getSegmentSnapCandidates = (
  referencePoint: Point2D,
  polygons: Point2D[][],
  searchRadius: number,
  preferredPolygon?: Point2D[] | null
): Point2D[] => {
  const scopedPolygons = preferredPolygon && preferredPolygon.length > 0
    ? [preferredPolygon]
    : polygons;

  const relevantPolygons = scopedPolygons.filter((polygon) =>
    isPointInPolygon(referencePoint, polygon) ||
    getPolygonEdges(polygon).some((edge) => pointToSegmentDistance(referencePoint, edge.start, edge.end) <= searchRadius * 1.5)
  );

  const sourcePolygons = relevantPolygons.length > 0
    ? relevantPolygons
    : scopedPolygons
        .map((polygon) => ({
          polygon,
          distance: Math.min(
            ...getPolygonEdges(polygon).map((edge) => pointToSegmentDistance(referencePoint, edge.start, edge.end))
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 1)
        .map((item) => item.polygon);
  const unique = new Map<string, Point2D>();

  sourcePolygons.forEach((polygon) => {
    polygon.forEach((point) => {
      unique.set(`${point.x.toFixed(3)}|${point.y.toFixed(3)}`, point);
    });
  });

  return Array.from(unique.values());
};

const buildConfirmedSelections = (
  polygons: Point2D[][],
  dxfData: DXFData | null,
  selectedConfrontationTexts: SelectedConfrontationText[],
  segmentAnnotations: SegmentConfrontationAnnotation[]
): ConfirmedLotSelection[] =>
  polygons.map((polygon) => {
    const textsInside = summarizePolygonTexts(polygon, dxfData);
    const centroid = getPolygonCentroid(polygon);
    const segmentConfirmedTexts: ConfirmedConfrontationText[] = segmentAnnotations
      .filter((annotation) => polygonTouchesAnnotationSegment(polygon, annotation))
      .map((annotation) => ({
        id: annotation.sourceTextId,
        text: annotation.text,
        layer: annotation.layer,
        entityType: annotation.entityType,
        x: getSegmentMidpoint(annotation.startPoint, annotation.endPoint).x,
        y: getSegmentMidpoint(annotation.startPoint, annotation.endPoint).y,
        inferredDirection: inferDirectionFromSegment(polygon, annotation.startPoint, annotation.endPoint),
        selectionMode: 'segment',
        segmentStartPoint: annotation.startPoint,
        segmentEndPoint: annotation.endPoint
      }));

    const segmentedSourceIds = new Set(segmentConfirmedTexts.map((item) => item.id));

    const closestConfrontationTexts = selectedConfrontationTexts
      .filter((selectedText) => !segmentedSourceIds.has(selectedText.id))
      .map((selectedText) => ({
        ...selectedText,
        distance: calculateDistance(centroid, { x: selectedText.x, y: selectedText.y })
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
      .map(({ distance: _distance, ...selectedText }) => ({
        ...selectedText,
        inferredDirection: inferDirectionFromPolygon(polygon, { x: selectedText.x, y: selectedText.y }),
        selectionMode: 'text' as const
      }));

    return {
      polygon,
      textsInside,
      lotNumber: extractLotNumberFromTexts(textsInside),
      selectedConfrontationTexts: [...segmentConfirmedTexts, ...closestConfrontationTexts]
    };
  });

const ViewerDXF: React.FC<ViewerDXFProps> = ({ fileId, data, className, onDXFDataLoaded, interactive, onPolygonConfirmed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastShiftInteractionRef = useRef<{ x: number; y: number; ts: number } | null>(null);
  const [dxfData, setDxfData] = useState<DXFData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Estados para Pan e Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [drawingBounds, setDrawingBounds] = useState<DrawingBounds | null>(null);
  const [scale, setScale] = useState(1);
  const [validPoints, setValidPoints] = useState<Point2D[]>([]);
  const [manualPolygon, setManualPolygon] = useState<Point2D[]>([]);
  const [selectedPolygons, setSelectedPolygons] = useState<Point2D[][]>([]);
  const [selectedConfrontationTexts, setSelectedConfrontationTexts] = useState<SelectedConfrontationText[]>([]);
  const [activeConfrontationTextId, setActiveConfrontationTextId] = useState<string | null>(null);
  const [pendingConfrontationSegmentPoints, setPendingConfrontationSegmentPoints] = useState<Point2D[]>([]);
  const [segmentAnnotations, setSegmentAnnotations] = useState<SegmentConfrontationAnnotation[]>([]);
  const [hoverPoint, setHoverPoint] = useState<Point2D | null>(null);
  const [hoverPolygon, setHoverPolygon] = useState<Point2D[] | null>(null);
  const [hoverConfrontationText, setHoverConfrontationText] = useState<HoverConfrontationText | null>(null);
  const [hoverSegmentTargetPoint, setHoverSegmentTargetPoint] = useState<Point2D | null>(null);
  const [detectedPolygons, setDetectedPolygons] = useState<Point2D[][]>([]);

  // Encontrar polígonos fechados a partir de todas as linhas do desenho
  useEffect(() => {
    if (!dxfData) return;
    const segments: {p1: Point2D, p2: Point2D}[] = [];

    dxfData.entities.forEach((entity: DXFEntity) => {
      const props = entity.properties as DXFEntityProperties;
      if (entity.type === 'LINE') {
        if (props.x1 !== undefined && props.y1 !== undefined && props.x2 !== undefined && props.y2 !== undefined) {
          segments.push({ p1: {x: props.x1, y: props.y1}, p2: {x: props.x2, y: props.y2} });
        }
      } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        if (props.vertices && props.vertices.length > 1) {
          const validVerts = props.vertices.filter(v => v.x !== undefined && v.y !== undefined);
          for (let i = 0; i < validVerts.length - 1; i++) {
            segments.push({
              p1: {x: validVerts[i].x as number, y: validVerts[i].y as number},
              p2: {x: validVerts[i+1].x as number, y: validVerts[i+1].y as number}
            });
          }
          if (props.closed) {
            segments.push({
              p1: {x: validVerts[validVerts.length-1].x as number, y: validVerts[validVerts.length-1].y as number},
              p2: {x: validVerts[0].x as number, y: validVerts[0].y as number}
            });
          }
        }
      }
    });

    // Extrai as faces/lotes a partir dos segmentos
    const polys = extractFacesFromLines(segments);
    
    // Filtra apenas os polígonos que contêm algum texto dentro
    // Em projetos de loteamento, um lote válido sempre terá um texto (ex: "Lote 1", Área, etc.)
    // enquanto ruas, calçadas e polígonos vazios não terão.
    const validPolys = polys.filter(poly => {
      // Filtrar por área mínima para excluir células de tabelas de coordenadas
      const area = calculatePolygonArea(poly);
      if (area < 20) return false;

      // Pega todos os textos que estão geometricamente dentro deste polígono
      const textsInside = dxfData.entities.filter(e => {
        if (e.type !== 'TEXT' && e.type !== 'MTEXT') return false;
        
        const tx = e.properties.x ?? e.properties.alignmentX ?? e.properties.x1;
        const ty = e.properties.y ?? e.properties.alignmentY ?? e.properties.y1;
        
        if (tx !== undefined && ty !== undefined) {
           return isPointInPolygon({ x: tx as number, y: ty as number }, poly);
        }
        return false;
      });

      if (textsInside.length === 0) return false;

      // Palavras comuns em cabeçalhos de tabelas de coordenadas
      const tableKeywords = ['vertice', 'vértice', 'azimute', 'distancia', 'distância', 'coordenada', 'ponto', 'lado', 'rumo', 'descrição'];
      
      // Verifica se possui alguma palavra que identifica um lote claramente
      const hasLotKeyword = textsInside.some(t => {
         const str = (t.properties.text || '').toLowerCase();
         return str.includes('lote') || str.includes('área') || str.includes('area') || str.includes('m2') || str.includes('m²') || str.includes('quadra');
      });

      // Se tiver explicitamente a palavra "lote" ou "área", é um lote válido com certeza
      if (hasLotKeyword) return true;

      // Se não tem palavra de lote, mas os textos contêm jargão de tabela, então é o cabeçalho da grade
      const isTable = textsInside.some(t => {
         const str = (t.properties.text || '').toLowerCase();
         return tableKeywords.some(kw => str.includes(kw));
      });

      // Se for tabela, descarta
      if (isTable) return false;

      // Se tiver textos normais (apenas números, por exemplo), aceita por precaução
      return true;
    });

    setDetectedPolygons(validPolys);
    
    // Auto-seleciona todos os lotes detectados por padrão
    setSelectedPolygons(validPolys);

    // #region debug-point A:detected-polygons
    sendSelectionDebug(
      'A',
      'ViewerDXF:detected-polygons',
      '[DEBUG] Poligonos detectados e pre-selecionados',
      {
        detectedCount: validPolys.length,
        detectedSummaries: validPolys.slice(0, 30).map((poly, index) => ({
          index: index + 1,
          area: Number(calculatePolygonArea(poly).toFixed(2)),
          textsInside: summarizePolygonTexts(poly, dxfData)
        }))
      }
    );
    // #endregion
  }, [dxfData]);

  // Carregar dados DXF
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (data) {
        if (isMounted) {
          setDxfData(data);
          setError('');
          setIsLoading(false);
        }
        return;
      }

      if (!fileId) {
        if (isMounted) {
          setDxfData(null);
          setError('Nenhum arquivo especificado');
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        const response = await api.get(`/dxf/${fileId}/download`, {
          responseType: 'text'
        });

        const parsedData = parseDXF(response.data);

        if (isMounted) {
          setDxfData(parsedData);
          if (onDXFDataLoaded) {
            onDXFDataLoaded(parsedData);
          }
        }

      } catch (err: unknown) {
        if (isMounted) {
          setDxfData(null);
          setError(getErrorMessage(err, 'Erro ao carregar arquivo DXF'));
          console.error('Erro ao carregar DXF:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fileId, data]); // Removido onDXFDataLoaded para evitar loop infinito

  // Desenhar no canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dxfData?.entities) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas com proporcao quadrada para manter a leitura confortavel
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = Math.max(container.clientHeight || container.clientWidth, 420);
    }

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo cinza claro
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calcular bounds - IGNORANDO coordenadas muito distantes (outliers) que quebram o zoom
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let validEntities = 0;
    const allX: number[] = [];
    const allY: number[] = [];
    const points: Point2D[] = [];
    
    const addCoord = (x: number, y: number, includeInSnap: boolean = true) => {
      // Ignorar exatamente (0,0) que frequentemente é erro de parser/origem
      if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) return;
      allX.push(x);
      allY.push(y);
      if (includeInSnap) {
        points.push({ x, y, id: `V_${x.toFixed(3)}_${y.toFixed(3)}` });
      }
    };

    dxfData.entities.forEach((entity: DXFEntity) => {
      const props = entity.properties as DXFEntityProperties;

      switch (entity.type) {
        case 'LINE':
          if (props.x1 !== undefined && props.y1 !== undefined) addCoord(props.x1, props.y1);
          if (props.x2 !== undefined && props.y2 !== undefined) addCoord(props.x2, props.y2);
          break;
        case 'TEXT':
        case 'MTEXT':
          if (props.x !== undefined && props.y !== undefined) addCoord(props.x, props.y, false);
          break;
        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (props.vertices) {
            props.vertices.forEach((v: DXFVertex) => {
              if (v.x !== undefined && v.y !== undefined) addCoord(v.x, v.y);
            });
          }
          break;
      }
    });

    if (allX.length > 0) {
      allX.sort((a, b) => a - b);
      allY.sort((a, b) => a - b);
      
      // Utilizando o método do Intervalo Interquartil (IQR) para remover lixo fora do desenho principal
      const q1X = allX[Math.floor(allX.length * 0.25)];
      const q3X = allX[Math.floor(allX.length * 0.75)];
      const iqrX = q3X - q1X;
      
      const q1Y = allY[Math.floor(allY.length * 0.25)];
      const q3Y = allY[Math.floor(allY.length * 0.75)];
      const iqrY = q3Y - q1Y;
      
      // Um multiplicador de 1.5 ou 2.0 é padrão para IQR. 
      // Usaremos 2.5 para ter uma margem segura sem incluir lixo muito distante.
      const multiplier = 2.5;
      
      // Limites baseados no IQR (garantindo um mínimo de 50 unidades de tolerância caso o IQR seja 0)
      const maxAllowedDistX = Math.max(iqrX * multiplier, 50);
      const maxAllowedDistY = Math.max(iqrY * multiplier, 50);
      
      const medianX = allX[Math.floor(allX.length / 2)];
      const medianY = allY[Math.floor(allY.length / 2)];

      for (let i = 0; i < allX.length; i++) {
        if (allX[i] >= medianX - maxAllowedDistX && allX[i] <= medianX + maxAllowedDistX) {
          minX = Math.min(minX, allX[i]);
          maxX = Math.max(maxX, allX[i]);
        }
      }
      for (let i = 0; i < allY.length; i++) {
        if (allY[i] >= medianY - maxAllowedDistY && allY[i] <= medianY + maxAllowedDistY) {
          minY = Math.min(minY, allY[i]);
          maxY = Math.max(maxY, allY[i]);
        }
      }
      validEntities = allX.length;
    }

    if (validEntities === 0 || minX === Infinity) {
      // Desenhar mensagem de erro
      ctx.fillStyle = '#6c757d';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Nenhuma entidade válida encontrada', canvas.width / 2, canvas.height / 2 + 50);
      return;
    }

    // Calcular escala - AUMENTADA 20x PARA CORRIGIR TAMANHO DO GRÁFICO
    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    const maxDimension = Math.max(drawingWidth, drawingHeight);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Salvar bounds para uso posterior na centralização
    const bounds = { minX, minY, maxX, maxY, centerX, centerY, drawingWidth, drawingHeight };
    if (JSON.stringify(bounds) !== JSON.stringify(drawingBounds)) {
      setDrawingBounds(bounds);
    }

    // LOG DE DEBUG - Mostrar coordenadas do desenho
    const canvasSize = Math.min(canvas.width, canvas.height);
    // Escala base automática com MULTIPLICADOR DE 10x para visualização adequada
    const baseScale = maxDimension > 0 ? (canvasSize * 0.9) / maxDimension : 1;
    const scale = baseScale * zoom;
    setScale(scale);
    setValidPoints(points);

    // Aplicar transformações com Pan
    ctx.save();
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.scale(scale, -scale); // INVERTER Y de volta - padrão DXF
    ctx.translate(-centerX, -centerY);

    // Desenhar entidades em preto
    ctx.strokeStyle = '#212529';
    ctx.fillStyle = '#212529';
    ctx.lineWidth = 1 / scale; // Espessura normal

    // LOG: Testar onde os primeiros pontos vão aparecer no canvas
    let linesDrawn = 0;

    dxfData.entities.forEach((entity: DXFEntity) => {
      const props = entity.properties as DXFEntityProperties;

      switch (entity.type) {
        case 'LINE':
          if (props.x1 !== undefined && props.y1 !== undefined &&
            props.x2 !== undefined && props.y2 !== undefined) {
            ctx.beginPath();
            ctx.moveTo(props.x1, props.y1);
            ctx.lineTo(props.x2, props.y2);
            ctx.stroke();
            linesDrawn++;
          }
          break;

        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (props.vertices && props.vertices.length > 1) {
            ctx.beginPath();
            const v0 = props.vertices[0];
            ctx.moveTo(v0.x, v0.y);
            for (let i = 1; i < props.vertices.length; i++) {
              const v = props.vertices[i];
              ctx.lineTo(v.x, v.y);
            }
            
            if (props.closed) ctx.closePath();
            ctx.stroke();
            linesDrawn++;
          }
          break;

        case 'TEXT':
        case 'MTEXT':
          if (props.x !== undefined && props.y !== undefined && props.text) {
            const textPosition = extractTextPosition(entity);
            const isConfrontationTextSelected = textPosition
              ? selectedConfrontationTexts.some(selected => selected.id === buildSelectedTextId(entity, textPosition))
              : false;
            const isActiveConfrontationText = textPosition
              ? activeConfrontationTextId === buildSelectedTextId(entity, textPosition)
              : false;
            const isHoverConfrontationText = textPosition
              ? hoverConfrontationText?.id === buildSelectedTextId(entity, textPosition)
              : false;
            // Salvar o estado atual do contexto
            ctx.save();
            
            // Mover para a posição do texto
            ctx.translate(props.x, props.y);
            
            // Cancelar a inversão Y global aplicando escala positiva
            ctx.scale(1 / scale, -1 / scale);
            
            // Calcular posição no canvas (com as transformações atuais)
            const canvasCenterX = canvas.width / 2 + pan.x;
            const canvasCenterY = canvas.height / 2 + pan.y;
            
            // Resetar para coordenadas de canvas
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Posicionar no canvas considerando as transformações
            const screenX = canvasCenterX + (props.x - centerX) * scale;
            const screenY = canvasCenterY - (props.y - centerY) * scale;
            
            ctx.translate(screenX, screenY);
            
            // Aplicar rotação se houver (negativa para compensar a inversão Y do DXF)
            if (props.rotation) {
              ctx.rotate((-props.rotation * Math.PI) / 180);
            }
            
            // Ajustar tamanho da fonte
            const fontSize = Math.max((props.height || 2.5) * scale * 0.8, 8);
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = isActiveConfrontationText
              ? '#7b1fa2'
              : (isHoverConfrontationText ? '#c2185b' : (isConfrontationTextSelected ? '#d63384' : '#212529'));
            ctx.fillText(props.text, 0, 0);
            
            ctx.restore();
          }
          break;
      }
    });

    // Desenhar polígonos detectados (lotes) em verde
    if (detectedPolygons.length > 0) {
      ctx.save();
      ctx.lineWidth = 1.5 / scale;
      ctx.strokeStyle = '#28a745'; // Borda verde
      
      detectedPolygons.forEach(poly => {
        if (poly.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for(let i=1; i<poly.length; i++) {
          ctx.lineTo(poly[i].x, poly[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      });
      ctx.restore();
    }

    // Desenhar destaque amarelo se o mouse estiver sobre um lote auto-detectado
    if (interactive && hoverPolygon) { // Destaque visual
      ctx.save();
      ctx.fillStyle = 'rgba(255, 193, 7, 0.2)'; // Amarelo translúcido
      ctx.beginPath();
      ctx.moveTo(hoverPolygon[0].x, hoverPolygon[0].y);
      for(let i=1; i<hoverPolygon.length; i++) {
        ctx.lineTo(hoverPolygon[i].x, hoverPolygon[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    
    // Desenhar polígonos interativos selecionados
    if (interactive && selectedPolygons.length > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 123, 255, 0.2)';
      ctx.lineWidth = 3 / scale;
      ctx.strokeStyle = '#007bff';
      
      selectedPolygons.forEach(poly => {
        if (poly.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);
        for(let i=1; i<poly.length; i++) {
          ctx.lineTo(poly[i].x, poly[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }

    if (interactive && selectedConfrontationTexts.length > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(214, 51, 132, 0.18)';
      ctx.strokeStyle = '#d63384';
      ctx.lineWidth = 2 / scale;

      selectedConfrontationTexts.forEach((selectedText) => {
        ctx.beginPath();
        ctx.arc(selectedText.x, selectedText.y, 10 / scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.restore();
    }

    if (interactive && segmentAnnotations.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#7b1fa2';
      ctx.lineWidth = 3 / scale;

      segmentAnnotations.forEach((annotation) => {
        ctx.beginPath();
        ctx.moveTo(annotation.startPoint.x, annotation.startPoint.y);
        ctx.lineTo(annotation.endPoint.x, annotation.endPoint.y);
        ctx.stroke();

        [annotation.startPoint, annotation.endPoint].forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 7 / scale, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(123, 31, 162, 0.25)';
          ctx.fill();
          ctx.strokeStyle = '#7b1fa2';
          ctx.stroke();
        });
      });

      ctx.restore();
    }

    if (interactive && pendingConfrontationSegmentPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#9c27b0';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([8 / scale, 6 / scale]);

      if (pendingConfrontationSegmentPoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(pendingConfrontationSegmentPoints[0].x, pendingConfrontationSegmentPoints[0].y);
        ctx.lineTo(pendingConfrontationSegmentPoints[1].x, pendingConfrontationSegmentPoints[1].y);
        ctx.stroke();
      } else if (pendingConfrontationSegmentPoints.length === 1 && hoverSegmentTargetPoint) {
        ctx.beginPath();
        ctx.moveTo(pendingConfrontationSegmentPoints[0].x, pendingConfrontationSegmentPoints[0].y);
        ctx.lineTo(hoverSegmentTargetPoint.x, hoverSegmentTargetPoint.y);
        ctx.stroke();
      }

      pendingConfrontationSegmentPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8 / scale, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? 'rgba(156, 39, 176, 0.30)' : 'rgba(123, 31, 162, 0.30)';
        ctx.fill();
        ctx.strokeStyle = '#7b1fa2';
        ctx.stroke();
      });

      ctx.restore();
    }

    // Desenhar polígono manual em andamento
    if (interactive && manualPolygon.length > 0) {
       ctx.save();
       ctx.beginPath();
       ctx.moveTo(manualPolygon[0].x, manualPolygon[0].y);
       for(let i=1; i<manualPolygon.length; i++) {
         ctx.lineTo(manualPolygon[i].x, manualPolygon[i].y);
       }
       ctx.lineWidth = 2 / scale;
       ctx.strokeStyle = '#ffc107'; // Amarelo para destacar que está desenhando
       ctx.stroke();

       manualPolygon.forEach((p, i) => {
         ctx.beginPath();
         ctx.arc(p.x, p.y, 6 / scale, 0, 2 * Math.PI);
         ctx.fillStyle = i === 0 ? '#28a745' : '#ffc107';
         ctx.fill();
         ctx.stroke();
       });
       ctx.restore();
    }

    if (interactive && hoverSegmentTargetPoint) {
       ctx.beginPath();
       ctx.arc(hoverSegmentTargetPoint.x, hoverSegmentTargetPoint.y, 10 / scale, 0, 2 * Math.PI);
       ctx.fillStyle = 'rgba(123, 31, 162, 0.75)';
       ctx.fill();
       ctx.strokeStyle = '#7b1fa2';
       ctx.lineWidth = 2 / scale;
       ctx.stroke();

       ctx.save();
       ctx.setTransform(1, 0, 0, 1, 0, 0);

       const canvasCenterX = canvasRef.current!.width / 2 + pan.x;
       const canvasCenterY = canvasRef.current!.height / 2 + pan.y;
       const screenX = canvasCenterX + (hoverSegmentTargetPoint.x - (drawingBounds?.centerX || 0)) * scale;
       const screenY = canvasCenterY - (hoverSegmentTargetPoint.y - (drawingBounds?.centerY || 0)) * scale;

       ctx.fillStyle = 'rgba(49, 27, 146, 0.85)';
       ctx.fillRect(screenX + 15, screenY - 45, 200, 42);
       ctx.fillStyle = 'white';
       ctx.font = '12px Arial';
       ctx.textAlign = 'left';
       ctx.fillText('Ponto do trecho', screenX + 20, screenY - 28);
       ctx.fillText(`E: ${hoverSegmentTargetPoint.x.toFixed(3)} N: ${hoverSegmentTargetPoint.y.toFixed(3)}`, screenX + 20, screenY - 12);
       ctx.restore();
    } else if (interactive && hoverConfrontationText) {
       ctx.beginPath();
       ctx.arc(hoverConfrontationText.x, hoverConfrontationText.y, 12 / scale, 0, 2 * Math.PI);
       ctx.fillStyle = 'rgba(194, 24, 91, 0.18)';
       ctx.fill();
       ctx.strokeStyle = '#c2185b';
       ctx.lineWidth = 2 / scale;
       ctx.stroke();

       ctx.save();
       ctx.setTransform(1, 0, 0, 1, 0, 0);

       const canvasCenterX = canvasRef.current!.width / 2 + pan.x;
       const canvasCenterY = canvasRef.current!.height / 2 + pan.y;
       const screenX = canvasCenterX + (hoverConfrontationText.x - (drawingBounds?.centerX || 0)) * scale;
       const screenY = canvasCenterY - (hoverConfrontationText.y - (drawingBounds?.centerY || 0)) * scale;

       ctx.fillStyle = 'rgba(136, 14, 79, 0.88)';
       ctx.fillRect(screenX + 15, screenY - 45, 260, 42);
       ctx.fillStyle = 'white';
       ctx.font = '12px Arial';
       ctx.textAlign = 'left';
       ctx.fillText('Texto de confrontacao', screenX + 20, screenY - 28);
       ctx.fillText(hoverConfrontationText.text.slice(0, 34), screenX + 20, screenY - 12);
       ctx.restore();
    } else if (interactive && hoverPoint) {
       ctx.beginPath();
       ctx.arc(hoverPoint.x, hoverPoint.y, 10 / scale, 0, 2 * Math.PI);
       ctx.fillStyle = 'rgba(255, 193, 7, 0.8)';
       ctx.fill();
       ctx.strokeStyle = '#ffc107';
       ctx.lineWidth = 2 / scale;
       ctx.stroke();

       // Desenhar Tooltip com coordenadas
       ctx.save();
       ctx.setTransform(1, 0, 0, 1, 0, 0);
       
       const canvasCenterX = canvasRef.current!.width / 2 + pan.x;
       const canvasCenterY = canvasRef.current!.height / 2 + pan.y;
       
       // Calculate screen coordinates for the hover point
       const screenX = canvasCenterX + (hoverPoint.x - (drawingBounds?.centerX || 0)) * scale;
       const screenY = canvasCenterY - (hoverPoint.y - (drawingBounds?.centerY || 0)) * scale;
       
       ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
       ctx.fillRect(screenX + 15, screenY - 45, 180, 40);
       ctx.fillStyle = 'white';
       ctx.font = '12px Arial';
       ctx.textAlign = 'left';
       ctx.fillText(`E: ${hoverPoint.x.toFixed(3)}`, screenX + 20, screenY - 28);
       ctx.fillText(`N: ${hoverPoint.y.toFixed(3)}`, screenX + 20, screenY - 12);
       
       ctx.restore();
    }

    ctx.restore();

    // Info de debug discreta no canvas
    ctx.fillStyle = '#6c757d';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Entidades: ${dxfData.entities.length} | Desenhadas: ${linesDrawn}`, 10, 20);
    ctx.fillText(`Escala: ${scale.toFixed(2)}x | Zoom: ${zoom.toFixed(2)}x`, 10, 35);
    if (drawingBounds) {
      ctx.fillText(`Tamanho: ${drawingBounds.drawingWidth.toFixed(1)} x ${drawingBounds.drawingHeight.toFixed(1)}`, 10, 50);
    }

  }, [dxfData, pan, zoom, selectedPolygons, selectedConfrontationTexts, activeConfrontationTextId, pendingConfrontationSegmentPoints, segmentAnnotations, manualPolygon, hoverPoint, hoverPolygon, hoverConfrontationText, hoverSegmentTargetPoint, interactive, scale]);

  // Handlers de mouse para Pan
  
  const getDxfCoords = (clientX: number, clientY: number): Point2D | null => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingBounds) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - (canvas.width / 2 + pan.x);
    const dy = y - (canvas.height / 2 + pan.y);
    const dxfX = (dx / scale) + drawingBounds.centerX;
    const dxfY = (dy / -scale) + drawingBounds.centerY;
    return { x: dxfX, y: dxfY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const isShiftTextSelection = e.shiftKey && !e.ctrlKey;
    const isShiftSegmentSelection = e.shiftKey && e.ctrlKey;

    if (e.button === 0 && interactive && isShiftTextSelection && dxfData) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (!dxfCoords) {
        return;
      }

      const now = Date.now();
      const lastShiftInteraction = lastShiftInteractionRef.current;
      if (
        lastShiftInteraction &&
        now - lastShiftInteraction.ts <= SHIFT_CLICK_DEDUP_MS &&
        calculateDistance(dxfCoords, { x: lastShiftInteraction.x, y: lastShiftInteraction.y }) <= SHIFT_CLICK_DEDUP_DISTANCE
      ) {
        return;
      }
      lastShiftInteractionRef.current = { x: dxfCoords.x, y: dxfCoords.y, ts: now };

      const nearestText = dxfData.entities
        .filter(entity => entity.type === 'TEXT' || entity.type === 'MTEXT')
        .map((entity) => {
          const position = extractTextPosition(entity);
          const text = String(entity.properties.text || '').trim();
          if (!position || !text) {
            return null;
          }

          return {
            entity,
            position,
            text,
            distance: calculateDistance(dxfCoords, position)
          };
        })
        .filter((candidate): candidate is { entity: DXFEntity; position: Point2D; text: string; distance: number } => candidate !== null)
        .sort((a, b) => a.distance - b.distance)[0];

      if (nearestText && nearestText.distance <= 25 / scale) {
        const selectedText: SelectedConfrontationText = {
          id: buildSelectedTextId(nearestText.entity, nearestText.position),
          text: nearestText.text,
          layer: nearestText.entity.layer,
          entityType: nearestText.entity.type,
          x: nearestText.position.x,
          y: nearestText.position.y
        };

        setSelectedConfrontationTexts((prev) => {
          const isAlreadySelected = prev.some(item => item.id === selectedText.id);
          if (isAlreadySelected) {
            setSegmentAnnotations((annotations) => annotations.filter(item => item.sourceTextId !== selectedText.id));
            setPendingConfrontationSegmentPoints([]);
            setActiveConfrontationTextId((current) => current === selectedText.id ? null : current);
            return prev.filter(item => item.id !== selectedText.id);
          }
          setActiveConfrontationTextId(selectedText.id);
          return [...prev, selectedText];
        });
        return;
      }
      return;
    }

    if (e.button === 0 && interactive && isShiftSegmentSelection && dxfData) {
      const dxfCoords = getDxfCoords(e.clientX, e.clientY);
      if (!dxfCoords) {
        return;
      }

      const now = Date.now();
      const lastShiftInteraction = lastShiftInteractionRef.current;
      if (
        lastShiftInteraction &&
        now - lastShiftInteraction.ts <= SHIFT_CLICK_DEDUP_MS &&
        calculateDistance(dxfCoords, { x: lastShiftInteraction.x, y: lastShiftInteraction.y }) <= SHIFT_CLICK_DEDUP_DISTANCE
      ) {
        return;
      }
      lastShiftInteractionRef.current = { x: dxfCoords.x, y: dxfCoords.y, ts: now };

      const activeText = selectedConfrontationTexts.find((item) => item.id === activeConfrontationTextId);
      if (!activeText) {
        return;
      }

      const pickedPoint = hoverSegmentTargetPoint ?? dxfCoords;

      setPendingConfrontationSegmentPoints((prev) => {
        if (prev.length === 0) {
          return [pickedPoint];
        }

        const startPoint = prev[0];
        if (calculateDistance(startPoint, pickedPoint) < 0.001) {
          return prev;
        }

        const annotation: SegmentConfrontationAnnotation = {
          id: `${activeText.id}|${startPoint.x.toFixed(3)}|${startPoint.y.toFixed(3)}|${pickedPoint.x.toFixed(3)}|${pickedPoint.y.toFixed(3)}`,
          sourceTextId: activeText.id,
          text: activeText.text,
          layer: activeText.layer,
          entityType: activeText.entityType,
          startPoint,
          endPoint: pickedPoint
        };

        setSegmentAnnotations((annotations) => [
          ...annotations.filter((item) => item.sourceTextId !== activeText.id),
          annotation
        ]);
        setActiveConfrontationTextId(null);

        return [];
      });
      return;
    }

    // Requer a tecla Ctrl pressionada para desenhar ou selecionar lote
    if (e.button === 0 && interactive && e.ctrlKey && !e.shiftKey) {
       const dxfCoords = getDxfCoords(e.clientX, e.clientY);
       
       // Se clicou num polígono detectado, adiciona ou remove da seleção
       if (dxfCoords) {
         const containingPolys = detectedPolygons.filter(p => isPointInPolygon(dxfCoords, p));
         if (containingPolys.length > 0) {
           containingPolys.sort((a, b) => calculatePolygonArea(a) - calculatePolygonArea(b));
           const clickedPoly = containingPolys[0];
           
           // Só auto-seleciona se o clique não for num vértice amarelo de "snap" (traçado manual)
           if (!hoverPoint || (hoverPolygon && calculateDistance(dxfCoords, hoverPoint) > 10 / scale)) {
             // Verifica se já está selecionado para alternar (toggle)
             const isSelected = selectedPolygons.some(sp => 
                sp.length === clickedPoly.length && sp.every((p, i) => p.x === clickedPoly[i].x && p.y === clickedPoly[i].y)
             );
             
             if (isSelected) {
               setSelectedPolygons(prev => prev.filter(sp => 
                 !(sp.length === clickedPoly.length && sp.every((p, i) => p.x === clickedPoly[i].x && p.y === clickedPoly[i].y))
               ));
             } else {
               setSelectedPolygons(prev => [...prev, clickedPoly]);
             }
             return;
           }
         }
       }

       // Traçado manual
       if (hoverPoint) {
         setManualPolygon(prev => {
            // Verifica se clicou no primeiro ponto para fechar o polígono
            if (prev.length > 2 && prev[0].x === hoverPoint.x && prev[0].y === hoverPoint.y) {
               // Fecha o polígono e move para selectedPolygons
               setSelectedPolygons(sel => [...sel, prev]);
               return []; // Reseta o traçado manual
            }
            
            // Evitar duplicar o último ponto
            if (prev.length > 0) {
               const last = prev[prev.length - 1];
               if (last.x === hoverPoint.x && last.y === hoverPoint.y) return prev;
            }
            return [...prev, hoverPoint];
         });
         return;
       }
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }
    
    if (interactive) {
       const dxfCoords = getDxfCoords(e.clientX, e.clientY);
       if (dxfCoords) {
          const snapDist = 20 / scale;
          const isShiftPressed = e.shiftKey;
          const isCtrlPressed = e.ctrlKey;
          const shiftSegmentMode = isShiftPressed && isCtrlPressed && !!activeConfrontationTextId;
          const shiftTextHoverMode = isShiftPressed && !isCtrlPressed;
          const containingPolys = detectedPolygons.filter(p => isPointInPolygon(dxfCoords, p));
          const preferredPolygon = containingPolys.length > 0
            ? [...containingPolys].sort((a, b) => calculatePolygonArea(a) - calculatePolygonArea(b))[0]
            : hoverPolygon;

          if (shiftSegmentMode) {
            const segmentSnapCandidates = getSegmentSnapCandidates(dxfCoords, detectedPolygons, snapDist, preferredPolygon);
            const nearestSegmentPoint = findNearestPoint(dxfCoords, segmentSnapCandidates, snapDist);
            setHoverSegmentTargetPoint(nearestSegmentPoint ?? dxfCoords);
            setHoverConfrontationText(null);
            setHoverPoint(null);
          } else if (shiftTextHoverMode) {
            setHoverPoint(null);
            setHoverSegmentTargetPoint(null);

            const nearestText = (dxfData?.entities ?? [])
              .filter(entity => entity.type === 'TEXT' || entity.type === 'MTEXT')
              .map((entity) => {
                const position = extractTextPosition(entity);
                const text = String(entity.properties.text || '').trim();
                if (!position || !text) {
                  return null;
                }

                return {
                  id: buildSelectedTextId(entity, position),
                  text,
                  x: position.x,
                  y: position.y,
                  distance: calculateDistance(dxfCoords, position)
                };
              })
              .filter((candidate): candidate is HoverConfrontationText & { distance: number } => candidate !== null)
              .sort((a, b) => a.distance - b.distance)[0];

            if (nearestText && nearestText.distance <= 25 / scale) {
              const { distance: _distance, ...hoverText } = nearestText;
              setHoverConfrontationText(hoverText);
            } else {
              setHoverConfrontationText(null);
            }
          } else if (isShiftPressed && isCtrlPressed) {
            setHoverPoint(null);
            setHoverSegmentTargetPoint(null);
            setHoverConfrontationText(null);
          } else {
            const nearest = findNearestPoint(dxfCoords, validPoints, snapDist);
            setHoverPoint(nearest);
            setHoverSegmentTargetPoint(null);
            setHoverConfrontationText(null);
          }
          
          // Detectar lote para hover (somente visual)
          if (containingPolys.length > 0) {
            containingPolys.sort((a, b) => calculatePolygonArea(a) - calculatePolygonArea(b));
            setHoverPolygon(containingPolys[0]);
          } else {
            setHoverPolygon(null);
          }
       }
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (interactive && manualPolygon.length > 0) {
      e.preventDefault();
      setManualPolygon(prev => prev.slice(0, -1));
    } else if (interactive && pendingConfrontationSegmentPoints.length > 0) {
      e.preventDefault();
      setPendingConfrontationSegmentPoints(prev => prev.slice(0, -1));
    } else if (interactive && segmentAnnotations.length > 0) {
      e.preventDefault();
      setSegmentAnnotations(prev => prev.slice(0, -1));
    } else if (interactive && selectedConfrontationTexts.length > 0) {
      e.preventDefault();
      setSelectedConfrontationTexts(prev => {
        const next = prev.slice(0, -1);
        const removed = prev[prev.length - 1];
        if (removed) {
          setSegmentAnnotations((annotations) => annotations.filter((item) => item.sourceTextId !== removed.id));
          setPendingConfrontationSegmentPoints([]);
          setActiveConfrontationTextId((current) => current === removed.id ? null : current);
        }
        return next;
      });
    } else if (interactive && selectedPolygons.length > 0) {
      e.preventDefault();
      // Se não há traçado manual, remove o último lote selecionado
      setSelectedPolygons(prev => prev.slice(0, -1));
    }
  };


  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(50, prev * delta)));
  };

  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCenterDrawing = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  if (isLoading) {
    return (
      <div className={`viewer-dxf ${className || ''}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div>🔄 Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`viewer-dxf ${className || ''}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: '#dc3545' }}>❌ {error}</div>
      </div>
    );
  }

  return (
    <div className={`viewer-dxf ${className || ''}`}>
      <div style={{ padding: '10px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          {dxfData && <span style={{ marginLeft: '10px' }}>Entidades válidas: {dxfData.entities?.length || 0}</span>}
        </div>
        
        {interactive && (
          <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '8px', flexBasis: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px' }}>
              <strong>Modo de Lotes em Massa:</strong> Todos os lotes detectados são <strong>pré-selecionados (azul)</strong>.<br/>
              Use <strong>Ctrl + Clique</strong> num lote para <strong>adicionar/remover</strong> ele da seleção.<br/>
              Use <strong>Shift + Clique</strong> em um texto para ativar a via e depois <strong>Ctrl + Shift + Clique</strong> em dois pontos/snap para marcar o trecho da confrontação.<br/>
              Para traçar manualmente, faça <strong>Ctrl + Clique</strong> nos vértices e clique no primeiro vértice para fechar e adicionar o lote.
              <br/>
              <span style={{ color: '#007bff', fontWeight: 'bold', marginTop: '5px', display: 'inline-block' }}>
                Lotes Prontos para Gerar: {selectedPolygons.length} 
              </span>
              {selectedConfrontationTexts.length > 0 && (
                <span style={{ color: '#d63384', fontWeight: 'bold', marginLeft: '10px' }}>
                  | Textos de Confrontação: {selectedConfrontationTexts.length}
                </span>
              )}
              {segmentAnnotations.length > 0 && (
                <span style={{ color: '#7b1fa2', fontWeight: 'bold', marginLeft: '10px' }}>
                  | Trechos Anotados: {segmentAnnotations.length}
                </span>
              )}
              {activeConfrontationTextId && (
                <span style={{ color: '#7b1fa2', marginLeft: '10px' }}>
                  | Via ativa: {selectedConfrontationTexts.find((item) => item.id === activeConfrontationTextId)?.text || 'selecionada'}
                </span>
              )}
              {pendingConfrontationSegmentPoints.length > 0 && (
                <span style={{ color: '#9c27b0', marginLeft: '10px' }}>
                  | Marcando trecho: {pendingConfrontationSegmentPoints.length}/2 pontos
                </span>
              )}
              {manualPolygon.length > 0 && <span style={{ color: '#ffc107', marginLeft: '10px' }}>| Traçando manual: {manualPolygon.length} pontos</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => {
                  setSelectedPolygons([]);
                  setManualPolygon([]);
                  setSelectedConfrontationTexts([]);
                  setActiveConfrontationTextId(null);
                  setPendingConfrontationSegmentPoints([]);
                  setSegmentAnnotations([]);
                }}
                style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                disabled={selectedPolygons.length === 0 && manualPolygon.length === 0 && selectedConfrontationTexts.length === 0 && segmentAnnotations.length === 0 && pendingConfrontationSegmentPoints.length === 0}
              >
                Limpar Seleção
              </button>
              <button 
                onClick={() => {
                  // #region debug-point B:confirmed-selection
                  const confirmedSelections = buildConfirmedSelections(selectedPolygons, dxfData, selectedConfrontationTexts, segmentAnnotations);
                  sendSelectionDebug(
                    'B',
                    'ViewerDXF:confirmed-selection',
                    '[DEBUG] Selecao confirmada pelo usuario',
                    {
                      selectedCount: confirmedSelections.length,
                      selectedSummaries: confirmedSelections.map((selection, index) => ({
                        index: index + 1,
                        lotNumber: selection.lotNumber,
                        area: Number(calculatePolygonArea(selection.polygon).toFixed(2)),
                        textsInside: selection.textsInside,
                        selectedConfrontationTexts: selection.selectedConfrontationTexts
                      }))
                    }
                  );
                  // #endregion
                  onPolygonConfirmed && onPolygonConfirmed(confirmedSelections);
                }}
                style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                disabled={selectedPolygons.length === 0}
              >
                Gerar Memoriais
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          <button 
            onClick={handleCenterDrawing}
            style={{ padding: '5px 12px', cursor: 'pointer', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
            title="Centralizar desenho no canvas"
          >
            🎯 Centralizar
          </button>
          <button 
            onClick={() => setZoom(prev => Math.min(50, prev * 1.2))}
            style={{ padding: '5px 10px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
            title="Aumentar zoom"
          >
            🔍+
          </button>
          <button 
            onClick={() => setZoom(prev => Math.max(0.1, prev / 1.2))}
            style={{ padding: '5px 10px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
            title="Diminuir zoom"
          >
            🔍-
          </button>
          <button 
            onClick={handleResetView}
            style={{ padding: '5px 10px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
            title="Resetar pan e zoom"
          >
            🔄 Resetar
          </button>
          <span style={{ padding: '5px 10px', background: '#e9ecef', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
            Zoom: {zoom.toFixed(2)}x
          </span>
          <span style={{ padding: '5px 10px', background: '#fff3cd', borderRadius: '4px', fontSize: '11px' }}>
            💡 Desenho ajustado automaticamente ao canvas
          </span>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto',
          position: 'relative',
          aspectRatio: '1 / 1',
          minHeight: '420px',
          maxHeight: '85vh'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} onContextMenu={handleContextMenu}
          onWheel={handleWheel}
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid #dee2e6',
            display: 'block',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        />
      </div>
    </div>
  );
};

export default ViewerDXF;
