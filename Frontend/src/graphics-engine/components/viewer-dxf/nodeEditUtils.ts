import type { DXFData, DXFEntity, DXFEntityProperties, DXFVertex } from '@/graphics-engine/shared/dxf';
import { calculateDistance } from '@/graphics-engine/shared/geometry';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';

export type EditableNodeRole = 'start' | 'end' | 'vertex';

export interface EditableNodeHandle {
  id: string;
  entityId: string;
  entityIndex: number;
  entityType: string;
  role: EditableNodeRole;
  vertexIndex?: number;
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

const buildHandleId = (entityId: string, role: EditableNodeRole, vertexIndex?: number) => (
  `${entityId}::${role}${typeof vertexIndex === 'number' ? `::${vertexIndex}` : ''}`
);

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
          vertexIndex: 0,
          point: { x: props.x1 as number, y: props.y1 as number }
        },
        {
          id: buildHandleId(selectedEntity.id, 'end'),
          entityId: selectedEntity.id,
          entityIndex: selectedEntity.index,
          entityType: entity.type,
          role: 'end' as const,
          vertexIndex: 1,
          point: { x: props.x2 as number, y: props.y2 as number }
        }
      ];
    }

    if (!props.vertices?.length) {
      return [];
    }

    return props.vertices.map((vertex, index) => ({
      id: buildHandleId(
        selectedEntity.id,
        index === 0 ? 'start' : index === props.vertices!.length - 1 ? 'end' : 'vertex',
        index
      ),
      entityId: selectedEntity.id,
      entityIndex: selectedEntity.index,
      entityType: entity.type,
      role: index === 0 ? 'start' as const : index === props.vertices!.length - 1 ? 'end' as const : 'vertex' as const,
      vertexIndex: index,
      point: { x: vertex.x, y: vertex.y }
    }));
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
  vertexIndex: number | undefined,
  targetPoint: Point2D
): DXFVertex[] => vertices.map((vertex, index) => {
  const resolvedVertexIndex = typeof vertexIndex === 'number'
    ? vertexIndex
    : role === 'start'
      ? 0
      : vertices.length - 1;
  const isTargetVertex = index === resolvedVertexIndex;
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
  vertexIndex: number | undefined,
  targetPoint: Point2D
): DXFEntity => {
  const props = entity.properties as DXFEntityProperties;

  if (entity.type === 'LINE') {
    const resolvedVertexIndex = typeof vertexIndex === 'number'
      ? vertexIndex
      : role === 'end'
        ? 1
        : 0;
    const isStart = resolvedVertexIndex === 0;
    return {
      ...entity,
      properties: {
        ...props,
        x: isStart ? targetPoint.x : props.x,
        y: isStart ? targetPoint.y : props.y,
        x1: isStart ? targetPoint.x : props.x1,
        y1: isStart ? targetPoint.y : props.y1,
        x2: !isStart ? targetPoint.x : props.x2,
        y2: !isStart ? targetPoint.y : props.y2
      }
    };
  }

  if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && props.vertices?.length) {
    const nextVertices = cloneVerticesWithUpdatedEndpoint(props.vertices, role, vertexIndex, targetPoint);
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


