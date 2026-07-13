import type { DXFEntity } from '@/graphics-engine/shared/dxf';
import type { Point2D } from '@/graphics-engine/shared/geometry';

export interface DrawingBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  drawingWidth: number;
  drawingHeight: number;
}

export type EmbeddedCadToolMode =
  | 'select'
  | 'pan'
  | 'zoom'
  | 'rectangle'
  | 'circle'
  | 'bezier'
  | 'point'
  | 'distance'
  | 'line'
  | 'point-to-point'
  | 'text';

export type DrawingTextAlignment = 'left' | 'center' | 'right';
export type DrawingTextVerticalAlignment = 'baseline' | 'middle' | 'top';

export interface ViewerViewportCommand {
  zoomInToken: number;
  zoomOutToken: number;
  fitToken: number;
  resetToken: number;
  absoluteZoomToken?: number;
  absoluteZoomValue?: number | null;
}

export interface ViewerViewportState {
  zoom: number;
  panX: number;
  panY: number;
  scale: number;
  centerX: number;
  centerY: number;
}

export interface ViewerOverlaySegment {
  start: Point2D;
  end: Point2D;
  color?: string;
  dashed?: boolean;
  strokeWidth?: number;
}

export interface ViewerOverlayPoint {
  point: Point2D;
  color?: string;
  radius?: number;
  label?: string;
  labelColor?: string;
  labelBackgroundColor?: string;
  labelBorderColor?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
}

export interface ViewerSnapGuide {
  orientation: 'vertical' | 'horizontal';
  position: number;
}

export interface ViewerEntitiesDrawnPayload {
  entities: DXFEntity[];
  mode: EmbeddedCadToolMode;
  notice?: string;
}

export interface ViewerTextPlacementRequest {
  point: Point2D;
  layerName: string;
}
