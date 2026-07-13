import {
  GEO_LIMITES_CAD_MEASUREMENT_UNITS,
  GEO_LIMITES_VIEWPORT_ZOOM_PRESETS
} from '@/graphics-engine/adapters/geolimites/cadEditorContentConfig';
import type {
  CadCommandItem,
  CadMenuId,
  CadMenuItem
} from '@/graphics-engine/pages/cad-editor/cadEditorMenuConfig';
import type { CadMeasurementUnit } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

export const GEO_LIMITES_CAD_MENU_ITEMS: ReadonlyArray<CadMenuItem> = [
  { id: 'file', label: 'Arquivos' },
  { id: 'edit', label: 'Editar' },
  { id: 'view', label: 'Visualizar' },
  { id: 'tools', label: 'Ferramentas' },
  { id: 'help', label: 'Ajuda' },
  { id: 'config', label: 'Configurar' }
];

export const GEO_LIMITES_CAD_COMMAND_ITEMS: ReadonlyArray<CadCommandItem> = [
  { id: 'zoom-in', label: '+', compact: true },
  { id: 'zoom-out', label: '-', compact: true },
  { id: 'fit', label: 'Ajustar' },
  { id: 'undo', label: 'Undo', compact: true },
  { id: 'redo', label: 'Redo', compact: true },
  ...GEO_LIMITES_VIEWPORT_ZOOM_PRESETS.map((preset) => ({ id: preset.id, label: preset.label }))
];

export const GEO_LIMITES_MEASUREMENT_UNIT_MENU_ACTIONS = Object.fromEntries(
  GEO_LIMITES_CAD_MEASUREMENT_UNITS.map((unit) => [`config-unit-${unit.id}`, unit.id])
) as Record<string, CadMeasurementUnit>;

export const GEO_LIMITES_MENU_IDS = GEO_LIMITES_CAD_MENU_ITEMS.map((item) => item.id) as ReadonlyArray<CadMenuId>;
