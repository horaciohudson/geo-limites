import type {
  DrawingTextAlignment,
  DrawingTextVerticalAlignment,
  EmbeddedCadToolMode
} from '@/graphics-engine/components/viewer-dxf/viewerContracts';
import type { CadGuide } from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';
import type { DXFData } from '@/graphics-engine/shared/dxf';
export type {
  CadCommandItem,
  CadMenuAction,
  CadMenuActionsByMenu,
  CadMenuId,
  CadMenuItem
} from '@/graphics-engine/pages/cad-editor/cadEditorMenuConfig';

export type CadDockSection = 'ferramentas' | 'criar-molde' | 'ajustes' | 'costura-medidas' | 'utilitarios';

export interface CadDockDefinition {
  id: CadDockSection;
  label: string;
  icon: string;
}

export interface CadToolDefinition {
  id: string;
  label: string;
  section: CadDockSection;
}

export interface CadLayerDefinition {
  name: string;
  colorClass: string;
  entityCount?: number;
}

export type ViewportCommandId =
  | 'zoom-in'
  | 'zoom-out'
  | 'fit'
  | 'reset'
  | 'zoom-1x'
  | 'zoom-2x'
  | 'zoom-5x'
  | 'zoom-10x';

export type TextToolPresetDefinition = {
  id: 'texto-comum' | 'texto-tecnico' | 'rotulo-centralizado' | 'cota';
  label: string;
  textValue: string;
  height: number;
  rotation: number;
  alignment: DrawingTextAlignment;
  verticalAlignment: DrawingTextVerticalAlignment;
  target: 'active' | 'text-annotation' | 'dimension-annotation';
};

export type TextToolSessionState = {
  presetId: TextToolPresetDefinition['id'];
  textValue: string;
  height: number;
  rotation: number;
  alignment: DrawingTextAlignment;
  verticalAlignment: DrawingTextVerticalAlignment;
  textUsesAnnotationLayer: boolean;
  textAnnotationLayerName: string;
};

export type CadMeasurementUnit = 'mm' | 'cm' | 'm';

export type CadEditorSettings = {
  measurementUnit: CadMeasurementUnit;
  newDocumentWorkspaceSize: number;
};

export type CadRightPanelId = 'colors' | 'properties' | 'view' | 'layers' | 'info';

export type CadEditorSessionPreferences = {
  activeDock: CadDockSection;
  activeToolId: string;
  weldTolerance: number;
  viewerZoom: number;
  lastViewportCommandId: ViewportCommandId | null;
  activeLayerName: string;
  annotationLayerName: string;
  closePointToPointShape: boolean;
  showGrid: boolean;
  showCursorCoordinates: boolean;
  guidesVisible: boolean;
  enableGridSnap: boolean;
  enableObjectSnap: boolean;
  gridSnapSize: number;
  drawingLineColor: string;
  drawingFillColor: string;
  paintFillEnabled: boolean;
  leftPanelState: Record<CadDockSection, boolean>;
  leftPanelWidth: number;
  rightPanelState: Record<CadRightPanelId, boolean>;
  rightPanelWidth: number;
  rulerOrigin: { x: number; y: number };
  rulerGuides: CadGuide[];
};

export type CadViewportState = {
  zoom: number;
  panX: number;
  panY: number;
  scale: number;
  centerX: number;
  centerY: number;
};

export type CadGuideContextMenuState = {
  guideId: string;
  clientX: number;
  clientY: number;
};

export type CadEntityContextMenuState = {
  clientX: number;
  clientY: number;
};

