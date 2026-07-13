import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { DXFData, DXFEntity } from '@/graphics-engine/shared/dxf';
import type { ViewerEntityTransformHandler, ViewerEntityTranslateHandler } from '@/graphics-engine/components/viewer-dxf/viewerEntityCallbacks';
import type { ViewerDXFProps } from '@/graphics-engine/components/viewer-dxf/types';
import type { ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/viewerState';
import type { EntityBounds } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import {
  buildEntitySelectionId,
  buildSelectedEntityInfo,
  findNearestSelectableEntityInfo,
  getEntityBounds
} from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import {
  buildRotationPreviewTransform,
  buildScalePreviewTransform,
  type EntityPreviewTransform,
  type SelectionHandleKind
} from '@/graphics-engine/components/viewer-dxf/selectionTransformUtils';

interface UseEmbeddedEntitySelectionParams {
  dxfData: DXFData | null;
  canSelectEntity?: (entity: DXFEntity) => boolean;
  onEntitySelectionChange?: ViewerDXFProps['onEntitySelectionChange'];
  onEntityTransform?: ViewerEntityTransformHandler;
  onEntityTranslate?: ViewerEntityTranslateHandler;
  scale: number;
  selectedEntityIdsOverride?: string[];
}

const EMPTY_SELECTED_ENTITIES: ViewerSelectedEntityInfo[] = [];

const mergeBounds = (current: EntityBounds | null, next: EntityBounds | null): EntityBounds | null => {
  if (!next) {
    return current;
  }

  if (!current) {
    return next;
  }

  return {
    minX: Math.min(current.minX, next.minX),
    minY: Math.min(current.minY, next.minY),
    maxX: Math.max(current.maxX, next.maxX),
    maxY: Math.max(current.maxY, next.maxY)
  };
};

export const useEmbeddedEntitySelection = ({
  dxfData,
  canSelectEntity,
  onEntitySelectionChange,
  onEntityTransform,
  onEntityTranslate,
  scale,
  selectedEntityIdsOverride
}: UseEmbeddedEntitySelectionParams) => {
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [draggingSelectedEntities, setDraggingSelectedEntities] = useState<{
    entity: ViewerSelectedEntityInfo;
    entities: ViewerSelectedEntityInfo[];
    startPoint: Point2D;
    currentPoint: Point2D;
  } | null>(null);
  const [activeEntityTransform, setActiveEntityTransform] = useState<{
    entity: ViewerSelectedEntityInfo;
    entities: ViewerSelectedEntityInfo[];
    handle: SelectionHandleKind;
    startPoint: Point2D;
    currentPoint: Point2D;
    proportionalScale: boolean;
    snapRotation: boolean;
    initialBounds: EntityBounds;
    previewTransform: EntityPreviewTransform;
  } | null>(null);
  const lastReportedSelectionKeyRef = useRef<string | null>(null);

  const selectedEntities = useMemo(() => {
    if (!dxfData || selectedEntityIds.length === 0) {
      return EMPTY_SELECTED_ENTITIES;
    }

    const selectedById = new Map<string, ViewerSelectedEntityInfo>();
    dxfData.entities.forEach((entity, index) => {
      if (canSelectEntity && !canSelectEntity(entity)) {
        return;
      }
      const info = buildSelectedEntityInfo(entity, index);
      selectedById.set(info.id, info);
    });

    return selectedEntityIds
      .map((selectedId) => selectedById.get(selectedId) || null)
      .filter((entity): entity is ViewerSelectedEntityInfo => entity !== null);
  }, [canSelectEntity, dxfData, selectedEntityIds]);

  const primarySelectedEntity = selectedEntities[selectedEntities.length - 1] || null;

  useEffect(() => {
    if (!dxfData) {
      if (selectedEntityIds.length > 0) {
        setSelectedEntityIds([]);
      }
      return;
    }

    const availableIds = new Set<string>();
    dxfData.entities.forEach((entity, index) => {
      if (canSelectEntity && !canSelectEntity(entity)) {
        return;
      }
      availableIds.add(buildEntitySelectionId(entity, index));
    });
    const nextSelectedIds = selectedEntityIds.filter((selectedId) => availableIds.has(selectedId));

    if (
      nextSelectedIds.length !== selectedEntityIds.length ||
      nextSelectedIds.some((selectedId, index) => selectedId !== selectedEntityIds[index])
    ) {
      setSelectedEntityIds(nextSelectedIds);
    }
  }, [canSelectEntity, dxfData, selectedEntityIds]);

  useEffect(() => {
    const selectionKey = selectedEntityIds.join('|');
    if (lastReportedSelectionKeyRef.current === selectionKey) {
      return;
    }

    lastReportedSelectionKeyRef.current = selectionKey;
    onEntitySelectionChange?.({
      primaryEntity: primarySelectedEntity,
      selectedEntities
    });
  }, [onEntitySelectionChange, primarySelectedEntity, selectedEntities, selectedEntityIds]);

  useEffect(() => {
    if (selectedEntityIdsOverride === undefined) {
      return;
    }

    setSelectedEntityIds((current) => {
      if (
        current.length === selectedEntityIdsOverride.length &&
        current.every((selectedId, index) => selectedId === selectedEntityIdsOverride[index])
      ) {
        return current;
      }

      return selectedEntityIdsOverride;
    });
  }, [selectedEntityIdsOverride]);

  const findNearestSelectableEntity = useCallback((dxfCoords: Point2D): ViewerSelectedEntityInfo | null => {
    if (!dxfData) {
      return null;
    }
    return findNearestSelectableEntityInfo(
      dxfData.entities,
      dxfCoords,
      scale,
      canSelectEntity
    );
  }, [canSelectEntity, dxfData, scale]);

  const resolveSelectionIdsForEntity = useCallback((entityInfo: ViewerSelectedEntityInfo): string[] => {
    if (!dxfData || !entityInfo.groupId) {
      return [entityInfo.id];
    }

    const groupSelectionIds = dxfData.entities.reduce<string[]>((accumulator, entity, index) => {
      if (canSelectEntity && !canSelectEntity(entity)) {
        return accumulator;
      }

      const candidateInfo = buildSelectedEntityInfo(entity, index);
      if (candidateInfo.groupId === entityInfo.groupId) {
        accumulator.push(candidateInfo.id);
      }
      return accumulator;
    }, []);

    return groupSelectionIds.length > 0 ? groupSelectionIds : [entityInfo.id];
  }, [canSelectEntity, dxfData]);

  const handleEmbeddedEntitySelection = useCallback((nearestEntity: ViewerSelectedEntityInfo | null, additiveSelection: boolean) => {
    if (!nearestEntity) {
      if (!additiveSelection) {
        setSelectedEntityIds([]);
      }
      return;
    }

    const targetSelectionIds = resolveSelectionIdsForEntity(nearestEntity);

    setSelectedEntityIds((current) => {
      if (!additiveSelection) {
        return targetSelectionIds;
      }

      const isWholeTargetSelectionAlreadyActive = targetSelectionIds.every((selectedId) => current.includes(selectedId));
      if (isWholeTargetSelectionAlreadyActive) {
        return current.filter((selectedId) => !targetSelectionIds.includes(selectedId));
      }

      return Array.from(new Set([...current, ...targetSelectionIds]));
    });
  }, [resolveSelectionIdsForEntity]);

  const beginEntityDrag = useCallback((nearestEntity: ViewerSelectedEntityInfo, startPoint: Point2D) => {
    setDraggingSelectedEntities({
      entity: nearestEntity,
      entities: selectedEntities.some((entity) => entity.id === nearestEntity.id) ? selectedEntities : [nearestEntity],
      startPoint,
      currentPoint: startPoint
    });
  }, [selectedEntities]);

  const updateEntityDragPreview = useCallback((currentPoint: Point2D) => {
    setDraggingSelectedEntities((current) => {
      if (!current) {
        return current;
      }

      if (
        Math.abs(current.currentPoint.x - currentPoint.x) <= 0.0001
        && Math.abs(current.currentPoint.y - currentPoint.y) <= 0.0001
      ) {
        return current;
      }

      return {
        ...current,
        currentPoint
      };
    });
  }, []);

  const commitEntityDrag = useCallback((endPoint: Point2D) => {
    if (!draggingSelectedEntities) {
      return null;
    }

    const deltaX = endPoint.x - draggingSelectedEntities.startPoint.x;
    const deltaY = endPoint.y - draggingSelectedEntities.startPoint.y;
    if (Math.abs(deltaX) <= 0.001 && Math.abs(deltaY) <= 0.001) {
      return null;
    }

    onEntityTranslate?.({
      entity: draggingSelectedEntities.entity,
      entities: draggingSelectedEntities.entities,
      deltaX,
      deltaY
    });

    return { deltaX, deltaY };
  }, [draggingSelectedEntities, onEntityTranslate]);

  const endEntityDrag = useCallback(() => {
    setDraggingSelectedEntities(null);
  }, []);

  const beginEntityTransform = useCallback((params: {
    entity: ViewerSelectedEntityInfo;
    startPoint: Point2D;
    handle: SelectionHandleKind;
  }) => {
    if (!dxfData) {
      return false;
    }

    const entitiesForTransform = selectedEntities.some((entity) => entity.id === params.entity.id)
      ? selectedEntities
      : [params.entity];
    const initialBounds = entitiesForTransform.reduce<EntityBounds | null>((bounds, entityInfo) => {
      const sourceEntity = dxfData.entities[entityInfo.index];
      if (!sourceEntity) {
        return bounds;
      }
      return mergeBounds(bounds, getEntityBounds(sourceEntity));
    }, null);
    if (!initialBounds) {
      return false;
    }

    const previewTransform = params.handle === 'rotate'
      ? buildRotationPreviewTransform(initialBounds, params.startPoint, params.startPoint)
      : buildScalePreviewTransform(initialBounds, scale, params.handle, params.startPoint);

    setActiveEntityTransform({
      entity: params.entity,
      entities: entitiesForTransform,
      handle: params.handle,
      startPoint: params.startPoint,
      currentPoint: params.startPoint,
      proportionalScale: false,
      snapRotation: false,
      initialBounds,
      previewTransform
    });
    return true;
  }, [dxfData, scale, selectedEntities]);

  const updateEntityTransformPreview = useCallback((
    currentPoint: Point2D,
    forceRotate = false,
    proportional = false,
    snapRotation = false
  ) => {
    setActiveEntityTransform((current) => {
      if (!current) {
        return current;
      }

      const nextPreviewTransform = current.handle === 'rotate' || forceRotate
        ? buildRotationPreviewTransform(current.initialBounds, current.startPoint, currentPoint, snapRotation)
        : buildScalePreviewTransform(
            current.initialBounds,
            scale,
            current.handle as Exclude<SelectionHandleKind, 'rotate'>,
            currentPoint,
            proportional
          );

      return {
        ...current,
        currentPoint,
        proportionalScale: proportional && current.handle !== 'rotate' && !forceRotate,
        snapRotation: snapRotation && (current.handle === 'rotate' || forceRotate),
        previewTransform: nextPreviewTransform
      };
    });
  }, [scale]);

  const commitEntityTransform = useCallback(() => {
    if (!activeEntityTransform) {
      return false;
    }

    const previewTransform = activeEntityTransform.previewTransform;
    if (previewTransform.mode === 'rotate' && Math.abs(previewTransform.rotationDegrees) <= 0.1) {
      return false;
    }

    if (
      previewTransform.mode === 'scale'
      && Math.abs(previewTransform.scaleX - 1) <= 0.001
      && Math.abs(previewTransform.scaleY - 1) <= 0.001
    ) {
      return false;
    }

    onEntityTransform?.({
      entity: activeEntityTransform.entity,
      entities: activeEntityTransform.entities,
      previewTransform
    });
    return true;
  }, [activeEntityTransform, onEntityTransform]);

  const endEntityTransform = useCallback(() => {
    setActiveEntityTransform(null);
  }, []);

  return {
    activeEntityTransform,
    beginEntityDrag,
    beginEntityTransform,
    commitEntityDrag,
    commitEntityTransform,
    draggingSelectedEntities,
    endEntityDrag,
    endEntityTransform,
    findNearestSelectableEntity,
    handleEmbeddedEntitySelection,
    primarySelectedEntity,
    selectedEntities,
    selectedEntityIds,
    setSelectedEntityIds,
    updateEntityDragPreview,
    updateEntityTransformPreview
  };
};
