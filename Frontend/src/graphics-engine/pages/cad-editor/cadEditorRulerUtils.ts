import type { DXFData } from '@/graphics-engine/shared/dxf';
import type { Point2D } from '@/graphics-engine/shared/geometry';

export type CadRulerTick = {
  key: string;
  screen: number;
  level: 'minor' | 'medium' | 'major' | 'origin';
  label?: string;
};

export type CadGuide = {
  id: string;
  orientation: 'vertical' | 'horizontal';
  position: number;
  locked: boolean;
};

export type CadRulerInteraction =
  | { mode: 'corner' }
  | { mode: 'guide'; orientation: CadGuide['orientation']; guideId: string | null; isExisting: boolean; origin: 'ruler' | 'canvas' };

export const GUIDE_SELECTION_DRAG_THRESHOLD_PX = 4;
export const RULER_GUIDE_PICK_DISTANCE_PX = 10;
export const CAD_EDITOR_RULER_THICKNESS = 34;
export const RULER_GUIDE_OBJECT_SNAP_DISTANCE_PX = 20;

export const getRulerTickStartRatio = (level: CadRulerTick['level']) => {
  switch (level) {
    case 'major':
    case 'origin':
      return 0;
    case 'medium':
      return 0.45;
    default:
      return 0.65;
  }
};

export const getRulerTickStroke = (level: CadRulerTick['level']) => {
  switch (level) {
    case 'major':
    case 'origin':
      return 'rgb(110 110 110)';
    case 'medium':
      return 'rgb(135 135 135)';
    default:
      return 'rgb(165 165 165)';
  }
};

export const projectPointOntoSegment = (point: Point2D, start: Point2D, end: Point2D): Point2D => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const segmentLengthSquared = dx * dx + dy * dy;

  if (segmentLengthSquared <= 0) {
    return start;
  }

  const t = Math.max(0, Math.min(1, (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / segmentLengthSquared));
  return {
    x: start.x + t * dx,
    y: start.y + t * dy
  };
};

export const getCadEntitySegments = (data: DXFData | null): Array<{ start: Point2D; end: Point2D }> => {
  if (!data) {
    return [];
  }

  return data.entities.flatMap((entity) => {
    const props = entity.properties;
    if (
      entity.type === 'LINE'
      && typeof props.x1 === 'number'
      && typeof props.y1 === 'number'
      && typeof props.x2 === 'number'
      && typeof props.y2 === 'number'
    ) {
      return [{ start: { x: props.x1, y: props.y1 }, end: { x: props.x2, y: props.y2 } }];
    }

    if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && Array.isArray(props.vertices) && props.vertices.length >= 2) {
      const segments = props.vertices.slice(0, -1).map((vertex, index) => ({
        start: { x: vertex.x, y: vertex.y },
        end: { x: props.vertices![index + 1].x, y: props.vertices![index + 1].y }
      }));

      if (props.closed) {
        const firstVertex = props.vertices[0];
        const lastVertex = props.vertices[props.vertices.length - 1];
        segments.push({
          start: { x: lastVertex.x, y: lastVertex.y },
          end: { x: firstVertex.x, y: firstVertex.y }
        });
      }

      return segments;
    }

    return [];
  });
};

export const getCadGeometryVertices = (data: DXFData | null): Point2D[] => {
  if (!data) {
    return [];
  }

  return data.entities.flatMap((entity) => {
    const props = entity.properties;
    if (entity.type === 'POINT' && typeof props.x === 'number' && typeof props.y === 'number') {
      return [{ x: props.x, y: props.y }];
    }

    if (
      entity.type === 'LINE'
      && typeof props.x1 === 'number'
      && typeof props.y1 === 'number'
      && typeof props.x2 === 'number'
      && typeof props.y2 === 'number'
    ) {
      return [
        { x: props.x1, y: props.y1 },
        { x: props.x2, y: props.y2 }
      ];
    }

    if (Array.isArray(props.vertices)) {
      return props.vertices.map((vertex) => ({ x: vertex.x, y: vertex.y }));
    }

    return [];
  });
};

export const mergeRulerGuides = (guides: CadGuide[], preview: CadGuide | null): CadGuide[] => {
  if (!preview) {
    return guides;
  }

  const existingGuideIndex = guides.findIndex((guide) => guide.id === preview.id);
  if (existingGuideIndex >= 0) {
    return guides.map((guide) => (guide.id === preview.id ? preview : guide));
  }

  return [...guides, preview];
};

const formatRulerValue = (value: number, step: number) => {
  const absoluteValue = Math.abs(value);
  const decimals = step >= 100 ? 0 : step >= 1 ? 2 : absoluteValue >= 1 ? 3 : 4;
  const normalizedValue = Math.abs(value) < 0.0000001 ? 0 : value;
  return normalizedValue.toFixed(decimals);
};

const getNiceRulerStep = (unitsPerPixel: number) => {
  const desiredStep = Math.max(unitsPerPixel * 60, 0.0001);
  const exponent = Math.floor(Math.log10(desiredStep));
  const fraction = desiredStep / (10 ** exponent);

  let niceFraction = 1;
  if (fraction > 1 && fraction <= 2) {
    niceFraction = 2;
  } else if (fraction > 2 && fraction <= 5) {
    niceFraction = 5;
  } else if (fraction > 5) {
    niceFraction = 10;
  }

  return niceFraction * (10 ** exponent);
};

export const buildRulerTicks = (
  minValue: number,
  maxValue: number,
  pixels: number,
  originValue: number,
  projectWorldToScreen: (worldValue: number) => number
): CadRulerTick[] => {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || pixels <= 0) {
    return [];
  }

  const step = getNiceRulerStep((maxValue - minValue) / Math.max(pixels, 1));
  const mediumStep = step / 2;
  const minorStep = Math.max(step / 10, Number.EPSILON);
  const startIndex = Math.floor((minValue - originValue) / minorStep) - 1;
  const endIndex = Math.ceil((maxValue - originValue) / minorStep) + 1;
  const ticks: CadRulerTick[] = [];
  const epsilon = minorStep * 0.001;

  for (let index = startIndex; index <= endIndex; index += 1) {
    const worldValue = originValue + index * minorStep;
    const screen = projectWorldToScreen(worldValue);
    if (screen < -60 || screen > pixels + 60) {
      continue;
    }

    const offset = worldValue - originValue;
    const isOrigin = Math.abs(offset) <= epsilon;
    const isMajor = isOrigin || Math.abs(offset / step - Math.round(offset / step)) <= 0.0001;
    const isMedium = !isMajor && Math.abs(offset / mediumStep - Math.round(offset / mediumStep)) <= 0.0001;

    ticks.push({
      key: `${index}:${worldValue.toFixed(6)}`,
      screen,
      level: isOrigin ? 'origin' : isMajor ? 'major' : isMedium ? 'medium' : 'minor',
      label: isOrigin || isMajor ? formatRulerValue(offset, step) : undefined
    });
  }

  return ticks;
};