export interface CadOpenedDocumentFileHandle {
  name?: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (contents: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

export interface CadOpenedDocument {
  name: string;
  sizeBytes: number;
  extension: string;
  dxfData: DXFData;
  source: 'new' | 'local-dxf';
  savedFilePath?: string | null;
  fileHandle?: CadOpenedDocumentFileHandle | null;
}

export interface CadMeasurementUnitOption<MeasurementUnitId extends string = CadMeasurementUnit> {
  id: MeasurementUnitId;
  label: string;
  shortLabel: string;
  defaultWorkspaceSize: number;
  defaultGridSnapSize: number;
  majorGridStep: number;
}

export interface CadViewportZoomPreset<PresetId extends string = string> {
  id: PresetId;
  label: string;
  zoom: number;
}

export const DEFAULT_LEFT_PANEL_STATE: Record<CadDockSection, boolean> = {
  ferramentas: true,
  'criar-molde': true,
  ajustes: false,
  'costura-medidas': false,
  utilitarios: true
};

export const DEFAULT_RIGHT_PANEL_STATE: Record<CadRightPanelId, boolean> = {
  colors: true,
  properties: true,
  view: false,
  layers: true,
  info: false
};

export const CAD_DOCK_SECTION_IDS: CadDockSection[] = [
  'ferramentas',
  'criar-molde',
  'ajustes',
  'costura-medidas',
  'utilitarios'
];

export const CAD_TOOL_SECTION_BY_ID: Record<string, CadDockSection> = {
  select: 'ferramentas',
  pan: 'ferramentas',
  zoom: 'ferramentas',
  rectangle: 'criar-molde',
  circle: 'criar-molde',
  bezier: 'criar-molde',
  point: 'criar-molde',
  distance: 'criar-molde',
  line: 'criar-molde',
  'point-to-point': 'criar-molde',
  text: 'criar-molde',
  move: 'ajustes',
  copy: 'ajustes',
  rotate: 'ajustes',
  scale: 'ajustes',
  offset: 'ajustes',
  extend: 'ajustes',
  trim: 'ajustes',
  'edit-nodes': 'ajustes',
  'edit-curve': 'ajustes',
  knife: 'ajustes',
  mirror: 'ajustes',
  join: 'ajustes',
  'save-primary-boundary': 'costura-medidas',
  'technical-summary': 'costura-medidas',
  'open-standards-templates': 'costura-medidas',
  'scan-errors': 'utilitarios',
  'scan-errors-next': 'utilitarios',
  'scan-errors-clear': 'utilitarios'
};

const normalizeLegacyDockSection = (
  dockId: string | null | undefined,
  fallback: CadDockSection
): CadDockSection => {
  if (dockId === 'area-total') {
    return 'costura-medidas';
  }

  return typeof dockId === 'string' && CAD_DOCK_SECTION_IDS.includes(dockId as CadDockSection)
    ? dockId as CadDockSection
    : fallback;
};

export const DRAWING_TOOL_IDS = new Set<EmbeddedCadToolMode>([
  'rectangle',
  'circle',
  'bezier',
  'point',
  'distance',
  'line',
  'point-to-point',
  'text'
]);

export const formatBytes = (value?: number) => {
  if (!value || value <= 0) {
    return '0 KB';
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const buildEditedFileName = (originalName: string) => {
  if (!originalName.trim()) {
    return 'desenho-editado.dxf';
  }

  const normalizedName = originalName.replace(/\.dxf$/i, '');
  return `${normalizedName}-editado.dxf`;
};

export const formatPoint = (point?: { x: number; y: number } | null) => {
  if (!point) {
    return 'N/A';
  }

  return `X ${point.x.toFixed(3)} | Y ${point.y.toFixed(3)}`;
};

export const createEmptyDxfDataFromLayers = (layers: ReadonlyArray<Pick<CadLayerDefinition, 'name'>>): DXFData => ({
  entities: [],
  layers: layers.map((layer) => ({ name: layer.name })),
  entityCounts: {},
  layerCounts: {}
});

export const DEFAULT_WELD_TOLERANCE = 0.5;
export const DEFAULT_GRID_SNAP_SIZE = 10;
export const DEFAULT_VIEWPORT_STATE: CadViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  scale: 1,
  centerX: 0,
  centerY: 0
};
export const DEFAULT_RULER_ORIGIN = { x: 0, y: 0 };
export const DEFAULT_LEFT_PANEL_WIDTH = 322;
export const MIN_LEFT_PANEL_WIDTH = 230;
export const MAX_LEFT_PANEL_WIDTH = 460;
export const DEFAULT_RIGHT_PANEL_WIDTH = 248;
export const MIN_RIGHT_PANEL_WIDTH = 220;
export const MAX_RIGHT_PANEL_WIDTH = 360;
export const DEFAULT_ANNOTATION_LAYER_NAME = 'COTAS';
export const DEFAULT_TEXT_ANNOTATION_LAYER_NAME = 'TEXTOS';
export const DEFAULT_DRAWING_TEXT_HEIGHT = 2.5;
export const DEFAULT_DRAWING_TEXT_ROTATION = 0;
export const DEFAULT_DRAWING_TEXT_ALIGNMENT: DrawingTextAlignment = 'left';
export const DEFAULT_DRAWING_TEXT_VERTICAL_ALIGNMENT: DrawingTextVerticalAlignment = 'baseline';
export const DEFAULT_DRAWING_LINE_COLOR = '#212529';
export const DEFAULT_DRAWING_FILL_COLOR = '#93c5fd';
export const DEFAULT_PAINT_FILL_ENABLED = true;
export const DEFAULT_TEXT_TOOL_PRESET_ID: TextToolPresetDefinition['id'] = 'texto-comum';
export const CUSTOM_TEXT_TOOL_PRESET_ID = 'personalizado';
export const CUSTOM_TEXT_TOOL_PRESET_LABEL = 'Personalizado';
export const TEXT_TOOL_SESSION_STORAGE_KEY = 'cad-editor:text-tool-session';
export const CAD_EDITOR_SESSION_PREFERENCES_KEY = 'cad-editor:session-preferences';
export const createDefaultTextToolSessionState = (overrides?: Partial<TextToolSessionState>): TextToolSessionState => ({
  presetId: overrides?.presetId ?? DEFAULT_TEXT_TOOL_PRESET_ID,
  textValue: overrides?.textValue ?? 'Texto',
  height: overrides?.height ?? DEFAULT_DRAWING_TEXT_HEIGHT,
  rotation: overrides?.rotation ?? DEFAULT_DRAWING_TEXT_ROTATION,
  alignment: overrides?.alignment ?? DEFAULT_DRAWING_TEXT_ALIGNMENT,
  verticalAlignment: overrides?.verticalAlignment ?? DEFAULT_DRAWING_TEXT_VERTICAL_ALIGNMENT,
  textUsesAnnotationLayer: overrides?.textUsesAnnotationLayer ?? false,
  textAnnotationLayerName: overrides?.textAnnotationLayerName ?? DEFAULT_TEXT_ANNOTATION_LAYER_NAME
});

export const loadTextToolSessionState = ({
  presets,
  defaultState,
  storageKey = TEXT_TOOL_SESSION_STORAGE_KEY
}: {
  presets: ReadonlyArray<TextToolPresetDefinition>;
  defaultState: TextToolSessionState;
  storageKey?: string;
}): TextToolSessionState => {

  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (!rawValue) {
      return defaultState;
    }

    const parsed = JSON.parse(rawValue) as Partial<TextToolSessionState>;
    const validPresetId: TextToolPresetDefinition['id'] = presets.some((preset) => preset.id === parsed.presetId)
      ? (parsed.presetId as TextToolPresetDefinition['id'])
      : defaultState.presetId;

    return {
      presetId: validPresetId,
      textValue: typeof parsed.textValue === 'string' ? parsed.textValue : defaultState.textValue,
      height: typeof parsed.height === 'number' && parsed.height > 0 ? parsed.height : defaultState.height,
      rotation: typeof parsed.rotation === 'number' ? parsed.rotation : defaultState.rotation,
      alignment: parsed.alignment === 'left' || parsed.alignment === 'center' || parsed.alignment === 'right'
        ? parsed.alignment
        : defaultState.alignment,
      verticalAlignment: parsed.verticalAlignment === 'baseline' || parsed.verticalAlignment === 'middle' || parsed.verticalAlignment === 'top'
        ? parsed.verticalAlignment
        : defaultState.verticalAlignment,
      textUsesAnnotationLayer: typeof parsed.textUsesAnnotationLayer === 'boolean'
        ? parsed.textUsesAnnotationLayer
        : defaultState.textUsesAnnotationLayer,
      textAnnotationLayerName: typeof parsed.textAnnotationLayerName === 'string' && parsed.textAnnotationLayerName.trim()
        ? parsed.textAnnotationLayerName
        : defaultState.textAnnotationLayerName
    };
  } catch {
    return defaultState;
  }
};

const createDefaultCadEditorSessionPreferences = (): CadEditorSessionPreferences => ({
  activeDock: 'ferramentas',
  activeToolId: 'select',
  weldTolerance: DEFAULT_WELD_TOLERANCE,
  viewerZoom: 1,
  lastViewportCommandId: null,
  activeLayerName: 'PRINCIPAL',
  annotationLayerName: DEFAULT_ANNOTATION_LAYER_NAME,
  closePointToPointShape: true,
  showGrid: true,
  showCursorCoordinates: false,
  guidesVisible: true,
  enableGridSnap: false,
  enableObjectSnap: true,
  gridSnapSize: DEFAULT_GRID_SNAP_SIZE,
  drawingLineColor: DEFAULT_DRAWING_LINE_COLOR,
  drawingFillColor: DEFAULT_DRAWING_FILL_COLOR,
  paintFillEnabled: DEFAULT_PAINT_FILL_ENABLED,
  leftPanelState: DEFAULT_LEFT_PANEL_STATE,
  leftPanelWidth: DEFAULT_LEFT_PANEL_WIDTH,
  rightPanelState: DEFAULT_RIGHT_PANEL_STATE,
  rightPanelWidth: DEFAULT_RIGHT_PANEL_WIDTH,
  rulerOrigin: DEFAULT_RULER_ORIGIN,
  rulerGuides: []
});

export const createDefaultCadEditorSettings = (overrides?: Partial<CadEditorSettings>): CadEditorSettings => ({
  measurementUnit: overrides?.measurementUnit ?? 'cm',
  newDocumentWorkspaceSize: overrides?.newDocumentWorkspaceSize ?? 1000
});

export const loadCadEditorSessionPreferences = (): CadEditorSessionPreferences => {
  const defaultState = createDefaultCadEditorSessionPreferences();

  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const rawValue = window.localStorage.getItem(CAD_EDITOR_SESSION_PREFERENCES_KEY)
      || window.sessionStorage.getItem(CAD_EDITOR_SESSION_PREFERENCES_KEY);
    if (!rawValue) {
      return defaultState;
    }

    const parsed = JSON.parse(rawValue) as Partial<CadEditorSessionPreferences>;
    const legacyLeftPanelState = parsed.leftPanelState as Record<string, boolean> | undefined;
    const validActiveToolId = typeof parsed.activeToolId === 'string' && parsed.activeToolId in CAD_TOOL_SECTION_BY_ID
      ? parsed.activeToolId
      : defaultState.activeToolId;
    const derivedDockFromTool = CAD_TOOL_SECTION_BY_ID[validActiveToolId] || defaultState.activeDock;
    const validActiveDock = normalizeLegacyDockSection(parsed.activeDock, derivedDockFromTool);
    const parsedRulerOrigin = parsed.rulerOrigin;
    const validRulerOrigin = parsedRulerOrigin
      && typeof parsedRulerOrigin.x === 'number'
      && Number.isFinite(parsedRulerOrigin.x)
      && typeof parsedRulerOrigin.y === 'number'
      && Number.isFinite(parsedRulerOrigin.y)
      ? { x: parsedRulerOrigin.x, y: parsedRulerOrigin.y }
      : defaultState.rulerOrigin;
    const validRulerGuides = Array.isArray(parsed.rulerGuides)
      ? parsed.rulerGuides.flatMap((guide, index) => {
        if (
          !guide
          || typeof guide !== 'object'
          || (guide.orientation !== 'vertical' && guide.orientation !== 'horizontal')
          || typeof guide.position !== 'number'
          || !Number.isFinite(guide.position)
        ) {
          return [];
        }

        const guideId = typeof guide.id === 'string' && guide.id.trim()
          ? guide.id
          : `${guide.orientation}-${index}`;
        return [{
          id: guideId,
          orientation: guide.orientation,
          position: guide.position,
          locked: typeof guide.locked === 'boolean' ? guide.locked : false
        }];
      })
      : defaultState.rulerGuides;

    return {
      activeDock: validActiveDock,
      activeToolId: validActiveToolId,
      weldTolerance: typeof parsed.weldTolerance === 'number' && parsed.weldTolerance > 0
        ? parsed.weldTolerance
        : defaultState.weldTolerance,
      viewerZoom: typeof parsed.viewerZoom === 'number' && parsed.viewerZoom > 0
        ? parsed.viewerZoom
        : defaultState.viewerZoom,
      lastViewportCommandId: parsed.lastViewportCommandId === 'zoom-in'
        || parsed.lastViewportCommandId === 'zoom-out'
        || parsed.lastViewportCommandId === 'fit'
        || parsed.lastViewportCommandId === 'reset'
        || parsed.lastViewportCommandId === 'zoom-1x'
        || parsed.lastViewportCommandId === 'zoom-2x'
        || parsed.lastViewportCommandId === 'zoom-5x'
        || parsed.lastViewportCommandId === 'zoom-10x'
        ? parsed.lastViewportCommandId
        : defaultState.lastViewportCommandId,
      activeLayerName: typeof parsed.activeLayerName === 'string' && parsed.activeLayerName.trim()
        ? parsed.activeLayerName
        : defaultState.activeLayerName,
      annotationLayerName: typeof parsed.annotationLayerName === 'string' && parsed.annotationLayerName.trim()
        ? parsed.annotationLayerName
        : defaultState.annotationLayerName,
      closePointToPointShape: typeof parsed.closePointToPointShape === 'boolean'
        ? parsed.closePointToPointShape
        : defaultState.closePointToPointShape,
      showGrid: typeof parsed.showGrid === 'boolean' ? parsed.showGrid : defaultState.showGrid,
      showCursorCoordinates: typeof parsed.showCursorCoordinates === 'boolean'
        ? parsed.showCursorCoordinates
        : defaultState.showCursorCoordinates,
      guidesVisible: typeof parsed.guidesVisible === 'boolean' ? parsed.guidesVisible : defaultState.guidesVisible,
      enableGridSnap: typeof parsed.enableGridSnap === 'boolean' ? parsed.enableGridSnap : defaultState.enableGridSnap,
      enableObjectSnap: typeof parsed.enableObjectSnap === 'boolean' ? parsed.enableObjectSnap : defaultState.enableObjectSnap,
      gridSnapSize: typeof parsed.gridSnapSize === 'number' && parsed.gridSnapSize > 0
        ? parsed.gridSnapSize
        : defaultState.gridSnapSize,
      drawingLineColor: typeof parsed.drawingLineColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.drawingLineColor)
        ? parsed.drawingLineColor
        : defaultState.drawingLineColor,
      drawingFillColor: typeof parsed.drawingFillColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.drawingFillColor)
        ? parsed.drawingFillColor
        : defaultState.drawingFillColor,
      paintFillEnabled: typeof parsed.paintFillEnabled === 'boolean'
        ? parsed.paintFillEnabled
        : defaultState.paintFillEnabled,
      leftPanelState: {
        ferramentas: typeof parsed.leftPanelState?.ferramentas === 'boolean'
          ? parsed.leftPanelState.ferramentas
          : defaultState.leftPanelState.ferramentas,
        'criar-molde': typeof parsed.leftPanelState?.['criar-molde'] === 'boolean'
          ? parsed.leftPanelState['criar-molde']
          : defaultState.leftPanelState['criar-molde'],
        ajustes: typeof parsed.leftPanelState?.ajustes === 'boolean'
          ? parsed.leftPanelState.ajustes
          : defaultState.leftPanelState.ajustes,
        'costura-medidas': typeof parsed.leftPanelState?.['costura-medidas'] === 'boolean'
          ? parsed.leftPanelState['costura-medidas']
          : typeof legacyLeftPanelState?.['area-total'] === 'boolean'
            ? legacyLeftPanelState['area-total']
          : defaultState.leftPanelState['costura-medidas'],
        utilitarios: typeof parsed.leftPanelState?.utilitarios === 'boolean'
          ? parsed.leftPanelState.utilitarios
          : defaultState.leftPanelState.utilitarios
      },
      leftPanelWidth: typeof parsed.leftPanelWidth === 'number'
        ? Math.min(MAX_LEFT_PANEL_WIDTH, Math.max(MIN_LEFT_PANEL_WIDTH, parsed.leftPanelWidth))
        : defaultState.leftPanelWidth,
      rightPanelState: {
        colors: typeof parsed.rightPanelState?.colors === 'boolean'
          ? parsed.rightPanelState.colors
          : defaultState.rightPanelState.colors,
        properties: typeof parsed.rightPanelState?.properties === 'boolean'
          ? parsed.rightPanelState.properties
          : defaultState.rightPanelState.properties,
        view: typeof parsed.rightPanelState?.view === 'boolean'
          ? parsed.rightPanelState.view
          : defaultState.rightPanelState.view,
        layers: typeof parsed.rightPanelState?.layers === 'boolean'
          ? parsed.rightPanelState.layers
          : defaultState.rightPanelState.layers,
        info: typeof parsed.rightPanelState?.info === 'boolean'
          ? parsed.rightPanelState.info
          : defaultState.rightPanelState.info
      },
      rightPanelWidth: typeof parsed.rightPanelWidth === 'number'
        ? Math.min(
            MAX_RIGHT_PANEL_WIDTH,
            Math.max(
              MIN_RIGHT_PANEL_WIDTH,
              Math.abs(parsed.rightPanelWidth - 268) < 0.0001
                ? defaultState.rightPanelWidth
                : parsed.rightPanelWidth
            )
          )
        : defaultState.rightPanelWidth,
      rulerOrigin: validRulerOrigin,
      rulerGuides: validRulerGuides
    };
  } catch {
    return defaultState;
  }
};

