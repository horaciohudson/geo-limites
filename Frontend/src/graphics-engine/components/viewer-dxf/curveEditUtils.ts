import type { DXFData, DXFEntity, DXFEntityProperties } from '@/graphics-engine/shared/dxf';
import { calculateDistance, type Point2D } from '@/graphics-engine/shared/geometry';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import { buildBezierEntity } from '@/graphics-engine/components/viewer-dxf/cadDrawingUtils';

export type EditableCurveHandleRole = 'control1' | 'control2';

export interface EditableCurveHandle {
  id: string;
  entityId: string;
  entityIndex: number;
  role: EditableCurveHandleRole;
  point: Point2D;
  startPoint: Point2D;
  endPoint: Point2D;
}

const CURVE_PICK_RADIUS_PX = 18;

const buildCurveHandleId = (entityId: string, role: EditableCurveHandleRole) => `${entityId}::${role}`;

const getCurveEndpoints = (entity: DXFEntity): { startPoint: Point2D; endPoint: Point2D } | null => {
  const props = entity.properties as DXFEntityProperties;
  const startVertex = props.vertices?.[0];
  const endVertex = props.vertices?.[props.vertices.length - 1];

  if (!startVertex || !endVertex) {
    return null;
  }

  return {
    startPoint: { x: startVertex.x, y: startVertex.y },
    endPoint: { x: endVertex.x, y: endVertex.y }
  };
};

export const getCurveControlPoints = (
  entity: DXFEntity
): { control1: Point2D; control2: Point2D } | null => {
  const props = entity.properties as DXFEntityProperties;
  const control1X = props.editorCurveControl1X;
  const control1Y = props.editorCurveControl1Y;
  const control2X = props.editorCurveControl2X;
  const control2Y = props.editorCurveControl2Y;

  if (
    typeof control1X !== 'number'
    || typeof control1Y !== 'number'
    || typeof control2X !== 'number'
    || typeof control2Y !== 'number'
  ) {
    return null;
  }

  return {
    control1: { x: control1X, y: control1Y },
    control2: { x: control2X, y: control2Y }
  };
};

export const isCurveEditableEntity = (entity: DXFEntity | null | undefined): boolean => {
  if (!entity || (entity.type !== 'LWPOLYLINE' && entity.type !== 'POLYLINE')) {
    return false;
  }

  const props = entity.properties as DXFEntityProperties;
  if (props.closed || !props.vertices || props.vertices.length < 2) {
    return false;
  }

  return props.editorCurveKind === 'bezier-cubic' && getCurveControlPoints(entity) !== null;
};

export const getEditableCurveHandles = (
  dxfData: DXFData | null,
  selectedEntities: ViewerSelectedEntityInfo[]
): EditableCurveHandle[] => {
  if (!dxfData || selectedEntities.length === 0) {
    return [];
  }

  return selectedEntities.flatMap((selectedEntity) => {
    const entity = dxfData.entities[selectedEntity.index];
    if (!isCurveEditableEntity(entity)) {
      return [];
    }

    const endpoints = getCurveEndpoints(entity);
    const controls = getCurveControlPoints(entity);
    if (!endpoints || !controls) {
      return [];
    }

    return [
      {
        id: buildCurveHandleId(selectedEntity.id, 'control1'),
        entityId: selectedEntity.id,
        entityIndex: selectedEntity.index,
        role: 'control1',
        point: controls.control1,
        startPoint: endpoints.startPoint,
        endPoint: endpoints.endPoint
      },
      {
        id: buildCurveHandleId(selectedEntity.id, 'control2'),
        entityId: selectedEntity.id,
        entityIndex: selectedEntity.index,
        role: 'control2',
        point: controls.control2,
        startPoint: endpoints.startPoint,
        endPoint: endpoints.endPoint
      }
    ];
  });
};

export const findEditableCurveHandleAtPoint = (
  handles: EditableCurveHandle[],
  point: Point2D,
  scale: number
): EditableCurveHandle | null => {
  const tolerance = CURVE_PICK_RADIUS_PX / Math.max(scale, 0.0001);
  let nearestHandle: EditableCurveHandle | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  handles.forEach((handle) => {
    const distance = calculateDistance(point, handle.point);
    if (distance > tolerance || distance >= nearestDistance) {
      return;
    }

    nearestHandle = handle;
    nearestDistance = distance;
  });

  return nearestHandle;
};

export const applyCurveEditToEntity = (
  entity: DXFEntity,
  role: EditableCurveHandleRole,
  targetPoint: Point2D
): DXFEntity => {
  if (!isCurveEditableEntity(entity)) {
    return entity;
  }

  const endpoints = getCurveEndpoints(entity);
  const controls = getCurveControlPoints(entity);
  if (!endpoints || !controls) {
    return entity;
  }

  const nextControl1 = role === 'control1' ? targetPoint : controls.control1;
  const nextControl2 = role === 'control2' ? targetPoint : controls.control2;
  const nextEntity = buildBezierEntity(
    endpoints.startPoint,
    nextControl1,
    nextControl2,
    endpoints.endPoint,
    entity.layer
  );

  return {
    ...entity,
    properties: {
      ...entity.properties,
      ...nextEntity.properties
    }
  };
};
