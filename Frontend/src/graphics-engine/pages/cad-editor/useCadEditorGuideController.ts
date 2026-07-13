import { useCallback, useEffect } from 'react';
import type React from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { findNearestSelectableEntityInfo } from '@/graphics-engine/components/viewer-dxf/entitySelectionUtils';
import type { EmbeddedCadToolMode, ViewerSelectedEntityInfo } from '@/graphics-engine/components/viewer-dxf/types';
import type {
  CadOpenedDocument,
  CadViewportState,
  CadEntityContextMenuState,
  CadGuideContextMenuState
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import {
  type CadGuide,
  type CadRulerInteraction,
  GUIDE_SELECTION_DRAG_THRESHOLD_PX,
  projectPointOntoSegment,
  RULER_GUIDE_OBJECT_SNAP_DISTANCE_PX,
  RULER_GUIDE_PICK_DISTANCE_PX
} from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';
import { findNearestPoint } from '@/graphics-engine/shared/geometry';
import type { DXFData, DXFEntity } from '@/graphics-engine/shared/dxf';

type PendingCanvasGuideDrag = {
  guide: CadGuide;
  startClientX: number;
  startClientY: number;
} | null;

export interface UseCadEditorGuideControllerParams {
  canvasAreaRef: RefObject<HTMLDivElement>;
  canvasAreaSize: { width: number; height: number };
  viewerViewportState: CadViewportState;
  currentEditorData: DXFData | null;
  openedDocument: CadOpenedDocument | null;
  embeddedToolMode: EmbeddedCadToolMode;
  guidesVisible: boolean;
  enableObjectSnap: boolean;
  rulerGuides: CadGuide[];
  rulerGuidePreview: CadGuide | null;
  selectedGuideId: string | null;
  hoveredGuideId: string | null;
  selectedEntities: ViewerSelectedEntityInfo[];
  rulerGuideSnapVertices: Array<{ x: number; y: number }>;
  rulerGuideSnapSegments: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>;
  rulerInteractionRef: MutableRefObject<CadRulerInteraction | null>;
  suppressViewerCanvasClickRef: MutableRefObject<boolean>;
  pendingCanvasGuideDragRef: MutableRefObject<PendingCanvasGuideDrag>;
  setRulerOrigin: Dispatch<SetStateAction<{ x: number; y: number }>>;
  setRulerGuides: Dispatch<SetStateAction<CadGuide[]>>;
  setRulerGuidePreview: Dispatch<SetStateAction<CadGuide | null>>;
  setSelectedGuideId: Dispatch<SetStateAction<string | null>>;
  setHoveredGuideId: Dispatch<SetStateAction<string | null>>;
  setGuideContextMenu: Dispatch<SetStateAction<CadGuideContextMenuState | null>>;
  setEntityContextMenu: Dispatch<SetStateAction<CadEntityContextMenuState | null>>;
  setSelectedEntities: Dispatch<SetStateAction<ViewerSelectedEntityInfo[]>>;
  setViewerSelectionOverride: Dispatch<SetStateAction<string[] | undefined>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  canInteractWithEntity?: (entity: DXFEntity) => boolean;
  messages?: {
    buildGuideToggleLockedNotice: (params: { orientation: CadGuide['orientation']; locked: boolean }) => string;
    buildGuideLockedToRemoveNotice: (params: { orientation: CadGuide['orientation'] }) => string;
    clearSelectedGuideNotice: string;
    buildGuideLockedNotice: (params: { orientation: CadGuide['orientation'] }) => string;
    buildGuideSelectedNotice: (params: { orientation: CadGuide['orientation'] }) => string;
    buildEntityContextMenuNotice: (params: {
      nearestEntityType: string | null;
      selectedEntitiesCount: number;
      selectedEntityType: string | null;
    }) => string;
    buildGuideContextMenuNotice: (params: { orientation: CadGuide['orientation'] }) => string;
    horizontalGuideLockedToMoveNotice: string;
    verticalGuideLockedToMoveNotice: string;
    buildGuideRemovedNotice: (params: { orientation: CadGuide['orientation'] }) => string;
    buildGuideCreationCancelledNotice: (params: { orientation: CadGuide['orientation'] }) => string;
    buildGuideRepositionedNotice: (params: { orientation: CadGuide['orientation'] }) => string;
    buildGuideCreatedNotice: (params: { orientation: CadGuide['orientation'] }) => string;
  };
}

const DEFAULT_GUIDE_CONTROLLER_MESSAGES: NonNullable<UseCadEditorGuideControllerParams['messages']> = {
  buildGuideToggleLockedNotice: ({ orientation, locked }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} ${locked ? 'travada' : 'destravada'}.`,
  buildGuideLockedToRemoveNotice: ({ orientation }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} travada. Destrave para remover.`,
  clearSelectedGuideNotice: 'Guia desmarcada.',
  buildGuideLockedNotice: ({ orientation }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} travada.`,
  buildGuideSelectedNotice: ({ orientation }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} selecionada.`,
  buildEntityContextMenuNotice: ({ nearestEntityType, selectedEntitiesCount, selectedEntityType }) => (
    nearestEntityType
      ? `Menu contextual da entidade ${nearestEntityType} aberto.`
      : selectedEntitiesCount > 1
        ? `Menu contextual de ${selectedEntitiesCount} entidades aberto.`
        : `Menu contextual da entidade ${selectedEntityType || 'selecionada'} aberto.`
  ),
  buildGuideContextMenuNotice: ({ orientation }) => `Menu contextual da guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} aberto.`,
  horizontalGuideLockedToMoveNotice: 'Guia horizontal travada. Destrave para mover.',
  verticalGuideLockedToMoveNotice: 'Guia vertical travada. Destrave para mover.',
  buildGuideRemovedNotice: ({ orientation }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} removida.`,
  buildGuideCreationCancelledNotice: ({ orientation }) => `Criacao da guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} cancelada.`,
  buildGuideRepositionedNotice: ({ orientation }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} reposicionada.`,
  buildGuideCreatedNotice: ({ orientation }) => `Guia ${orientation === 'vertical' ? 'vertical' : 'horizontal'} criada.`
};

