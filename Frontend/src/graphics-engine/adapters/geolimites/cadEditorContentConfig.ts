import {
  createDefaultCadEditorSettings,
  createDefaultTextToolSessionState,
  createEmptyDxfDataFromLayers,
  loadTextToolSessionState,
  TEXT_TOOL_SESSION_STORAGE_KEY,
  type CadMeasurementUnitOption,
  type CadViewportZoomPreset,
  type CadLayerDefinition,
  type TextToolPresetDefinition,
  type ViewportCommandId
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';
import {
  GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF,
  GEO_LIMITES_FUNCTIONAL_LAYER_AUXILIAR,
  GEO_LIMITES_FUNCTIONAL_LAYER_CONFRONTACOES_TXT,
  GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM,
  GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT
} from '@/graphics-engine/adapters/geolimites/functionalLayerUtils';

export const GEO_LIMITES_CAD_LAYERS: CadLayerDefinition[] = [
  { name: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM, colorClass: 'cad-editor-layer-color--neutral', entityCount: 0 },
  { name: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT, colorClass: 'cad-editor-layer-color--green', entityCount: 0 },
  { name: GEO_LIMITES_FUNCTIONAL_LAYER_CONFRONTACOES_TXT, colorClass: 'cad-editor-layer-color--blue', entityCount: 0 },
  { name: GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF, colorClass: 'cad-editor-layer-color--purple', entityCount: 0 },
  { name: GEO_LIMITES_FUNCTIONAL_LAYER_AUXILIAR, colorClass: 'cad-editor-layer-color--amber', entityCount: 0 }
];

export const GEO_LIMITES_CAD_LAYER_PLACEHOLDERS = Array.from({ length: 6 }, (_, index) => `placeholder-${index}`);

export const GEO_LIMITES_CAD_LAYER_COLOR_CLASSES = [
  'cad-editor-layer-color--neutral',
  'cad-editor-layer-color--green',
  'cad-editor-layer-color--blue',
  'cad-editor-layer-color--amber',
  'cad-editor-layer-color--purple',
  'cad-editor-layer-color--red'
] as const;

export const GEO_LIMITES_CAD_MEASUREMENT_UNITS: CadMeasurementUnitOption[] = [
  { id: 'mm', label: 'Milimetros', shortLabel: 'mm', defaultWorkspaceSize: 10000, defaultGridSnapSize: 10, majorGridStep: 1000 },
  { id: 'cm', label: 'Centimetros', shortLabel: 'cm', defaultWorkspaceSize: 1000, defaultGridSnapSize: 1, majorGridStep: 100 },
  { id: 'm', label: 'Metros', shortLabel: 'm', defaultWorkspaceSize: 10, defaultGridSnapSize: 0.1, majorGridStep: 1 }
];

export const GEO_LIMITES_VIEWPORT_ZOOM_PRESETS: CadViewportZoomPreset<ViewportCommandId>[] = [
  { id: 'zoom-1x', label: '1x', zoom: 1 },
  { id: 'zoom-2x', label: '2x', zoom: 2 },
  { id: 'zoom-5x', label: '5x', zoom: 5 },
  { id: 'zoom-10x', label: '10x', zoom: 10 }
];

export const GEO_LIMITES_TEXT_TOOL_PRESETS: TextToolPresetDefinition[] = [
  {
    id: 'texto-comum',
    label: 'Texto comum',
    textValue: 'Texto',
    height: 2.5,
    rotation: 0,
    alignment: 'left',
    verticalAlignment: 'baseline',
    target: 'active'
  },
  {
    id: 'texto-tecnico',
    label: 'Texto tecnico',
    textValue: 'OBSERVACAO',
    height: 2.5,
    rotation: 0,
    alignment: 'left',
    verticalAlignment: 'baseline',
    target: 'text-annotation'
  },
  {
    id: 'rotulo-centralizado',
    label: 'Rotulo centralizado',
    textValue: 'ROTULO',
    height: 3,
    rotation: 0,
    alignment: 'center',
    verticalAlignment: 'middle',
    target: 'active'
  },
  {
    id: 'cota',
    label: 'Cota',
    textValue: 'COTA',
    height: 2.5,
    rotation: 0,
    alignment: 'center',
    verticalAlignment: 'middle',
    target: 'dimension-annotation'
  }
];

export const GEO_LIMITES_CUSTOM_TEXT_TOOL_PRESET_ID = 'personalizado';
export const GEO_LIMITES_CUSTOM_TEXT_TOOL_PRESET_LABEL = 'Personalizado';

export const createGeoLimitesEmptyDxfData = () => {
  return createEmptyDxfDataFromLayers(GEO_LIMITES_CAD_LAYERS);
};

export const loadGeoLimitesCadEditorSettings = () => {
  return createDefaultCadEditorSettings({
    measurementUnit: GEO_LIMITES_CAD_MEASUREMENT_UNITS[1]?.id ?? 'cm',
    newDocumentWorkspaceSize: GEO_LIMITES_CAD_MEASUREMENT_UNITS[1]?.defaultWorkspaceSize ?? 1000
  });
};

export const loadGeoLimitesTextToolSessionState = () => {
  return loadTextToolSessionState({
    presets: GEO_LIMITES_TEXT_TOOL_PRESETS,
    defaultState: createDefaultTextToolSessionState({
      presetId: GEO_LIMITES_TEXT_TOOL_PRESETS[0].id,
      textValue: GEO_LIMITES_TEXT_TOOL_PRESETS[0].textValue
    }),
    storageKey: TEXT_TOOL_SESSION_STORAGE_KEY
  });
};
