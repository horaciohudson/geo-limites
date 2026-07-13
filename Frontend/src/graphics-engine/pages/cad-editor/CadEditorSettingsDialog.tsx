import type React from 'react';
import type { CadMeasurementUnit, CadMeasurementUnitOption } from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

interface CadEditorSettingsDialogProps {
  isOpen: boolean;
  measurementUnit: CadMeasurementUnit;
  newDocumentWorkspaceSize: number;
  measurementUnitOptions: Array<Pick<CadMeasurementUnitOption, 'id' | 'label'>>;
  workspaceStep: string;
  texts?: {
    title: string;
    closeButtonLabel: string;
    measurementUnitLabel: string;
    workspaceBaseLabel: string;
    workspaceHelpText: string;
  };
  onClose: () => void;
  onMeasurementUnitChange: (unitId: CadMeasurementUnit) => void;
  onWorkspaceSizeChange: (value: number) => void;
  onApplyMeasurementUnit: (unitId: CadMeasurementUnit) => void;
}

const DEFAULT_SETTINGS_DIALOG_TEXTS: NonNullable<CadEditorSettingsDialogProps['texts']> = {
  title: 'Configurador do Editor CAD',
  closeButtonLabel: 'Fechar',
  measurementUnitLabel: 'Unidade:',
  workspaceBaseLabel: 'Area base:',
  workspaceHelpText: 'A area-base define o envelope minimo do viewport para desenhos novos. Isso impede que a grade fique gigante e que o canvas reescale brutalmente a cada entidade pequena criada.'
};

export const CadEditorSettingsDialog: React.FC<CadEditorSettingsDialogProps> = ({
  isOpen,
  measurementUnit,
  newDocumentWorkspaceSize,
  measurementUnitOptions,
  workspaceStep,
  texts,
  onClose,
  onMeasurementUnitChange,
  onWorkspaceSizeChange,
  onApplyMeasurementUnit
}) => {
  const resolvedTexts = texts ?? DEFAULT_SETTINGS_DIALOG_TEXTS;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="cad-editor-settings-backdrop" onClick={onClose}>
      <div className="cad-editor-settings-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="cad-editor-settings-header">
          <strong>{resolvedTexts.title}</strong>
          <button type="button" className="cad-editor-secondary-button" onClick={onClose}>
            {resolvedTexts.closeButtonLabel}
          </button>
        </div>
        <div className="cad-editor-settings-body">
          <label className="cad-editor-field">
            <span>{resolvedTexts.measurementUnitLabel}</span>
            <select
              className="cad-editor-side-select"
              value={measurementUnit}
              onChange={(event) => onMeasurementUnitChange(event.target.value as CadMeasurementUnit)}
            >
              {measurementUnitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>
          <label className="cad-editor-field">
            <span>{resolvedTexts.workspaceBaseLabel}</span>
            <input
              className="cad-editor-side-input"
              type="number"
              min="0.1"
              step={workspaceStep}
              value={newDocumentWorkspaceSize}
              onChange={(event) => {
                const nextValue = Number.parseFloat(event.target.value);
                if (Number.isFinite(nextValue) && nextValue > 0) {
                  onWorkspaceSizeChange(nextValue);
                }
              }}
            />
          </label>
          <div className="cad-editor-info-details">
            {resolvedTexts.workspaceHelpText}
          </div>
          <div className="cad-editor-settings-presets">
            {measurementUnitOptions.map((unit) => (
              <button
                key={unit.id}
                type="button"
                className={`cad-editor-command-button${measurementUnit === unit.id ? ' is-active' : ''}`}
                onClick={() => onApplyMeasurementUnit(unit.id)}
              >
                {unit.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
