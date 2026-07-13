import type { DXFData, DXFEntity, DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';
import { calculateDistance } from '@/graphics-engine/shared/geometry';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';

export type EditableNodeRole = 'start' | 'end';

export interface EditableNodeHandle {
  id: string;
  entityId: string;
  entityIndex: number;
  entityType: string;
  role: EditableNodeRole;
  point: Point2D;
}

const NODE_PICK_RADIUS_PX = 18;

export const isNodeEditableEntity = (entity: DXFEntity | null | undefined): boolean => {
  if (!entity) {
    return false;
  }

  const props = entity.properties as DXFEntityProperties;
  if (entity.type === 'LINE') {
    return typeof props.x1 === 'number'
      && typeof props.y1 === 'number'
      && typeof props.x2 === 'number'
      && typeof props.y2 === 'number';
  }

  if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices && props.vertices.length >= 2) {
    return !props.closed;
  }

  return false;
};

const buildHandleId = (entityId: string, role: EditableNodeRole) => `${entityId}::${role}`;

export const getEditableNodeHandles = (
  dxfData: DXFData | null,
  selectedEntities: ViewerSelectedEntityInfo[]
): EditableNodeHandle[] => {
  if (!dxfData || selectedEntities.length === 0) {
    return [];
  }

  return selectedEntities.flatMap((selectedEntity) => {
    const entity = dxfData.entities[selectedEntity.index];
    if (!isNodeEditableEntity(entity)) {
      return [];
    }

    const props = entity.properties as DXFEntityProperties;
    if (entity.type === 'LINE') {
      return [
        {
          id: buildHandleId(selectedEntity.id, 'start'),
          entityId: selectedEntity.id,
          entityIndex: selectedEntity.index,
          entityType: entity.type,
          role: 'start' as const,
          point: { x: props.x1 as number, y: props.y1 as number }
        },
        {
          id: buildHandleId(selectedEntity.id, 'end'),
          entityId: selectedEntity.id,
          entityIndex: selectedEntity.index,
          entityType: entity.type,
          role: 'end' as const,
          point: { x: props.x2 as number, y: props.y2 as number }
        }
      ];
    }

    const firstVertex = props.vertices?.[0];
    const lastVertex = props.vertices?.[props.vertices.length - 1];
    if (!firstVertex || !lastVertex) {
      return [];
    }

    return [
      {
        id: buildHandleId(selectedEntity.id, 'start'),
        entityId: selectedEntity.id,
        entityIndex: selectedEntity.index,
        entityType: entity.type,
        role: 'start' as const,
        point: { x: firstVertex.x, y: firstVertex.y }
      },
      {
        id: buildHandleId(selectedEntity.id, 'end'),
        entityId: selectedEntity.id,
        entityIndex: selectedEntity.index,
        entityType: entity.type,
        role: 'end' as const,
        point: { x: lastVertex.x, y: lastVertex.y }
      }
    ];
  });
};

export const findEditableNodeHandleAtPoint = (
  handles: EditableNodeHandle[],
  point: Point2D,
  scale: number
): EditableNodeHandle | null => {
  const tolerance = NODE_PICK_RADIUS_PX / Math.max(scale, 0.0001);
  let nearestHandle: EditableNodeHandle | null = null;
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

export const findNearestNodeSnapTarget = (
  handles: EditableNodeHandle[],
  point: Point2D,
  scale: number,
  excludeHandleId?: string | null
): EditableNodeHandle | null => {
  const tolerance = NODE_PICK_RADIUS_PX / Math.max(scale, 0.0001);
  let nearestHandle: EditableNodeHandle | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  handles.forEach((handle) => {
    if (excludeHandleId && handle.id === excludeHandleId) {
      return;
    }
    const distance = calculateDistance(point, handle.point);
    if (distance > tolerance || distance >= nearestDistance) {
      return;
    }
    nearestHandle = handle;
    nearestDistance = distance;
  });

  return nearestHandle;
};

const cloneVerticesWithUpdatedEndpoint = (
  vertices: DXFVertex[],
  role: EditableNodeRole,
  targetPoint: Point2D
): DXFVertex[] => vertices.map((vertex, index) => {
  const isTargetVertex = role === 'start' ? index === 0 : index === vertices.length - 1;
  if (!isTargetVertex) {
    return { ...vertex };
  }
  return {
    ...vertex,
    x: targetPoint.x,
    y: targetPoint.y
  };
});

export const applyNodeEditToEntity = (
  entity: DXFEntity,
  role: EditableNodeRole,
  targetPoint: Point2D
): DXFEntity => {
  const props = entity.properties as DXFEntityProperties;

  if (entity.type === 'LINE') {
    return {
      ...entity,
      properties: {
        ...props,
        x: role === 'start' ? targetPoint.x : props.x,
        y: role === 'start' ? targetPoint.y : props.y,
        x1: role === 'start' ? targetPoint.x : props.x1,
        y1: role === 'start' ? targetPoint.y : props.y1,
        x2: role === 'end' ? targetPoint.x : props.x2,
        y2: role === 'end' ? targetPoint.y : props.y2
      }
    };
  }

  if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices?.length) {
    const nextVertices = cloneVerticesWithUpdatedEndpoint(props.vertices, role, targetPoint);
    return {
      ...entity,
      properties: {
        ...props,
        x: nextVertices[0]?.x,
        y: nextVertices[0]?.y,
        vertices: nextVertices
      }
    };
  }

  return entity;
};