export const formatViewportCommandLabel = (
  commandId: CadEditorSessionPreferences['lastViewportCommandId']
) => {
  switch (commandId) {
    case 'zoom-in':
      return 'Zoom +';
    case 'zoom-out':
      return 'Zoom -';
    case 'fit':
      return 'Ajustar';
    case 'reset':
      return 'Reset';
    case 'zoom-1x':
      return 'Preset 1x';
    case 'zoom-2x':
      return 'Preset 2x';
    case 'zoom-5x':
      return 'Preset 5x';
    case 'zoom-10x':
      return 'Preset 10x';
    default:
      return 'Nenhum';
  }
};

export const matchesTextToolPreset = (
  preset: TextToolPresetDefinition,
  current: {
    textValue: string;
    height: number;
    rotation: number;
    alignment: DrawingTextAlignment;
    verticalAlignment: DrawingTextVerticalAlignment;
    textUsesAnnotationLayer: boolean;
    annotationLayerName: string;
    textAnnotationLayerName: string;
  }
) => {
  const currentTarget = !current.textUsesAnnotationLayer
    ? 'active'
    : current.textAnnotationLayerName === current.annotationLayerName
      ? 'dimension-annotation'
      : 'text-annotation';

  return (
    preset.textValue === current.textValue &&
    Math.abs(preset.height - current.height) < 0.0001 &&
    Math.abs(preset.rotation - current.rotation) < 0.0001 &&
    preset.alignment === current.alignment &&
    preset.verticalAlignment === current.verticalAlignment &&
    preset.target === currentTarget
  );
};

