import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type {
  DrawingBounds,
  ViewerViewportCommand,
  ViewerViewportState
} from '@/graphics-engine/components/viewer-dxf/viewerContracts';

// Arquivos georreferenciados podem exigir aproximacao extrema para localizar microaberturas.
const clampZoom = (value: number) => Math.max(0.1, Math.min(400, value));
interface UseCanvasViewportParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  viewportCommand?: ViewerViewportCommand;
  onViewportStateChange?: (viewport: ViewerViewportState) => void;
}

export const useCanvasViewport = ({
  canvasRef,
  viewportCommand,
  onViewportStateChange
}: UseCanvasViewportParams) => {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [drawingBounds, setDrawingBounds] = useState<DrawingBounds | null>(null);
  const [scale, setScale] = useState(1);
  const [validPoints, setValidPoints] = useState<Point2D[]>([]);
  const lastAppliedFitTokenRef = useRef(0);
  const lastAppliedResetTokenRef = useRef(0);

  const applyZoomFactor = useCallback((factor: number) => {
    setZoom((previous) => clampZoom(previous * factor));
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    applyZoomFactor(event.deltaY > 0 ? 0.9 : 1.1);
  }, [applyZoomFactor]);

  const handleResetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleCenterDrawing = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const startPanDrag = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - pan.x,
      y: clientY - pan.y
    });
  }, [pan.x, pan.y]);

  const updatePanDrag = useCallback((clientX: number, clientY: number) => {
    setPan({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  }, [dragStart.x, dragStart.y]);

  const stopPanDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getDxfCoords = useCallback((clientX: number, clientY: number): Point2D | null => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingBounds) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const contentX = clientX - rect.left - canvas.clientLeft;
    const contentY = clientY - rect.top - canvas.clientTop;
    const viewportWidth = Math.max(canvas.clientWidth, 1);
    const viewportHeight = Math.max(canvas.clientHeight, 1);
    const dx = contentX - (viewportWidth / 2 + pan.x);
    const dy = contentY - (viewportHeight / 2 + pan.y);
    const dxfX = (dx / scale) + drawingBounds.centerX;
    const dxfY = (dy / -scale) + drawingBounds.centerY;
    return { x: dxfX, y: dxfY };
  }, [canvasRef, drawingBounds, pan.x, pan.y, scale]);

  const zoomToPoint = useCallback((point: Point2D, factor: number) => {
    if (!drawingBounds || !Number.isFinite(factor) || factor <= 0 || zoom <= 0) {
      return false;
    }

    const targetZoom = clampZoom(zoom * factor);
    const zoomRatio = targetZoom / zoom;
    const targetScale = scale * zoomRatio;

    setZoom(targetZoom);
    setPan({
      x: -(point.x - drawingBounds.centerX) * targetScale,
      y: (point.y - drawingBounds.centerY) * targetScale
    });
    return true;
  }, [drawingBounds, scale, zoom]);

  const zoomToArea = useCallback((startPoint: Point2D, endPoint: Point2D) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingBounds || scale <= 0 || zoom <= 0) {
      return false;
    }

    const worldWidth = Math.abs(endPoint.x - startPoint.x);
    const worldHeight = Math.abs(endPoint.y - startPoint.y);
    if (worldWidth <= 0.001 || worldHeight <= 0.001) {
      return false;
    }

    const viewportWidth = Math.max(canvas.clientWidth, 1);
    const viewportHeight = Math.max(canvas.clientHeight, 1);
    const fitPaddingFactor = 0.9;
    const targetScale = Math.min(
      (viewportWidth * fitPaddingFactor) / worldWidth,
      (viewportHeight * fitPaddingFactor) / worldHeight
    );
    if (!Number.isFinite(targetScale) || targetScale <= 0) {
      return false;
    }

    const targetZoom = clampZoom(zoom * (targetScale / scale));
    const effectiveTargetScale = scale * (targetZoom / zoom);
    const centerPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2
    };

    setZoom(targetZoom);
    setPan({
      x: -(centerPoint.x - drawingBounds.centerX) * effectiveTargetScale,
      y: (centerPoint.y - drawingBounds.centerY) * effectiveTargetScale
    });
    return true;
  }, [canvasRef, drawingBounds, scale, zoom]);

  useEffect(() => {
    if (!viewportCommand) {
      return;
    }

    if (viewportCommand.zoomInToken > 0) {
      applyZoomFactor(1.2);
    }
  }, [applyZoomFactor, viewportCommand?.zoomInToken]);

  useEffect(() => {
    if (!viewportCommand) {
      return;
    }

    if (viewportCommand.zoomOutToken > 0) {
      applyZoomFactor(1 / 1.2);
    }
  }, [applyZoomFactor, viewportCommand?.zoomOutToken]);

  useEffect(() => {
    if (!viewportCommand) {
      return;
    }

    if (viewportCommand.fitToken > 0 && viewportCommand.fitToken !== lastAppliedFitTokenRef.current) {
      lastAppliedFitTokenRef.current = viewportCommand.fitToken;
      handleCenterDrawing();
    }
  }, [handleCenterDrawing, pan, viewportCommand?.fitToken, zoom]);

  useEffect(() => {
    if (!viewportCommand) {
      return;
    }

    if (viewportCommand.resetToken > 0 && viewportCommand.resetToken !== lastAppliedResetTokenRef.current) {
      lastAppliedResetTokenRef.current = viewportCommand.resetToken;
      handleResetView();
    }
  }, [handleResetView, pan, viewportCommand?.resetToken, zoom]);

  useEffect(() => {
    if (!viewportCommand) {
      return;
    }

    if (viewportCommand.absoluteZoomToken && typeof viewportCommand.absoluteZoomValue === 'number') {
      setZoom(clampZoom(viewportCommand.absoluteZoomValue));
    }
  }, [viewportCommand?.absoluteZoomToken, viewportCommand?.absoluteZoomValue]);

  useEffect(() => {
    onViewportStateChange?.({
      zoom,
      panX: pan.x,
      panY: pan.y,
      scale,
      centerX: drawingBounds?.centerX ?? 0,
      centerY: drawingBounds?.centerY ?? 0
    });
  }, [drawingBounds?.centerX, drawingBounds?.centerY, onViewportStateChange, pan.x, pan.y, scale, zoom]);

  return {
    drawingBounds,
    dragStart,
    getDxfCoords,
    handleCenterDrawing,
    handleResetView,
    handleWheel,
    isDragging,
    pan,
    scale,
    setDrawingBounds,
    setIsDragging,
    setPan,
    setScale,
    setValidPoints,
    setZoom,
    startPanDrag,
    stopPanDrag,
    updatePanDrag,
    validPoints,
    zoomToArea,
    zoomToPoint,
    zoom
  };
};
