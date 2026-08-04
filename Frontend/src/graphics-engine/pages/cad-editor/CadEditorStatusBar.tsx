import type React from 'react';

interface CadEditorStatusBarProps {
  documentLabel: string;
  activeToolLabel: string;
  activeToolShortcutLabel: string | null;
  isEntityMultiSelectModeActive?: boolean;
  activeLayerLabel: string;
  measurementUnitShortLabel: string;
  viewportLabel: string;
  rulerOriginLabel: string;
  editorNotice: string;
  texts?: {
    toolLabel: string;
    shortcutLabel: string;
    noShortcut: string;
    layerLabel: string;
    measurementUnitLabel: string;
  };
}

const DEFAULT_STATUS_BAR_TEXTS: NonNullable<CadEditorStatusBarProps['texts']> = {
  toolLabel: 'Ferramenta:',
  shortcutLabel: 'Atalho:',
  noShortcut: 'Sem atalho',
  layerLabel: 'Camada:',
  measurementUnitLabel: 'Unidade:'
};

export const CadEditorStatusBar: React.FC<CadEditorStatusBarProps> = ({
  documentLabel,
  activeToolLabel,
  activeToolShortcutLabel,
  isEntityMultiSelectModeActive = false,
  activeLayerLabel,
  measurementUnitShortLabel,
  viewportLabel,
  rulerOriginLabel,
  editorNotice,
  texts
}) => {
  const resolvedTexts = texts ?? DEFAULT_STATUS_BAR_TEXTS;

  return (
    <div className="cad-editor-statusbar cad-editor-statusbar--studio">
      <span className="cad-editor-status-text">{documentLabel}</span>
      <span className="cad-editor-status-separator" />
      <span>{resolvedTexts.toolLabel} {activeToolLabel}</span>
      <span className="cad-editor-status-separator" />
      <span>{resolvedTexts.shortcutLabel} {activeToolShortcutLabel || resolvedTexts.noShortcut}</span>
      {isEntityMultiSelectModeActive ? (
        <>
          <span className="cad-editor-status-separator" />
          <span className="cad-editor-status-pill cad-editor-status-pill--active">Selecao multipla ativa</span>
        </>
      ) : null}
      <span className="cad-editor-status-separator" />
      <span>{resolvedTexts.layerLabel} {activeLayerLabel}</span>
      <span className="cad-editor-status-separator" />
      <span>{resolvedTexts.measurementUnitLabel} {measurementUnitShortLabel}</span>
      <span className="cad-editor-status-separator" />
      <span>{viewportLabel}</span>
      <span className="cad-editor-status-separator" />
      <span>{rulerOriginLabel}</span>
      <span className="cad-editor-status-separator" />
      <span>{editorNotice}</span>
    </div>
  );
};
