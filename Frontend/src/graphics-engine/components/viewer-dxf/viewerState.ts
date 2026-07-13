import type { Point2D } from '@/graphics-engine/shared/geometry';

export interface ViewerSelectedEntityInfo {
  id: string;
  index: number;
  type: string;
  layer: string;
  groupId?: string;
  text?: string;
  closed?: boolean;
  vertexCount?: number;
  length?: number;
  radius?: number;
  position?: Point2D | null;
  startPoint?: Point2D | null;
  endPoint?: Point2D | null;
}

export interface ViewerEntitySelectionChange {
  primaryEntity: ViewerSelectedEntityInfo | null;
  selectedEntities: ViewerSelectedEntityInfo[];
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
  selectionMode: 'text' | 'segment' | 'segment-direct';
  segmentStartPoint?: Point2D;
  segmentEndPoint?: Point2D;
}

export interface ConfirmedLotSelection {
  polygon: Point2D[];
  lotNumber: number | null;
  textsInside: string[];
  selectedConfrontationTexts: ConfirmedConfrontationText[];
}

export interface ConfirmedReferencePoint {
  label: string;
  x: number;
  y: number;
  georeferencedX: number;
  georeferencedY: number;
}

export interface SegmentConfrontationAnnotation {
  id: string;
  sourceTextId: string;
  text: string;
  layer: string;
  entityType: string;
  selectionMode: 'segment' | 'segment-direct';
  startPoint: Point2D;
  endPoint: Point2D;
}

export interface HoverConfrontationText {
  text: string;
  x: number;
  y: number;
  id: string;
}

export interface HoverReferencePoint extends Point2D {
  label: string;
  originalX: number;
  originalY: number;
  georeferencedX: number;
  georeferencedY: number;
}

export interface ViewerGeoreferencingTransform {
  rotationRadians: number;
  rotationDegrees: number;
  scale: number;
  translateX: number;
  translateY: number;
  averageResidualMeters: number;
  matchedPoints: number;
}
