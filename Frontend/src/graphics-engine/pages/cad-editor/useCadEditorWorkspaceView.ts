import { useMemo } from 'react';
import { buildRulerTicks, mergeRulerGuides, type CadGuide, type CadRulerTick } from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';
import type {
  CadEntityContextMenuState,
  CadGuideContextMenuState,
  CadViewportState
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

export type WorkspaceViewportBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} | null;

export type WorkspaceGuideMarker = {
  id: string;
  screen: number;
  isPreview: boolean;
  isSelected: boolean;
};

interface UseCadEditorWorkspaceViewParams {
  canvasAreaSize: { width: number; height: number };
  viewerViewportState: CadViewportState;
  rulerOrigin: { x: number; y: number };
  rulerGuides: CadGuide[];
  rulerGuidePreview: CadGuide | null;
  guidesVisible: boolean;
  selectedGuideId: string | null;
  hoveredGuideId: string | null;
  guideContextMenu: CadGuideContextMenuState | null;
  entityContextMenu: CadEntityContextMenuState | null;
}

const buildContextMenuStyle = (
  contextMenu: CadGuideContextMenuState | CadEntityContextMenuState | null,
  estimatedMenuWidth: number,
  estimatedMenuHeight: number
) => {
  if (!contextMenu || typeof window === 'undefined') {
    return undefined;
  }

  return {
    left: Math.max(12, Math.min(contextMenu.clientX, window.innerWidth - estimatedMenuWidth - 12)),
    top: Math.max(12, Math.min(contextMenu.clientY, window.innerHeight - estimatedMenuHeight - 12))
  };
};

