import type React from 'react';

interface CadEditorShortcutDialogItem {
  keys: string;
  description: string;
}

interface CadEditorShortcutsDialogSection {
  title: string;
  items: CadEditorShortcutDialogItem[];
}

interface CadEditorShortcutsDialogProps {
  isOpen: boolean;
  texts?: {
    title: string;
    closeButtonLabel: string;
    helperText: string;
    sections: CadEditorShortcutsDialogSection[];
  };
  onClose: () => void;
}

const DEFAULT_SHORTCUTS_DIALOG_TEXTS: NonNullable<CadEditorShortcutsDialogProps['texts']> = {
  title: 'Atalhos do Editor CAD',
  closeButtonLabel: 'Fechar',
  helperText: 'Use estes atalhos com foco no editor. Em navegadores, algumas combinacoes reservadas podem ser interceptadas.',
  sections: [
    {
      title: 'Arquivo',
      items: [
        { keys: 'Alt+N', description: 'Novo desenho' },
        { keys: 'Ctrl+O', description: 'Abrir arquivo' },
        { keys: 'Ctrl+S', description: 'Salvar no mesmo arquivo' },
        { keys: 'Ctrl+Shift+S', description: 'Salvar Como' },
        { keys: 'Ctrl+W', description: 'Fechar documento atual' }
      ]
    },
    {
      title: 'Edicao',
      items: [
        { keys: 'Ctrl+Z', description: 'Undo' },
        { keys: 'Ctrl+Y', description: 'Redo' },
        { keys: 'Delete / Backspace', description: 'Remover selecao' },
        { keys: 'Esc', description: 'Limpar selecao ou fechar a ajuda' }
      ]
    },
    {
      title: 'Ferramentas',
      items: [
        { keys: 'V', description: 'Selecionar' },
        { keys: 'H', description: 'Pan' },
        { keys: 'Z', description: 'Zoom' },
        { keys: 'J', description: 'Weld' },
        { keys: 'M', description: 'Mirror' },
        { keys: 'R', description: 'Rotate' },
        { keys: 'O', description: 'Offset' },
        { keys: 'E', description: 'Extend' },
        { keys: 'T', description: 'Trim' }
      ]
    },
    {
      title: 'Viewport e ajuda',
      items: [
        { keys: 'F', description: 'Fit no desenho' },
        { keys: '+ / =', description: 'Zoom in' },
        { keys: '-', description: 'Zoom out' },
        { keys: '0', description: 'Reset viewport' },
        { keys: 'F1 / ?', description: 'Abrir ajuda de atalhos' }
      ]
    }
  ]
};

export const CadEditorShortcutsDialog: React.FC<CadEditorShortcutsDialogProps> = ({
  isOpen,
  texts,
  onClose
}) => {
  const resolvedTexts = texts ?? DEFAULT_SHORTCUTS_DIALOG_TEXTS;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="cad-editor-settings-backdrop" onClick={onClose}>
      <div
        className="cad-editor-settings-dialog cad-editor-shortcuts-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cad-editor-settings-header">
          <strong>{resolvedTexts.title}</strong>
          <button type="button" className="cad-editor-secondary-button" onClick={onClose}>
            {resolvedTexts.closeButtonLabel}
          </button>
        </div>
        <div className="cad-editor-settings-body">
          <div className="cad-editor-info-details">{resolvedTexts.helperText}</div>
          <div className="cad-editor-shortcuts-grid">
            {resolvedTexts.sections.map((section) => (
              <section key={section.title} className="cad-editor-shortcuts-section">
                <strong>{section.title}</strong>
                <div className="cad-editor-shortcuts-list">
                  {section.items.map((item) => (
                    <div key={`${section.title}-${item.keys}`} className="cad-editor-shortcuts-row">
                      <kbd>{item.keys}</kbd>
                      <span>{item.description}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
