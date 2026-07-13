import api from '@/services/api';
import type {
  CadEditorSettings,
  CadMeasurementUnit,
  CadMeasurementUnitOption
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

export interface CadSystemSettings {
  measurementUnit: CadMeasurementUnit;
  newDocumentWorkspaceSize: number;
  updatedAt?: string | null;
}

const isCadMeasurementUnit = (value: unknown): value is CadMeasurementUnit =>
  value === 'mm' || value === 'cm' || value === 'm';

export const normalizeCadSystemSettings = (
  value: Partial<CadSystemSettings> | null | undefined,
  measurementUnitOptions: ReadonlyArray<CadMeasurementUnitOption>,
  fallbackSettings: CadEditorSettings
): CadEditorSettings => {
  const fallbackUnit = measurementUnitOptions.find((item) => item.id === fallbackSettings.measurementUnit)
    || measurementUnitOptions[0];

  if (!fallbackUnit) {
    return fallbackSettings;
  }

  const measurementUnit = isCadMeasurementUnit(value?.measurementUnit)
    ? value.measurementUnit
    : fallbackSettings.measurementUnit;
  const selectedUnit = measurementUnitOptions.find((item) => item.id === measurementUnit) || fallbackUnit;

  return {
    measurementUnit,
    newDocumentWorkspaceSize: typeof value?.newDocumentWorkspaceSize === 'number' && value.newDocumentWorkspaceSize > 0
      ? value.newDocumentWorkspaceSize
      : selectedUnit.defaultWorkspaceSize
  };
};

const cadSystemSettingsService = {
  async getSettings(): Promise<CadSystemSettings> {
    const response = await api.get('/cad/settings');
    return response.data;
  },

  async updateSettings(payload: CadEditorSettings): Promise<CadSystemSettings> {
    const response = await api.patch('/cad/settings', payload);
    return response.data;
  }
};

export default cadSystemSettingsService;