export const useCadEditorGuideController = ({
  canvasAreaRef,
  canvasAreaSize,
  viewerViewportState,
  currentEditorData,
  openedDocument,
  embeddedToolMode,
  guidesVisible,
  enableObjectSnap,
  rulerGuides,
  rulerGuidePreview,
  selectedGuideId,
  hoveredGuideId,
  selectedEntities,
  rulerGuideSnapVertices,
  rulerGuideSnapSegments,
  rulerInteractionRef,
  suppressViewerCanvasClickRef,
  pendingCanvasGuideDragRef,
  setRulerOrigin,
  setRulerGuides,
  setRulerGuidePreview,
  setSelectedGuideId,
  setHoveredGuideId,
  setGuideContextMenu,
  setEntityContextMenu,
  setSelectedEntities,
  setViewerSelectionOverride,
  setEditorNotice,
  canInteractWithEntity,
  messages
}: UseCadEditorGuideControllerParams) => {
  const resolvedMessages = messages ?? DEFAULT_GUIDE_CONTROLLER_MESSAGES;
  const getWorldPointFromClient = useCallback((clientX: number, clientY: number) => {
    if (!canvasAreaRef.current || canvasAreaSize.width <= 0 || canvasAreaSize.height <= 0 || viewerViewportState.scale <= 0) {
      return null;
    }

    const rect = canvasAreaRef.current.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    return {
      x: viewerViewportState.centerX + (localX - (canvasAreaSize.width / 2 + viewerViewportState.panX)) / viewerViewportState.scale,
      y: viewerViewportState.centerY + ((canvasAreaSize.height / 2 + viewerViewportState.panY) - localY) / viewerViewportState.scale
    };
  }, [canvasAreaRef, canvasAreaSize.height, canvasAreaSize.width, viewerViewportState.centerX, viewerViewportState.centerY, viewerViewportState.panX, viewerViewportState.panY, viewerViewportState.scale]);

  const updateRulerOriginFromClient = useCallback((clientX: number, clientY: number) => {
    const worldPoint = getWorldPointFromClient(clientX, clientY);
    if (!worldPoint) {
      return;
    }

    setRulerOrigin(worldPoint);
  }, [getWorldPointFromClient, setRulerOrigin]);

  const findNearestEntityFromClient = useCallback((clientX: number, clientY: number) => {
    if (!currentEditorData) {
      return null;
    }

    const worldPoint = getWorldPointFromClient(clientX, clientY);
    if (!worldPoint) {
      return null;
    }

    return findNearestSelectableEntityInfo(
      currentEditorData.entities,
      worldPoint,
      viewerViewportState.scale,
      canInteractWithEntity
    );
  }, [canInteractWithEntity, currentEditorData, getWorldPointFromClient, viewerViewportState.scale]);

  const isClientPointInsideCanvasArea = useCallback((clientX: number, clientY: number) => {
    const rect = canvasAreaRef.current?.getBoundingClientRect();
    if (!rect) {
      return false;
    }

    return clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom;
  }, [canvasAreaRef]);

  const buildRulerGuideFromClient = useCallback((
    orientation: CadGuide['orientation'],
    clientX: number,
    clientY: number,
    guideId?: string
  ): CadGuide | null => {
    const worldPoint = getWorldPointFromClient(clientX, clientY);
    if (!worldPoint) {
      return null;
    }

    let position = orientation === 'vertical' ? worldPoint.x : worldPoint.y;
    const snapDistance = RULER_GUIDE_OBJECT_SNAP_DISTANCE_PX / Math.max(viewerViewportState.scale, 0.0001);

    if (enableObjectSnap) {
      const nearestVertex = findNearestPoint(worldPoint, rulerGuideSnapVertices, snapDistance);
      let bestAxisDistance = Number.POSITIVE_INFINITY;

      if (nearestVertex) {
        const vertexAxisPosition = orientation === 'vertical' ? nearestVertex.x : nearestVertex.y;
        bestAxisDistance = Math.abs(position - vertexAxisPosition);
        position = vertexAxisPosition;
      }

      rulerGuideSnapSegments.forEach((segment) => {
        const projectedPoint = projectPointOntoSegment(worldPoint, segment.start, segment.end);
        const projectionDistance = Math.hypot(projectedPoint.x - worldPoint.x, projectedPoint.y - worldPoint.y);
        if (projectionDistance > snapDistance) {
          return;
        }

        const projectedAxisPosition = orientation === 'vertical' ? projectedPoint.x : projectedPoint.y;
        const axisDistance = Math.abs((orientation === 'vertical' ? worldPoint.x : worldPoint.y) - projectedAxisPosition);
        if (axisDistance < bestAxisDistance) {
          bestAxisDistance = axisDistance;
          position = projectedAxisPosition;
        }
      });
    }

    const existingGuide = guideId ? rulerGuides.find((guide) => guide.id === guideId) : null;

    return {
      id: guideId || `${orientation}-${Date.now()}`,
      orientation,
      position,
      locked: existingGuide?.locked ?? false
    };
  }, [enableObjectSnap, getWorldPointFromClient, rulerGuideSnapSegments, rulerGuideSnapVertices, rulerGuides, viewerViewportState.scale]);

  const findNearestRulerGuide = useCallback((
    orientation: CadGuide['orientation'],
    clientX: number,
    clientY: number
  ): CadGuide | null => {
    if (!canvasAreaRef.current || viewerViewportState.scale <= 0) {
      return null;
    }

    const rect = canvasAreaRef.current.getBoundingClientRect();
    const pointerScreenPosition = orientation === 'vertical'
      ? clientX - rect.left
      : clientY - rect.top;

    let bestGuide: CadGuide | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    rulerGuides.forEach((guide) => {
      if (guide.orientation !== orientation) {
        return;
      }

      const guideScreenPosition = orientation === 'vertical'
        ? canvasAreaSize.width / 2 + viewerViewportState.panX + (guide.position - viewerViewportState.centerX) * viewerViewportState.scale
        : canvasAreaSize.height / 2 + viewerViewportState.panY - (guide.position - viewerViewportState.centerY) * viewerViewportState.scale;
      const distance = Math.abs(pointerScreenPosition - guideScreenPosition);

      if (distance <= RULER_GUIDE_PICK_DISTANCE_PX && distance < bestDistance) {
        bestGuide = guide;
        bestDistance = distance;
      }
    });

    return bestGuide;
  }, [canvasAreaRef, canvasAreaSize.height, canvasAreaSize.width, rulerGuides, viewerViewportState.centerX, viewerViewportState.centerY, viewerViewportState.panX, viewerViewportState.panY, viewerViewportState.scale]);

  const findNearestCanvasGuide = useCallback((clientX: number, clientY: number): CadGuide | null => {
    if (!canvasAreaRef.current || viewerViewportState.scale <= 0 || !guidesVisible) {
      return null;
    }

    const rect = canvasAreaRef.current.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }

    let bestGuide: CadGuide | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    rulerGuides.forEach((guide) => {
      const guideScreenPosition = guide.orientation === 'vertical'
        ? rect.left + canvasAreaSize.width / 2 + viewerViewportState.panX + (guide.position - viewerViewportState.centerX) * viewerViewportState.scale
        : rect.top + canvasAreaSize.height / 2 + viewerViewportState.panY - (guide.position - viewerViewportState.centerY) * viewerViewportState.scale;
      const distance = Math.abs((guide.orientation === 'vertical' ? clientX : clientY) - guideScreenPosition);

      if (distance <= RULER_GUIDE_PICK_DISTANCE_PX && distance < bestDistance) {
        bestGuide = guide;
        bestDistance = distance;
      }
    });

    return bestGuide;
  }, [canvasAreaRef, canvasAreaSize.height, canvasAreaSize.width, guidesVisible, rulerGuides, viewerViewportState.centerX, viewerViewportState.centerY, viewerViewportState.panX, viewerViewportState.panY, viewerViewportState.scale]);

  const toggleGuideLocked = useCallback((guideId: string) => {
    const guideToToggle = rulerGuides.find((guide) => guide.id === guideId);
    if (!guideToToggle) {
      return;
    }

    const nextLocked = !guideToToggle.locked;
    setRulerGuides((current) => current.map((guide) => (
      guide.id === guideId ? { ...guide, locked: nextLocked } : guide
    )));
    setRulerGuidePreview((current) => (current?.id === guideId ? { ...current, locked: nextLocked } : current));
    if (nextLocked) {
      pendingCanvasGuideDragRef.current = null;
      if (rulerInteractionRef.current?.mode === 'guide' && rulerInteractionRef.current.guideId === guideId) {
        rulerInteractionRef.current = null;
      }
    }
    setEditorNotice(resolvedMessages.buildGuideToggleLockedNotice({
      orientation: guideToToggle.orientation,
      locked: nextLocked
    }));
  }, [pendingCanvasGuideDragRef, resolvedMessages, rulerGuides, rulerInteractionRef, setEditorNotice, setRulerGuidePreview, setRulerGuides]);

  const removeGuideById = useCallback((guideId: string) => {
    const guideToRemove = rulerGuides.find((guide) => guide.id === guideId);
    if (!guideToRemove) {
      return;
    }
    if (guideToRemove.locked) {
      setEditorNotice(resolvedMessages.buildGuideLockedToRemoveNotice({ orientation: guideToRemove.orientation }));
      return;
    }

    pendingCanvasGuideDragRef.current = null;
    if (rulerInteractionRef.current?.mode === 'guide' && rulerInteractionRef.current.guideId === guideId) {
      rulerInteractionRef.current = null;
    }
    setRulerGuides((current) => current.filter((guide) => guide.id !== guideId));
    setRulerGuidePreview((current) => (current?.id === guideId ? null : current));
    setSelectedGuideId((current) => (current === guideId ? null : current));
    setHoveredGuideId((current) => (current === guideId ? null : current));
    setGuideContextMenu((current) => (current?.guideId === guideId ? null : current));
    setEditorNotice(resolvedMessages.buildGuideRemovedNotice({ orientation: guideToRemove.orientation }));
  }, [
    pendingCanvasGuideDragRef,
    resolvedMessages,
    rulerGuides,
    rulerInteractionRef,
    setEditorNotice,
    setGuideContextMenu,
    setHoveredGuideId,
    setRulerGuidePreview,
    setRulerGuides,
    setSelectedGuideId
  ]);

  const clearSelectedGuide = useCallback(() => {
    if (!selectedGuideId) {
      setGuideContextMenu(null);
      return;
    }

    pendingCanvasGuideDragRef.current = null;
    if (rulerInteractionRef.current?.mode === 'guide' && rulerInteractionRef.current.guideId === selectedGuideId) {
      rulerInteractionRef.current = null;
    }
    setRulerGuidePreview((current) => (current?.id === selectedGuideId ? null : current));
    setHoveredGuideId(null);
    setSelectedGuideId(null);
    setGuideContextMenu(null);
    setEditorNotice(resolvedMessages.clearSelectedGuideNotice);
  }, [
    pendingCanvasGuideDragRef,
    resolvedMessages,
    rulerInteractionRef,
    selectedGuideId,
    setEditorNotice,
    setGuideContextMenu,
    setHoveredGuideId,
    setRulerGuidePreview,
    setSelectedGuideId
  ]);

  const handleCanvasAreaMouseDownCapture: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.button !== 0 || !openedDocument || embeddedToolMode !== 'select' || rulerInteractionRef.current) {
      return;
    }

    setGuideContextMenu(null);
    setEntityContextMenu(null);
    const nearestGuide = findNearestCanvasGuide(event.clientX, event.clientY);
    if (!nearestGuide) {
      suppressViewerCanvasClickRef.current = false;
      if (selectedGuideId) {
        setSelectedGuideId(null);
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressViewerCanvasClickRef.current = true;
    setSelectedGuideId(nearestGuide.id);
    pendingCanvasGuideDragRef.current = null;
    if (nearestGuide.locked) {
      setEditorNotice(resolvedMessages.buildGuideLockedNotice({ orientation: nearestGuide.orientation }));
      return;
    }
    pendingCanvasGuideDragRef.current = {
      guide: nearestGuide,
      startClientX: event.clientX,
      startClientY: event.clientY
    };
    setEditorNotice(resolvedMessages.buildGuideSelectedNotice({ orientation: nearestGuide.orientation }));
  }, [
    embeddedToolMode,
    findNearestCanvasGuide,
    openedDocument,
    pendingCanvasGuideDragRef,
    resolvedMessages,
    rulerInteractionRef,
    selectedGuideId,
    setEditorNotice,
    setEntityContextMenu,
    setGuideContextMenu,
    setSelectedGuideId,
    suppressViewerCanvasClickRef
  ]);

  const handleCanvasAreaContextMenuCapture: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    if (!openedDocument || embeddedToolMode !== 'select' || rulerInteractionRef.current) {
      return;
    }

    const nearestGuide = findNearestCanvasGuide(event.clientX, event.clientY);
    if (!nearestGuide) {
      setGuideContextMenu(null);
      const nearestEntity = findNearestEntityFromClient(event.clientX, event.clientY);
      const hasEntityUnderPointer = Boolean(nearestEntity);
      const shouldOpenEntityMenu = selectedEntities.length > 0 || hasEntityUnderPointer;
      if (shouldOpenEntityMenu) {
        event.preventDefault();
        event.stopPropagation();
        suppressViewerCanvasClickRef.current = true;
        setSelectedGuideId(null);
        if (
          nearestEntity
          && !selectedEntities.some((entity) => entity.id === nearestEntity.id)
        ) {
          setSelectedEntities([nearestEntity]);
          setViewerSelectionOverride([nearestEntity.id]);
        }
        setEntityContextMenu({
          clientX: event.clientX,
          clientY: event.clientY
        });
        setEditorNotice(resolvedMessages.buildEntityContextMenuNotice({
          nearestEntityType: nearestEntity && !selectedEntities.some((entity) => entity.id === nearestEntity.id)
            ? nearestEntity.type
            : null,
          selectedEntitiesCount: selectedEntities.length,
          selectedEntityType: selectedEntities[0]?.type || 'selecionada'
        }));
      } else {
        setEntityContextMenu(null);
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressViewerCanvasClickRef.current = true;
    pendingCanvasGuideDragRef.current = null;
    setEntityContextMenu(null);
    setSelectedGuideId(nearestGuide.id);
    setGuideContextMenu({
      guideId: nearestGuide.id,
      clientX: event.clientX,
      clientY: event.clientY
    });
    setEditorNotice(resolvedMessages.buildGuideContextMenuNotice({ orientation: nearestGuide.orientation }));
  }, [
    embeddedToolMode,
    findNearestCanvasGuide,
    openedDocument,
    currentEditorData,
    findNearestEntityFromClient,
    pendingCanvasGuideDragRef,
    resolvedMessages,
    rulerInteractionRef,
    selectedEntities,
    setEditorNotice,
    setEntityContextMenu,
    setGuideContextMenu,
    setSelectedEntities,
    setSelectedGuideId,
    setViewerSelectionOverride,
    suppressViewerCanvasClickRef
  ]);

  const handleCanvasAreaDoubleClickCapture: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    if (!openedDocument || embeddedToolMode !== 'select' || rulerInteractionRef.current) {
      return;
    }

    const nearestGuide = findNearestCanvasGuide(event.clientX, event.clientY);
    if (!nearestGuide) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressViewerCanvasClickRef.current = true;
    pendingCanvasGuideDragRef.current = null;
    setSelectedGuideId(nearestGuide.id);
    setGuideContextMenu(null);
    toggleGuideLocked(nearestGuide.id);
  }, [
    embeddedToolMode,
    findNearestCanvasGuide,
    openedDocument,
    pendingCanvasGuideDragRef,
    rulerInteractionRef,
    setGuideContextMenu,
    setSelectedGuideId,
    suppressViewerCanvasClickRef,
    toggleGuideLocked
  ]);

  const handleCanvasAreaClickCapture: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    if (!suppressViewerCanvasClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressViewerCanvasClickRef.current = false;
  }, [suppressViewerCanvasClickRef]);

  const handleCanvasAreaMouseMoveCapture: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    if (!openedDocument || embeddedToolMode !== 'select' || rulerInteractionRef.current || pendingCanvasGuideDragRef.current) {
      if (hoveredGuideId !== null) {
        setHoveredGuideId(null);
      }
      return;
    }

    const nearestGuide = findNearestCanvasGuide(event.clientX, event.clientY);
    setHoveredGuideId(nearestGuide?.id || null);
  }, [
    embeddedToolMode,
    findNearestCanvasGuide,
    hoveredGuideId,
    openedDocument,
    pendingCanvasGuideDragRef,
    rulerInteractionRef,
    setHoveredGuideId
  ]);

  const handleCanvasAreaMouseLeave: React.MouseEventHandler<HTMLDivElement> = useCallback(() => {
    if (hoveredGuideId !== null) {
      setHoveredGuideId(null);
    }
  }, [hoveredGuideId, setHoveredGuideId]);

  const handleRulerCornerMouseDown: React.MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
    if (!openedDocument || embeddedToolMode !== 'select') {
      return;
    }

    event.preventDefault();
    rulerInteractionRef.current = { mode: 'corner' };
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
  }, [embeddedToolMode, openedDocument, rulerInteractionRef]);

  const handleHorizontalRulerMouseDown: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    if (!openedDocument || embeddedToolMode !== 'select') {
      return;
    }

    event.preventDefault();
    const existingGuide = findNearestRulerGuide('horizontal', event.clientX, event.clientY);
    if (existingGuide?.locked) {
      setSelectedGuideId(existingGuide.id);
      setEditorNotice(resolvedMessages.horizontalGuideLockedToMoveNotice);
      return;
    }
    const guide = buildRulerGuideFromClient('horizontal', event.clientX, event.clientY, existingGuide?.id);
    if (!guide) {
      return;
    }

    rulerInteractionRef.current = {
      mode: 'guide',
      orientation: 'horizontal',
      guideId: existingGuide?.id || null,
      isExisting: Boolean(existingGuide),
      origin: 'ruler'
    };
    setSelectedGuideId(existingGuide?.id || null);
    setRulerGuidePreview(guide);
  }, [
    buildRulerGuideFromClient,
    embeddedToolMode,
    findNearestRulerGuide,
    openedDocument,
    resolvedMessages,
    rulerInteractionRef,
    setEditorNotice,
    setRulerGuidePreview,
    setSelectedGuideId
  ]);

  const handleVerticalRulerMouseDown: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
    if (!openedDocument || embeddedToolMode !== 'select') {
      return;
    }

    event.preventDefault();
    const existingGuide = findNearestRulerGuide('vertical', event.clientX, event.clientY);
    if (existingGuide?.locked) {
      setSelectedGuideId(existingGuide.id);
      setEditorNotice(resolvedMessages.verticalGuideLockedToMoveNotice);
      return;
    }
    const guide = buildRulerGuideFromClient('vertical', event.clientX, event.clientY, existingGuide?.id);
    if (!guide) {
      return;
    }

    rulerInteractionRef.current = {
      mode: 'guide',
      orientation: 'vertical',
      guideId: existingGuide?.id || null,
      isExisting: Boolean(existingGuide),
      origin: 'ruler'
    };
    setSelectedGuideId(existingGuide?.id || null);
    setRulerGuidePreview(guide);
  }, [
    buildRulerGuideFromClient,
    embeddedToolMode,
    findNearestRulerGuide,
    openedDocument,
    resolvedMessages,
    rulerInteractionRef,
    setEditorNotice,
    setRulerGuidePreview,
    setSelectedGuideId
  ]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!rulerInteractionRef.current && pendingCanvasGuideDragRef.current) {
        const pendingDrag = pendingCanvasGuideDragRef.current;
        const dx = event.clientX - pendingDrag.startClientX;
        const dy = event.clientY - pendingDrag.startClientY;
        const distance = Math.hypot(dx, dy);

        if (distance >= GUIDE_SELECTION_DRAG_THRESHOLD_PX) {
          rulerInteractionRef.current = {
            mode: 'guide',
            orientation: pendingDrag.guide.orientation,
            guideId: pendingDrag.guide.id,
            isExisting: true,
            origin: 'canvas'
          };
          setRulerGuidePreview(pendingDrag.guide);
          document.body.style.cursor = pendingDrag.guide.orientation === 'vertical' ? 'ew-resize' : 'ns-resize';
          document.body.style.userSelect = 'none';
        }
      }

      if (!rulerInteractionRef.current) {
        return;
      }

      if (rulerInteractionRef.current.mode === 'corner') {
        updateRulerOriginFromClient(event.clientX, event.clientY);
        document.body.style.cursor = 'move';
        document.body.style.userSelect = 'none';
        return;
      }

      const nextGuide = buildRulerGuideFromClient(
        rulerInteractionRef.current.orientation,
        event.clientX,
        event.clientY,
        rulerInteractionRef.current.guideId || undefined
      );
      if (nextGuide) {
        setRulerGuidePreview(nextGuide);
      }
      document.body.style.cursor = rulerInteractionRef.current.orientation === 'vertical' ? 'ew-resize' : 'ns-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (pendingCanvasGuideDragRef.current && !rulerInteractionRef.current) {
        pendingCanvasGuideDragRef.current = null;
      }
      suppressViewerCanvasClickRef.current = false;

      const activeRulerInteraction = rulerInteractionRef.current;
      if (activeRulerInteraction) {
        if (activeRulerInteraction.mode === 'guide' && rulerGuidePreview) {
          const releasedInsideCanvas = isClientPointInsideCanvasArea(event.clientX, event.clientY);

          if (!releasedInsideCanvas) {
            if (activeRulerInteraction.isExisting && activeRulerInteraction.guideId) {
              setRulerGuides((current) => current.filter((guide) => guide.id !== activeRulerInteraction.guideId));
              setSelectedGuideId(null);
              setEditorNotice(resolvedMessages.buildGuideRemovedNotice({ orientation: rulerGuidePreview.orientation }));
            } else {
              setSelectedGuideId(null);
              setEditorNotice(resolvedMessages.buildGuideCreationCancelledNotice({ orientation: rulerGuidePreview.orientation }));
            }
          } else if (activeRulerInteraction.isExisting) {
            setRulerGuides((current) => current.map((guide) => (
              guide.id === rulerGuidePreview.id ? rulerGuidePreview : guide
            )));
            setSelectedGuideId(rulerGuidePreview.id);
            setEditorNotice(resolvedMessages.buildGuideRepositionedNotice({ orientation: rulerGuidePreview.orientation }));
          } else {
            setRulerGuides((current) => [...current, rulerGuidePreview]);
            setSelectedGuideId(rulerGuidePreview.id);
            setEditorNotice(resolvedMessages.buildGuideCreatedNotice({ orientation: rulerGuidePreview.orientation }));
          }
        }

        rulerInteractionRef.current = null;
        pendingCanvasGuideDragRef.current = null;
        setRulerGuidePreview(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [
    buildRulerGuideFromClient,
    isClientPointInsideCanvasArea,
    pendingCanvasGuideDragRef,
    resolvedMessages,
    rulerGuidePreview,
    rulerInteractionRef,
    setEditorNotice,
    setRulerGuidePreview,
    setRulerGuides,
    setSelectedGuideId,
    suppressViewerCanvasClickRef,
    updateRulerOriginFromClient
  ]);

  return {
    toggleGuideLocked,
    removeGuideById,
    clearSelectedGuide,
    handleCanvasAreaMouseDownCapture,
    handleCanvasAreaContextMenuCapture,
    handleCanvasAreaDoubleClickCapture,
    handleCanvasAreaClickCapture,
    handleCanvasAreaMouseMoveCapture,
    handleCanvasAreaMouseLeave,
    handleRulerCornerMouseDown,
    handleHorizontalRulerMouseDown,
    handleVerticalRulerMouseDown
  };
};
