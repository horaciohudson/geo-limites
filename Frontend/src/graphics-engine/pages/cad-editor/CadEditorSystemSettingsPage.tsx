import React, { useEffect, useMemo, useState } from 'react';
import type {
  CadEditorSettings,
  CadMeasurementUnit,
  CadMeasurementUnitOption
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

interface CadEditorSystemSettingsPageProps {
  isOpen: boolean;
  canManageSettings: boolean;
  measurementUnit: CadMeasurementUnit;
  newDocumentWorkspaceSize: number;
  measurementUnitOptions: ReadonlyArray<CadMeasurementUnitOption>;
  onClose: () => void;
  onSave: (settings: CadEditorSettings) => Promise<void>;
}

export const CadEditorSystemSettingsPage: React.FC<CadEditorSystemSettingsPageProps> = ({
  isOpen,
  canManageSettings,
  measurementUnit,
  newDocumentWorkspaceSize,
  measurementUnitOptions,
  onClose,
  onSave
}) => {
  const [draftUnit, setDraftUnit] = useState<CadMeasurementUnit>(measurementUnit);
  const [draftWorkspaceSize, setDraftWorkspaceSize] = useState(newDocumentWorkspaceSize);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDraftUnit(measurementUnit);
    setDraftWorkspaceSize(newDocumentWorkspaceSize);
    setSaveError('');
  }, [isOpen, measurementUnit, newDocumentWorkspaceSize]);

  const selectedUnitOption = useMemo(
    () => measurementUnitOptions.find((option) => option.id === draftUnit) || measurementUnitOptions[0],
    [draftUnit, measurementUnitOptions]
  );

  if (!isOpen || !selectedUnitOption) {
    return null;
  }

  const handleUnitChange = (nextUnit: CadMeasurementUnit) => {
    const nextOption = measurementUnitOptions.find((option) => option.id === nextUnit) || selectedUnitOption;
    setDraftUnit(nextUnit);
    setDraftWorkspaceSize(nextOption.defaultWorkspaceSize);
  };

  const handleSave = async () => {
    setSaveError('');
    setIsSaving(true);
    try {
      await onSave({
        measurementUnit: draftUnit,
        newDocumentWorkspaceSize: draftWorkspaceSize
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel salvar as configuracoes do sistema.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="cad-editor-system-settings-page">
      <div className="cad-editor-system-settings-shell">
        <div className="cad-editor-system-settings-header">
          <div>
            <p className="cad-editor-system-settings-eyebrow">Editor CAD</p>
            <h2>Configuracoes do Sistema</h2>
            <p className="cad-editor-system-settings-description">
              Esta tela define a unidade padrao usada pelo Editor CAD e pelo Resumo Tecnico em todo o sistema.
            </p>
          </div>
          <div className="cad-editor-system-settings-actions">
            <button type="button" className="cad-editor-command-button" onClick={onClose}>
              Voltar ao editor
            </button>
            <button
              type="button"
              className="cad-editor-command-button primary"
              onClick={handleSave}
              disabled={!canManageSettings || isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar configuracao sistemica'}
            </button>
          </div>
        </div>

        <div className="cad-editor-system-settings-grid">
          <section className="cad-editor-system-settings-card">
            <h3>Unidade padrao</h3>
            <p>Escolha a unidade base para novos desenhos e para a apresentacao do Resumo Tecnico.</p>
            <div className="cad-editor-system-settings-unit-grid">
              {measurementUnitOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`cad-editor-system-settings-unit-card${draftUnit === option.id ? ' is-active' : ''}`}
                  onClick={() => handleUnitChange(option.id)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.shortLabel}</span>
                  <small>Grid padrao {option.defaultGridSnapSize} {option.shortLabel}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="cad-editor-system-settings-card">
            <h3>Area-base de novos desenhos</h3>
            <p>Esse valor passa a ser o padrao de abertura para novos arquivos criados no editor.</p>
            <label className="cad-editor-setting-field">
              <span>Area-base</span>
              <div className="cad-editor-system-settings-input-row">
                <input
                  type="number"
                  min="0.0001"
                  step={draftUnit === 'm' ? '0.1' : '1'}
                  value={draftWorkspaceSize}
                  onChange={(event) => setDraftWorkspaceSize(Number(event.target.value))}
                />
                <strong>{selectedUnitOption.shortLabel}</strong>
              </div>
            </label>

            <div className="cad-editor-system-settings-summary">
              <div>
                <span>Grid padrao</span>
                <strong>{selectedUnitOption.defaultGridSnapSize} {selectedUnitOption.shortLabel}</strong>
              </div>
              <div>
                <span>Linha forte</span>
                <strong>{selectedUnitOption.majorGridStep} {selectedUnitOption.shortLabel}</strong>
              </div>
            </div>
          </section>
        </div>

        {!canManageSettings && (
          <div className="cad-editor-system-settings-banner warning">
            Apenas administradores podem alterar a configuracao sistemica. Os valores atuais continuam ativos para o editor e para o Resumo Tecnico.
          </div>
        )}
        {saveError && (
          <div className="cad-editor-system-settings-banner error">
            {saveError}
          </div>
        )}
      </div>
    </div>
  );
};