export const buildTextPresetDeviationLabels = (
  preset: TextToolPresetDefinition | null,
  current: {
    textValue: string;
    height: number;
    rotation: number;
    alignment: DrawingTextAlignment;
    verticalAlignment: DrawingTextVerticalAlignment;
    textUsesAnnotationLayer: boolean;
    annotationLayerName: string;
    textAnnotationLayerName: string;
  }
) => {
  if (!preset) {
    return [];
  }

  const deviations: string[] = [];
  const currentTarget = !current.textUsesAnnotationLayer
    ? 'active'
    : current.textAnnotationLayerName === current.annotationLayerName
      ? 'dimension-annotation'
      : 'text-annotation';

  if (preset.textValue !== current.textValue) {
    deviations.push('Conteudo');
  }
  if (Math.abs(preset.height - current.height) >= 0.0001) {
    deviations.push('Altura');
  }
  if (Math.abs(preset.rotation - current.rotation) >= 0.0001) {
    deviations.push('Rotacao');
  }
  if (preset.alignment !== current.alignment) {
    deviations.push('Alinhamento');
  }
  if (preset.verticalAlignment !== current.verticalAlignment) {
    deviations.push('Ancoragem');
  }
  if (preset.target !== currentTarget) {
    deviations.push('Destino');
  }

  return deviations;
};
