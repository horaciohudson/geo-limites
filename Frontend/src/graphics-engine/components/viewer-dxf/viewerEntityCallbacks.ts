import type { DXFEntity } from '@/graphics-engine/shared/dxf';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { EditableNodeRole } from '@/graphics-engine/components/viewer-dxf/nodeEditUtils';
import type { EditableCurveHandleRole } from '@/graphics-engine/components/viewer-dxf/curveEditUtils';
import type { EntityPreviewTransform } from '@/graphics-engine/components/viewer-dxf/selectionTransformUtils';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/viewerState';

export interface ViewerEntityMovePayload {
  entity: ViewerSelectedEntityInfo;
  entities: ViewerSelectedEntityInfo[];
  deltaX: number;
  deltaY: number;
}

export type ViewerEntityCopyPayload = ViewerEntityMovePayload;

export interface ViewerEntityOffsetPayload {
  entity: ViewerSelectedEntityInfo;
  entities: DXFEntity[];
  distance: number;
}

export interface ViewerEntityExtendPayload {
  entity: ViewerSelectedEntityInfo;
  role: EditableNodeRole;
  vertexIndex?: number;
  targetPoint: Point2D;
  resultEntity?: DXFEntity;
}

export interface ViewerEntityTrimPayload {
  entity: ViewerSelectedEntityInfo;
  splitPoint: Point2D;
  segmentIndex: number;
  replacementEntities: DXFEntity[];
}

export interface ViewerEntityEditNodePayload {
  entity: ViewerSelectedEntityInfo;
  role: EditableNodeRole;
  vertexIndex?: number;
  targetPoint: Point2D;
  snappedToEntityId?: string | null;
}

export interface ViewerEntityEditCurvePayload {
  entity: ViewerSelectedEntityInfo;
  role: EditableCurveHandleRole;
  targetPoint: Point2D;
}

export interface ViewerEntityTransformPayload {
  entity: ViewerSelectedEntityInfo;
  entities: ViewerSelectedEntityInfo[];
  previewTransform: EntityPreviewTransform;
}

export type ViewerEntityTranslateHandler = (move: ViewerEntityMovePayload) => void;
export type ViewerEntityCopyHandler = (move: ViewerEntityMovePayload) => void;
export type ViewerEntityOffsetHandler = (offset: ViewerEntityOffsetPayload) => void;
export type ViewerEntityExtendHandler = (extend: ViewerEntityExtendPayload) => void;
export type ViewerEntityTrimHandler = (trim: ViewerEntityTrimPayload) => void;
export type ViewerEntityEditNodeHandler = (edit: ViewerEntityEditNodePayload) => void;
export type ViewerEntityEditCurveHandler = (edit: ViewerEntityEditCurvePayload) => void;
export type ViewerEntityTransformHandler = (transform: ViewerEntityTransformPayload) => void;
