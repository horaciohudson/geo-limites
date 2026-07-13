import React, { useEffect, useState } from 'react';

interface CadEditorLayerDialogProps {
  isOpen: boolean;
  initialValue: string;
  texts?: {
    title: string;
    closeButtonLabel: string;
    contentLabel: string;
    placeholder: string;
    helperText: string;
    duplicateLayerNotice: (params: { layerName: string }) => string;
    cancelButtonLabel: string;
    applyButtonLabel: string;
  };
  onClose: () => void;
  onConfirm: (value: string) => void;
}

const DEFAULT_LAYER_DIALOG_TEXTS: NonNullable<CadEditorLayerDialogProps['texts']> = {
  title: 'Nova Camada',
  closeButtonLabel: 'Fechar',
  contentLabel: 'Nome:',
  placeholder: 'CAMADA_NOVA',
  helperText: 'Digite o nome da nova camada. As letras sao convertidas para MAIUSCULAS durante a digitacao.',
  duplicateLayerNotice: ({ layerName }) => `A camada ${layerName} ja existe.`,
  cancelButtonLabel: 'Cancelar',
  applyButtonLabel: 'Criar'
};

export const CadEditorLayerDialog: React.FC<CadEditorLayerDialogProps> = ({
  isOpen,
  initialValue,
  texts,
  onClose,
  onConfirm
}) => {
  const [draftValue, setDraftValue] = useState(initialValue);
  const resolvedTexts = texts ?? DEFAULT_LAYER_DIALOG_TEXTS;

  useEffect(() => {
    if (isOpen) {
      setDraftValue(initialValue.toLocaleUpperCase('pt-BR'));
    }
  }, [initialValue, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="cad-editor-settings-backdrop" onClick={onClose}>
      <div className="cad-editor-settings-dialog cad-editor-text-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="cad-editor-settings-header">
          <strong>{resolvedTexts.title}</strong>
          <button type="button" className="cad-editor-secondary-button" onClick={onClose}>
            {resolvedTexts.closeButtonLabel}
          </button>
        </div>
        <div className="cad-editor-settings-body">
          <label className="cad-editor-field">
            <span>{resolvedTexts.contentLabel}</span>
            <input
              autoFocus
              className="cad-editor-side-input"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value.toLocaleUpperCase('pt-BR'))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onConfirm(draftValue);
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  onClose();
                }
              }}
              placeholder={resolvedTexts.placeholder}
            />
          </label>
          <div className="cad-editor-info-details">
            {resolvedTexts.helperText}
          </div>
          <div className="cad-editor-settings-presets cad-editor-text-dialog-actions">
            <button type="button" className="cad-editor-secondary-button" onClick={onClose}>
              {resolvedTexts.cancelButtonLabel}
            </button>
            <button type="button" className="cad-editor-command-button" onClick={() => onConfirm(draftValue)}>
              {resolvedTexts.applyButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
