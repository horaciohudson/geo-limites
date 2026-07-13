import type { DXFData } from '@/graphics-engine/shared/dxf';
import type {
  SegmentConfrontationAnnotation,
  ConfirmedLotSelection,
  ConfirmedReferencePoint,
  SelectedConfrontationText
} from '@/graphics-engine/components/viewer-dxf/viewerState';

export interface ViewerPolygonConfirmedPayload {
  selections: ConfirmedLotSelection[];
  referencePoints?: ConfirmedReferencePoint[];
}

export interface ViewerSelectionSummaryChangePayload {
  selections: ConfirmedLotSelection[];
  referencePoints?: ConfirmedReferencePoint[];
}

export interface ViewerTechnicalSummaryPayload {
  viewerData: DXFData;
  referencePoints?: ConfirmedReferencePoint[];
}

export interface ViewerConfrontationSelectionChangePayload {
  selectedConfrontationTexts: SelectedConfrontationText[];
  segmentAnnotations: SegmentConfrontationAnnotation[];
}

export interface ViewerReferencePointsChangePayload {
  referencePoints: ConfirmedReferencePoint[];
}

export type ViewerPolygonConfirmedHandler = (payload: ViewerPolygonConfirmedPayload) => void;
export type ViewerSelectionSummaryChangeHandler = (payload: ViewerSelectionSummaryChangePayload) => void;
export type ViewerTechnicalSummaryHandler = (payload: ViewerTechnicalSummaryPayload) => void;
export type ViewerConfrontationSelectionChangeHandler = (payload: ViewerConfrontationSelectionChangePayload) => void;
export type ViewerReferencePointsChangeHandler = (payload: ViewerReferencePointsChangePayload) => void;
