import { calculateDistance, calculatePolygonArea } from './geometry';
import type { Point2D } from './geometry';

// Tolerância para fundir vértices e verificar se um ponto está na linha
const TOLERANCE = 0.01;

// Retorna o ponto de intersecção entre dois segmentos (se houver e não for nas pontas)
function getIntersection(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): Point2D | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 0.000001) return null; // Linhas paralelas

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;

  // Se t e u estão entre 0 e 1, há intersecção nos segmentos
  if (t > -0.001 && t < 1.001 && u > -0.001 && u < 1.001) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y)
    };
  }
  return null;
}

// Verifica se dois pontos são iguais dentro da tolerância
function pointsEqual(p1: Point2D, p2: Point2D) {
  return Math.abs(p1.x - p2.x) < TOLERANCE && Math.abs(p1.y - p2.y) < TOLERANCE;
}

// Quebra segmentos nas intersecções (para lidar com linhas soltas que formam grid/T-junctions)
function splitSegmentsAtIntersections(segments: {p1: Point2D, p2: Point2D}[]): {p1: Point2D, p2: Point2D}[] {
  const result: {p1: Point2D, p2: Point2D}[] = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segA = segments[i];
    const splits: Point2D[] = [segA.p1, segA.p2];

    for (let j = 0; j < segments.length; j++) {
      if (i === j) continue;
      const segB = segments[j];
      const inter = getIntersection(segA.p1, segA.p2, segB.p1, segB.p2);
      
      if (inter) {
        // Verifica se a intersecção não é igual a uma das pontas
        let isEndpoint = false;
        for (const p of splits) {
          if (pointsEqual(p, inter)) {
            isEndpoint = true;
            break;
          }
        }
        if (!isEndpoint) {
          splits.push(inter);
        }
      }
    }

    // Se houve quebra, ordena os pontos ao longo do segmento A e cria novos sub-segmentos
    if (splits.length > 2) {
      // Ordena por distância a partir de p1
      splits.sort((a, b) => calculateDistance(segA.p1, a) - calculateDistance(segA.p1, b));
      for (let k = 0; k < splits.length - 1; k++) {
        if (!pointsEqual(splits[k], splits[k+1])) {
          result.push({ p1: splits[k], p2: splits[k+1] });
        }
      }
    } else {
      result.push(segA);
    }
  }

  return result;
}

export function extractFacesFromLines(rawSegments: {p1: Point2D, p2: Point2D}[]): Point2D[][] {
  if (rawSegments.length === 0) return [];

  // 0. Quebra segmentos nas intersecções (Resolve o problema de linhas soltas e grids T-junction)
  const segments = splitSegmentsAtIntersections(rawSegments);

  // 1. Encontrar vértices únicos
  const vertices: Point2D[] = [];
  const getVertexIndex = (p: Point2D): number => {
    for (let i = 0; i < vertices.length; i++) {
      if (pointsEqual(vertices[i], p)) {
        return i;
      }
    }
    vertices.push({ x: p.x, y: p.y });
    return vertices.length - 1;
  };

  // Grafo de adjacência
  const adj: Map<number, Set<number>> = new Map();
  
  for (const seg of segments) {
    const u = getVertexIndex(seg.p1);
    const v = getVertexIndex(seg.p2);
    if (u !== v) {
      if (!adj.has(u)) adj.set(u, new Set());
      if (!adj.has(v)) adj.set(v, new Set());
      adj.get(u)!.add(v);
      adj.get(v)!.add(u);
    }
  }

  // 2. Para cada vértice, ordenar os vizinhos pelo ângulo
  const sortedAdj: Map<number, number[]> = new Map();
  
  for (const [u, neighbors] of adj.entries()) {
    const pU = vertices[u];
    const neighborsList = Array.from(neighbors);
    
    neighborsList.sort((v1, v2) => {
      const p1 = vertices[v1];
      const p2 = vertices[v2];
      const angle1 = Math.atan2(p1.y - pU.y, p1.x - pU.x);
      const angle2 = Math.atan2(p2.y - pU.y, p2.x - pU.x);
      return angle1 - angle2;
    });
    
    sortedAdj.set(u, neighborsList);
  }

  // 3. Percorrer as arestas direcionadas para encontrar as faces
  const visitedEdges: Set<string> = new Set();
  const getEdgeKey = (u: number, v: number) => `${u}-${v}`;
  const faces: Point2D[][] = [];

  for (const [u, neighbors] of sortedAdj.entries()) {
    for (const v of neighbors) {
      const edgeKey = getEdgeKey(u, v);
      if (visitedEdges.has(edgeKey)) continue;

      // Iniciar uma nova face
      const faceIndices: number[] = [];
      let currU = u;
      let currV = v;
      let isDeadEnd = false;

      while (!visitedEdges.has(getEdgeKey(currU, currV))) {
        visitedEdges.add(getEdgeKey(currU, currV));
        faceIndices.push(currU);

        const nextNeighbors = sortedAdj.get(currV)!;
        if (nextNeighbors.length === 1) {
          // Nó folha (linha solta, ponta sem fim), não fecha polígono por este caminho
          isDeadEnd = true;
          break;
        }

        // Encontrar o próximo vizinho na ordem angular para contornar a face internamente
        const returnIdx = nextNeighbors.findIndex(n => n === currU);
        if (returnIdx !== -1) {
          const nextIdx = (returnIdx + 1) % nextNeighbors.length;
          const nextV = nextNeighbors[nextIdx];
          currU = currV;
          currV = nextV;
        } else {
          isDeadEnd = true;
          break;
        }
      }

      // Se a face fechou
      if (!isDeadEnd && currU === u) {
        const facePoints = faceIndices.map(idx => vertices[idx]);
        
        // Filtrar faces inválidas
        if (facePoints.length >= 3) {
          const area = calculatePolygonArea(facePoints);
          // Ignorar áreas minúsculas (artefatos de float precision ou linhas sobrepostas)
          if (area > 1.0) {
            faces.push(facePoints);
          }
        }
      }
    }
  }

  // Remover a maior face que normalmente é o universo (perímetro externo)
  if (faces.length > 0) {
    faces.sort((a, b) => calculatePolygonArea(b) - calculatePolygonArea(a));
    if (faces.length > 1) {
      const largestArea = calculatePolygonArea(faces[0]);
      const secondLargest = calculatePolygonArea(faces[1]);
      // Se a maior face for absurdamente maior que a segunda, ela é o contorno
      if (largestArea > secondLargest * 1.5) {
        faces.shift();
      }
    }
  }

  return faces;
}
