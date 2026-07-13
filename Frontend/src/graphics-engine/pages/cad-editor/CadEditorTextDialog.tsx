import React, { useEffect, useState } from 'react';

interface CadEditorTextDialogProps {
  isOpen: boolean;
  initialValue: string;
  targetLayerLabel: string;
  pointLabel?: string | null;
  texts?: {
    title: string;
    closeButtonLabel: string;
    contentLabel: string;
    placeholder: string;
    defaultTextValue?: string;
    buildDetailsText: (params: { pointLabel?: string | null; targetLayerLabel: string }) => string;
    buildInsertedNotice?: (params: { layerName: string; pointLabel: string }) => string;
    cancelButtonLabel: string;
    applyButtonLabel: string;
  };
  onClose: () => void;
  onConfirm: (value: string) => void;
}

const DEFAULT_TEXT_DIALOG_TEXTS: NonNullable<CadEditorTextDialogProps['texts']> = {
  title: 'Inserir Texto',
  closeButtonLabel: 'Fechar',
  contentLabel: 'Conteudo:',
  placeholder: 'Texto',
  defaultTextValue: 'Texto',
  buildDetailsText: ({ pointLabel, targetLayerLabel }) => `Texto sera aplicado no ponto selecionado${pointLabel ? ` (${pointLabel})` : ''}. Camada atual: ${targetLayerLabel}.`,
  buildInsertedNotice: ({ layerName, pointLabel }) => `Texto inserido na camada ${layerName} em ${pointLabel}.`,
  cancelButtonLabel: 'Cancelar',
  applyButtonLabel: 'Aplicar'
};

export const CadEditorTextDialog: React.FC<CadEditorTextDialogProps> = ({
  isOpen,
  initialValue,
  targetLayerLabel,
  pointLabel = null,
  texts,
  onClose,
  onConfirm
}) => {
  const [draftValue, setDraftValue] = useState(initialValue);
  const resolvedTexts = texts ?? DEFAULT_TEXT_DIALOG_TEXTS;

  useEffect(() => {
    if (isOpen) {
      setDraftValue(initialValue);
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
              onChange={(event) => setDraftValue(event.target.value)}
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
            {resolvedTexts.buildDetailsText({ pointLabel, targetLayerLabel })}
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
