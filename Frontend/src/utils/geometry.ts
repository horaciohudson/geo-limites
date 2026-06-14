export interface Point2D {
  x: number;
  y: number;
  id?: string;
}

/**
 * Calcula a distância entre dois pontos (x1, y1) e (x2, y2).
 */
export function calculateDistance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Encontra o ponto mais próximo de um ponto de referência dentro de uma distância máxima (snapping).
 * Retorna o ponto mais próximo ou null se não encontrar nada dentro do snapDistance.
 */
export function findNearestPoint(
  referencePoint: Point2D,
  candidates: Point2D[],
  snapDistance: number = 10
): Point2D | null {
  let nearest: Point2D | null = null;
  let minDistance = snapDistance;

  for (const candidate of candidates) {
    const dist = calculateDistance(referencePoint, candidate);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = candidate;
    }
  }

  return nearest;
}

/**
 * Calcula a área de um polígono a partir de uma lista de vértices usando a fórmula de Shoelace.
 */
export function calculatePolygonArea(vertices: Point2D[]): number {
  if (vertices.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Calcula o perímetro de um polígono a partir de uma lista de vértices.
 */
export function calculatePolygonPerimeter(vertices: Point2D[]): number {
  if (vertices.length < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    perimeter += calculateDistance(vertices[i], vertices[j]);
  }
  return perimeter;
}
