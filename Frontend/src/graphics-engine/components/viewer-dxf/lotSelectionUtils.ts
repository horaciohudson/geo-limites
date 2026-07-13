import type { DXFData } from '@/graphics-engine/shared/dxf';
import { calculateDistance } from '@/graphics-engine/shared/geometry';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import { extractGeoLimitesLotNumberFromTexts } from '@/graphics-engine/adapters/geolimites/geoLimitesLotTextUtils';
import type {
  ConfirmedConfrontationText,
  ConfirmedLotSelection,
  SegmentConfrontationAnnotation,
  SelectedConfrontationText
} from '@/graphics-engine/components/viewer-dxf/types';
import { isTextLikeEntity } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import {
  getPolygonCentroid,
  getPolygonEdges,
  getSegmentMidpoint,
  inferDirectionFromPolygon,
  inferDirectionFromSegment,
  isPointInPolygon,
  pointToSegmentDistance,
  polygonTouchesAnnotationSegment
} from '@/graphics-engine/components/viewer-dxf/geometryAnalysis';

const isPointInsideOrNearPolygon = (
  point: Point2D,
  polygon: Point2D[],
  tolerance: number = 1.2
): boolean => (
  isPointInPolygon(point, polygon)
  || getPolygonEdges(polygon).some((edge) => pointToSegmentDistance(point, edge.start, edge.end) <= tolerance)
);

export const summarizePolygonTexts = (polygon: Point2D[], dxfData: DXFData | null): string[] => {
  if (!dxfData) {
    return [];
  }

  return dxfData.entities
    .filter((entity) => {
      if (!isTextLikeEntity(entity)) {
        return false;
      }
      const tx = entity.properties.x ?? entity.properties.alignmentX ?? entity.properties.x1;
      const ty = entity.properties.y ?? entity.properties.alignmentY ?? entity.properties.y1;
      return tx !== undefined && ty !== undefined && isPointInPolygon({ x: tx as number, y: ty as number }, polygon);
    })
    .map((entity) => String(entity.properties.text || '').trim())
    .filter(Boolean)
    .slice(0, 6);
};

export const extractLotNumberFromTexts = (texts: string[]): number | null => {
  return extractGeoLimitesLotNumberFromTexts(texts);
};

export const buildConfirmedSelections = (
  polygons: Point2D[][],
  dxfData: DXFData | null,
  selectedConfrontationTexts: SelectedConfrontationText[],
  segmentAnnotations: SegmentConfrontationAnnotation[],
  options?: {
    restrictSelectedTextsToPolygon?: boolean;
  }
): ConfirmedLotSelection[] =>
  polygons.map((polygon) => {
    const restrictSelectedTextsToPolygon = Boolean(options?.restrictSelectedTextsToPolygon);
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
        selectionMode: annotation.selectionMode,
        segmentStartPoint: annotation.startPoint,
        segmentEndPoint: annotation.endPoint
      }));

    const segmentedSourceIds = new Set(segmentConfirmedTexts.map((item) => item.id));

    const closestConfrontationTexts = selectedConfrontationTexts
      .filter((selectedText) => !segmentedSourceIds.has(selectedText.id))
      .filter((selectedText) => (
        !restrictSelectedTextsToPolygon
        || isPointInsideOrNearPolygon({ x: selectedText.x, y: selectedText.y }, polygon)
      ))
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