export const useCadEditorWorkspaceView = ({
  canvasAreaSize,
  viewerViewportState,
  rulerOrigin,
  rulerGuides,
  rulerGuidePreview,
  guidesVisible,
  selectedGuideId,
  hoveredGuideId,
  guideContextMenu,
  entityContextMenu
}: UseCadEditorWorkspaceViewParams) => {
  const visibleViewportBounds = useMemo<WorkspaceViewportBounds>(() => {
    if (canvasAreaSize.width <= 0 || canvasAreaSize.height <= 0 || viewerViewportState.scale <= 0) {
      return null;
    }

    return {
      minX: viewerViewportState.centerX + (-canvasAreaSize.width / 2 - viewerViewportState.panX) / viewerViewportState.scale,
      maxX: viewerViewportState.centerX + (canvasAreaSize.width / 2 - viewerViewportState.panX) / viewerViewportState.scale,
      maxY: viewerViewportState.centerY + (canvasAreaSize.height / 2 + viewerViewportState.panY) / viewerViewportState.scale,
      minY: viewerViewportState.centerY + (-canvasAreaSize.height / 2 + viewerViewportState.panY) / viewerViewportState.scale
    };
  }, [canvasAreaSize.height, canvasAreaSize.width, viewerViewportState.centerX, viewerViewportState.centerY, viewerViewportState.panX, viewerViewportState.panY, viewerViewportState.scale]);

  const horizontalRulerTicks = useMemo<CadRulerTick[]>(() => {
    if (!visibleViewportBounds) {
      return [];
    }

    return buildRulerTicks(
      visibleViewportBounds.minX,
      visibleViewportBounds.maxX,
      canvasAreaSize.width,
      rulerOrigin.x,
      (worldX) => canvasAreaSize.width / 2 + viewerViewportState.panX + (worldX - viewerViewportState.centerX) * viewerViewportState.scale
    );
  }, [canvasAreaSize.width, rulerOrigin.x, viewerViewportState.centerX, viewerViewportState.panX, viewerViewportState.scale, visibleViewportBounds]);

  const verticalRulerTicks = useMemo<CadRulerTick[]>(() => {
    if (!visibleViewportBounds) {
      return [];
    }

    return buildRulerTicks(
      visibleViewportBounds.minY,
      visibleViewportBounds.maxY,
      canvasAreaSize.height,
      rulerOrigin.y,
      (worldY) => canvasAreaSize.height / 2 + viewerViewportState.panY - (worldY - viewerViewportState.centerY) * viewerViewportState.scale
    );
  }, [canvasAreaSize.height, rulerOrigin.y, viewerViewportState.centerY, viewerViewportState.panY, viewerViewportState.scale, visibleViewportBounds]);

  const mergedRulerGuides = useMemo(
    () => mergeRulerGuides(rulerGuides, rulerGuidePreview),
    [rulerGuidePreview, rulerGuides]
  );

  const rulerGuideSegments = useMemo(() => {
    if (!visibleViewportBounds || !guidesVisible) {
      return [];
    }

    return mergedRulerGuides.map((guide) => (
      guide.orientation === 'vertical'
        ? {
            start: { x: guide.position, y: visibleViewportBounds.minY },
            end: { x: guide.position, y: visibleViewportBounds.maxY },
            color: guide.id === rulerGuidePreview?.id
              ? 'rgba(0, 0, 0, 0.72)'
              : guide.id === selectedGuideId
                ? 'rgba(0, 0, 0, 0.95)'
                : 'rgba(0, 0, 0, 0.5)',
            dashed: true,
            strokeWidth: guide.id === selectedGuideId ? 1.6 : 1
          }
        : {
            start: { x: visibleViewportBounds.minX, y: guide.position },
            end: { x: visibleViewportBounds.maxX, y: guide.position },
            color: guide.id === rulerGuidePreview?.id
              ? 'rgba(0, 0, 0, 0.72)'
              : guide.id === selectedGuideId
                ? 'rgba(0, 0, 0, 0.95)'
                : 'rgba(0, 0, 0, 0.5)',
            dashed: true,
            strokeWidth: guide.id === selectedGuideId ? 1.6 : 1
          }
    ));
  }, [guidesVisible, mergedRulerGuides, rulerGuidePreview?.id, selectedGuideId, visibleViewportBounds]);

  const horizontalRulerGuideMarkers = useMemo<WorkspaceGuideMarker[]>(
    () => (!guidesVisible ? [] : mergedRulerGuides)
      .filter((guide) => guide.orientation === 'vertical')
      .map((guide) => ({
        id: guide.id,
        screen: canvasAreaSize.width / 2 + viewerViewportState.panX + (guide.position - viewerViewportState.centerX) * viewerViewportState.scale,
        isPreview: guide.id === rulerGuidePreview?.id,
        isSelected: guide.id === selectedGuideId
      })),
    [
      canvasAreaSize.width,
      guidesVisible,
      mergedRulerGuides,
      rulerGuidePreview?.id,
      selectedGuideId,
      viewerViewportState.centerX,
      viewerViewportState.panX,
      viewerViewportState.scale
    ]
  );

  const verticalRulerGuideMarkers = useMemo<WorkspaceGuideMarker[]>(
    () => (!guidesVisible ? [] : mergedRulerGuides)
      .filter((guide) => guide.orientation === 'horizontal')
      .map((guide) => ({
        id: guide.id,
        screen: canvasAreaSize.height / 2 + viewerViewportState.panY - (guide.position - viewerViewportState.centerY) * viewerViewportState.scale,
        isPreview: guide.id === rulerGuidePreview?.id,
        isSelected: guide.id === selectedGuideId
      })),
    [
      canvasAreaSize.height,
      guidesVisible,
      mergedRulerGuides,
      rulerGuidePreview?.id,
      selectedGuideId,
      viewerViewportState.centerY,
      viewerViewportState.panY,
      viewerViewportState.scale
    ]
  );

  const horizontalRulerZeroScreen = useMemo(
    () => canvasAreaSize.width / 2 + viewerViewportState.panX + (rulerOrigin.x - viewerViewportState.centerX) * viewerViewportState.scale,
    [canvasAreaSize.width, rulerOrigin.x, viewerViewportState.centerX, viewerViewportState.panX, viewerViewportState.scale]
  );

  const verticalRulerZeroScreen = useMemo(
    () => canvasAreaSize.height / 2 + viewerViewportState.panY - (rulerOrigin.y - viewerViewportState.centerY) * viewerViewportState.scale,
    [canvasAreaSize.height, rulerOrigin.y, viewerViewportState.centerY, viewerViewportState.panY, viewerViewportState.scale]
  );

  const rulerOriginLabel = useMemo(
    () => `Zero da regua: X ${rulerOrigin.x.toFixed(3)} | Y ${rulerOrigin.y.toFixed(3)}`,
    [rulerOrigin.x, rulerOrigin.y]
  );

  const selectedGuide = useMemo(
    () => rulerGuides.find((guide) => guide.id === selectedGuideId) || null,
    [rulerGuides, selectedGuideId]
  );

  const hoveredGuide = useMemo(
    () => rulerGuides.find((guide) => guide.id === hoveredGuideId) || null,
    [hoveredGuideId, rulerGuides]
  );

  const guideContextMenuGuide = useMemo(
    () => (guideContextMenu ? rulerGuides.find((guide) => guide.id === guideContextMenu.guideId) || null : null),
    [guideContextMenu, rulerGuides]
  );

  const guideContextMenuStyle = useMemo(
    () => buildContextMenuStyle(guideContextMenu, 156, 142),
    [guideContextMenu]
  );

  const entityContextMenuStyle = useMemo(
    () => buildContextMenuStyle(entityContextMenu, 156, 160),
    [entityContextMenu]
  );

  return {
    visibleViewportBounds,
    horizontalRulerTicks,
    verticalRulerTicks,
    mergedRulerGuides,
    rulerGuideSegments,
    horizontalRulerGuideMarkers,
    verticalRulerGuideMarkers,
    horizontalRulerZeroScreen,
    verticalRulerZeroScreen,
    rulerOriginLabel,
    selectedGuide,
    hoveredGuide,
    guideContextMenuGuide,
    guideContextMenuStyle,
    entityContextMenuStyle
  };
};

