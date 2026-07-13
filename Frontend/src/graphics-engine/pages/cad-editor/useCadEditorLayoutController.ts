import { useCallback, useEffect } from 'react';
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  RefObject,
  SetStateAction
} from 'react';
import type { EmbeddedCadToolMode } from '@/graphics-engine/components/viewer-dxf/types';
import type {
  CadDockSection,
  CadEntityContextMenuState,
  CadGuideContextMenuState
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import type { CadMenuId } from '@/graphics-engine/pages/cad-editor/cadEditorMenuConfig';
import type { CadGuide, CadRulerInteraction } from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';
type CadRightPanelId = 'colors' | 'properties' | 'view' | 'layers' | 'info';

export interface UseCadEditorLayoutControllerParams<MenuId extends string = CadMenuId> {
  canvasAreaRef: RefObject<HTMLDivElement | null>;
  menuBarRef: RefObject<HTMLDivElement | null>;
  guideContextMenuRef: RefObject<HTMLDivElement | null>;
  entityContextMenuRef: RefObject<HTMLDivElement | null>;
  leftPanelResizeRef: MutableRefObject<{ startClientX: number; startWidth: number } | null>;
  rightPanelResizeRef: MutableRefObject<{ startClientX: number; startWidth: number } | null>;
  rulerInteractionRef: MutableRefObject<CadRulerInteraction | null>;
  pendingCanvasGuideDragRef: MutableRefObject<{
    guide: CadGuide;
    startClientX: number;
    startClientY: number;
  } | null>;
  leftPanelWidth: number;
  rightPanelWidth: number;
  minLeftPanelWidth: number;
  maxLeftPanelWidth: number;
  defaultLeftPanelWidth: number;
  minRightPanelWidth: number;
  maxRightPanelWidth: number;
  defaultRightPanelWidth: number;
  defaultRulerOrigin: { x: number; y: number };
  selectedGuideId: string | null;
  hoveredGuideId: string | null;
  guideContextMenu: CadGuideContextMenuState | null;
  entityContextMenu: CadEntityContextMenuState | null;
  guidesVisible: boolean;
  embeddedToolMode: EmbeddedCadToolMode;
  rulerGuides: CadGuide[];
  rulerGuidePreview: CadGuide | null;
  selectedEntitiesCount: number;
  setActiveDock: Dispatch<SetStateAction<CadDockSection>>;
  setLeftPanelState: Dispatch<SetStateAction<Record<CadDockSection, boolean>>>;
  setLeftPanelWidth: Dispatch<SetStateAction<number>>;
  setRightPanelState: Dispatch<SetStateAction<Record<CadRightPanelId, boolean>>>;
  setRightPanelWidth: Dispatch<SetStateAction<number>>;
  setCanvasAreaSize: Dispatch<SetStateAction<{ width: number; height: number }>>;
  setRulerOrigin: Dispatch<SetStateAction<{ x: number; y: number }>>;
  setSelectedGuideId: Dispatch<SetStateAction<string | null>>;
  setHoveredGuideId: Dispatch<SetStateAction<string | null>>;
  setGuideContextMenu: Dispatch<SetStateAction<CadGuideContextMenuState | null>>;
  setEntityContextMenu: Dispatch<SetStateAction<CadEntityContextMenuState | null>>;
  setRulerGuidePreview: Dispatch<SetStateAction<CadGuide | null>>;
  setMenuOpenId: Dispatch<SetStateAction<MenuId | null>>;
  setEditorNotice: Dispatch<SetStateAction<string>>;
  messages?: {
    resetRulerOriginNotice: string;
  };
}

const DEFAULT_LAYOUT_CONTROLLER_MESSAGES: NonNullable<UseCadEditorLayoutControllerParams['messages']> = {
  resetRulerOriginNotice: 'Zero da regua restaurado para a origem do desenho.'
};

export const useCadEditorLayoutController = <MenuId extends string = CadMenuId>({
  canvasAreaRef,
  menuBarRef,
  guideContextMenuRef,
  entityContextMenuRef,
  leftPanelResizeRef,
  rightPanelResizeRef,
  rulerInteractionRef,
  pendingCanvasGuideDragRef,
  leftPanelWidth,
  rightPanelWidth,
  minLeftPanelWidth,
  maxLeftPanelWidth,
  defaultLeftPanelWidth,
  minRightPanelWidth,
  maxRightPanelWidth,
  defaultRightPanelWidth,
  defaultRulerOrigin,
  selectedGuideId,
  hoveredGuideId,
  guideContextMenu,
  entityContextMenu,
  guidesVisible,
  embeddedToolMode,
  rulerGuides,
  rulerGuidePreview,
  selectedEntitiesCount,
  setActiveDock,
  setLeftPanelState,
  setLeftPanelWidth,
  setRightPanelState,
  setRightPanelWidth,
  setCanvasAreaSize,
  setRulerOrigin,
  setSelectedGuideId,
  setHoveredGuideId,
  setGuideContextMenu,
  setEntityContextMenu,
  setRulerGuidePreview,
  setMenuOpenId,
  setEditorNotice,
  messages
}: UseCadEditorLayoutControllerParams<MenuId>) => {
  const resolvedMessages = messages ?? DEFAULT_LAYOUT_CONTROLLER_MESSAGES;
  const openLeftPanel = useCallback((panelId: CadDockSection) => {
    setLeftPanelState((current) => ({
      ...current,
      [panelId]: true
    }));
  }, [setLeftPanelState]);

  const toggleLeftPanel = useCallback((panelId: CadDockSection) => {
    setActiveDock(panelId);
    setLeftPanelState((current) => ({
      ...current,
      [panelId]: !current[panelId]
    }));
  }, [setActiveDock, setLeftPanelState]);

  const handleLeftPanelResizeStart = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    leftPanelResizeRef.current = {
      startClientX: event.clientX,
      startWidth: leftPanelWidth
    };
  }, [leftPanelResizeRef, leftPanelWidth]);

  const resetLeftPanelWidth = useCallback(() => {
    setLeftPanelWidth(defaultLeftPanelWidth);
  }, [defaultLeftPanelWidth, setLeftPanelWidth]);

  const handleLeftPanelResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Home') {
      event.preventDefault();
      resetLeftPanelWidth();
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const delta = event.key === 'ArrowLeft' ? -16 : 16;
      setLeftPanelWidth((current) => Math.min(maxLeftPanelWidth, Math.max(minLeftPanelWidth, current + delta)));
    }
  }, [maxLeftPanelWidth, minLeftPanelWidth, resetLeftPanelWidth, setLeftPanelWidth]);

  const toggleRightPanel = useCallback((panelId: CadRightPanelId) => {
    setRightPanelState((current) => ({
      ...current,
      [panelId]: !current[panelId]
    }));
  }, [setRightPanelState]);

  const handleRightPanelResizeStart = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    rightPanelResizeRef.current = {
      startClientX: event.clientX,
      startWidth: rightPanelWidth
    };
  }, [rightPanelResizeRef, rightPanelWidth]);

  const resetRightPanelWidth = useCallback(() => {
    setRightPanelWidth(defaultRightPanelWidth);
  }, [defaultRightPanelWidth, setRightPanelWidth]);

  const handleRightPanelResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Home') {
      event.preventDefault();
      resetRightPanelWidth();
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const delta = event.key === 'ArrowLeft' ? -16 : 16;
      setRightPanelWidth((current) => Math.min(maxRightPanelWidth, Math.max(minRightPanelWidth, current + delta)));
    }
  }, [maxRightPanelWidth, minRightPanelWidth, resetRightPanelWidth, setRightPanelWidth]);

  const resetRulerOrigin = useCallback(() => {
    setRulerOrigin(defaultRulerOrigin);
    setEditorNotice(resolvedMessages.resetRulerOriginNotice);
  }, [defaultRulerOrigin, resolvedMessages.resetRulerOriginNotice, setEditorNotice, setRulerOrigin]);

  useEffect(() => {
    let observer: ResizeObserver | null = null;
    let frameId: number | null = null;

    const attachObserver = () => {
      const element = canvasAreaRef.current;
      if (!element) {
        frameId = window.requestAnimationFrame(attachObserver);
        return;
      }

      const syncSize = () => {
        setCanvasAreaSize({
          width: Math.max(Math.round(element.clientWidth), 0),
          height: Math.max(Math.round(element.clientHeight), 0)
        });
      };

      syncSize();
      if (typeof ResizeObserver === 'undefined') {
        return;
      }

      observer = new ResizeObserver(syncSize);
      observer.observe(element);
    };

    attachObserver();
    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      observer?.disconnect();
    };
  }, [canvasAreaRef, setCanvasAreaSize]);

  useEffect(() => {
    if (selectedGuideId && !rulerGuides.some((guide) => guide.id === selectedGuideId)) {
      setSelectedGuideId(null);
    }
  }, [rulerGuides, selectedGuideId, setSelectedGuideId]);

  useEffect(() => {
    if (guideContextMenu && !rulerGuides.some((guide) => guide.id === guideContextMenu.guideId)) {
      setGuideContextMenu(null);
    }
  }, [guideContextMenu, rulerGuides, setGuideContextMenu]);

  useEffect(() => {
    if (!guidesVisible && hoveredGuideId !== null) {
      setHoveredGuideId(null);
    }
    if (!guidesVisible && guideContextMenu) {
      setGuideContextMenu(null);
    }
  }, [guideContextMenu, guidesVisible, hoveredGuideId, setGuideContextMenu, setHoveredGuideId]);

  useEffect(() => {
    if (embeddedToolMode === 'select') {
      return;
    }

    pendingCanvasGuideDragRef.current = null;
    if (rulerInteractionRef.current) {
      rulerInteractionRef.current = null;
    }
    if (rulerGuidePreview) {
      setRulerGuidePreview(null);
    }
    if (hoveredGuideId !== null) {
      setHoveredGuideId(null);
    }
    if (guideContextMenu) {
      setGuideContextMenu(null);
    }
    if (entityContextMenu) {
      setEntityContextMenu(null);
    }
  }, [
    embeddedToolMode,
    entityContextMenu,
    guideContextMenu,
    hoveredGuideId,
    pendingCanvasGuideDragRef,
    rulerGuidePreview,
    rulerInteractionRef,
    setEntityContextMenu,
    setGuideContextMenu,
    setHoveredGuideId,
    setRulerGuidePreview
  ]);

  useEffect(() => {
    if (selectedEntitiesCount > 0) {
      return;
    }

    if (entityContextMenu) {
      setEntityContextMenu(null);
    }
  }, [entityContextMenu, selectedEntitiesCount, setEntityContextMenu]);

  useEffect(() => {
    if (!entityContextMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const clickedInsideMenu = Boolean(entityContextMenuRef.current?.contains(event.target as Node));
      if (!clickedInsideMenu) {
        setEntityContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [entityContextMenu, entityContextMenuRef, setEntityContextMenu]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (leftPanelResizeRef.current) {
        const nextWidth = leftPanelResizeRef.current.startWidth + (event.clientX - leftPanelResizeRef.current.startClientX);
        setLeftPanelWidth(Math.min(maxLeftPanelWidth, Math.max(minLeftPanelWidth, nextWidth)));
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        return;
      }

      if (rightPanelResizeRef.current) {
        const nextWidth = rightPanelResizeRef.current.startWidth + (rightPanelResizeRef.current.startClientX - event.clientX);
        setRightPanelWidth(Math.min(maxRightPanelWidth, Math.max(minRightPanelWidth, nextWidth)));
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      }
    };

    const handleMouseUp = () => {
      if (leftPanelResizeRef.current) {
        leftPanelResizeRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      if (rightPanelResizeRef.current) {
        rightPanelResizeRef.current = null;
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
    leftPanelResizeRef,
    maxLeftPanelWidth,
    maxRightPanelWidth,
    minLeftPanelWidth,
    minRightPanelWidth,
    rightPanelResizeRef,
    setLeftPanelWidth,
    setRightPanelWidth
  ]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuBarRef.current?.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuBarRef, setMenuOpenId]);

  useEffect(() => {
    if (!guideContextMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const clickedInsideMenu = Boolean(guideContextMenuRef.current?.contains(event.target as Node));
      if (!clickedInsideMenu) {
        setGuideContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [guideContextMenu, guideContextMenuRef, setGuideContextMenu]);

  return {
    openLeftPanel,
    toggleLeftPanel,
    handleLeftPanelResizeStart,
    resetLeftPanelWidth,
    handleLeftPanelResizeKeyDown,
    toggleRightPanel,
    handleRightPanelResizeStart,
    resetRightPanelWidth,
    handleRightPanelResizeKeyDown,
    resetRulerOrigin
  };
};
