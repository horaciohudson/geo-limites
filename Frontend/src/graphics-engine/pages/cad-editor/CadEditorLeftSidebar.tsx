import type React from 'react';

type LeftDockItem = {
  id: string;
  label: string;
  iconPath: string;
};

type LeftToolItem = {
  id: string;
  label: string;
  section: string;
  iconPath: string;
  statusText?: string;
  disabled?: boolean;
  disabledReason?: string;
};

interface CadEditorLeftSidebarProps {
  leftPanelWidth: number;
  minLeftPanelWidth: number;
  maxLeftPanelWidth: number;
  title: string;
  docks: LeftDockItem[];
  tools: LeftToolItem[];
  activeToolId: string;
  leftPanelState: Record<string, boolean>;
  onToolActivate: (toolId: string) => void;
  onToggleLeftPanel: (dockId: string) => void;
  onLeftPanelResizeStart: React.MouseEventHandler<HTMLButtonElement>;
  onResetLeftPanelWidth: React.MouseEventHandler<HTMLButtonElement>;
  onLeftPanelResizeKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
  technicalSummaryScopeMode: 'full' | 'mixed' | 'partial' | 'exclude';
  onTechnicalSummaryScopeModeChange: (mode: 'full' | 'mixed' | 'partial' | 'exclude') => void;
  replaceableLotNumbers: number[];
  replaceableSelectionCount: number;
  onApplySavedPartialReplacementsInEditor: () => void;
  removableLotNumbers: number[];
  removableSelectionCount: number;
  onRemoveSelectedLotsFromDrawing: () => void;
}

export const CadEditorLeftSidebar: React.FC<CadEditorLeftSidebarProps> = ({
  leftPanelWidth,
  minLeftPanelWidth,
  maxLeftPanelWidth,
  title,
  docks,
  tools,
  activeToolId,
  leftPanelState,
  onToolActivate,
  onToggleLeftPanel,
  onLeftPanelResizeStart,
  onResetLeftPanelWidth,
  onLeftPanelResizeKeyDown,
  technicalSummaryScopeMode,
  onTechnicalSummaryScopeModeChange,
  replaceableLotNumbers,
  replaceableSelectionCount,
  onApplySavedPartialReplacementsInEditor,
  removableLotNumbers,
  removableSelectionCount,
  onRemoveSelectedLotsFromDrawing
}) => {
  const canApplyPersistentReplacement = (
    technicalSummaryScopeMode === 'partial'
    || technicalSummaryScopeMode === 'mixed'
  );

  return (
    <div
    className="cad-editor-left"
    style={{ width: `${leftPanelWidth}px`, minWidth: `${leftPanelWidth}px` }}
  >
    <aside className="cad-editor-tools-panel">
      <button
        type="button"
        className="cad-editor-left-resize-handle"
        onMouseDown={onLeftPanelResizeStart}
        onDoubleClick={onResetLeftPanelWidth}
        onKeyDown={onLeftPanelResizeKeyDown}
        aria-label="Redimensionar painel esquerdo"
        aria-valuemin={minLeftPanelWidth}
        aria-valuemax={maxLeftPanelWidth}
        aria-valuenow={Math.round(leftPanelWidth)}
        aria-valuetext={`${Math.round(leftPanelWidth)} pixels`}
        title="Arraste para redimensionar o painel esquerdo. Duplo clique restaura o padrao."
      />
      <div className="cad-editor-tools-header">{title}</div>
      {docks.map((dock) => (
        <details
          key={dock.id}
          className="cad-editor-tool-group"
          open={leftPanelState[dock.id]}
        >
          <summary
            onClick={(event) => {
              event.preventDefault();
              onToggleLeftPanel(dock.id);
            }}
          >
            {dock.label}
          </summary>
          <div className="cad-editor-tool-list">
            {dock.id === 'costura-medidas' ? (
              <div
                style={{
                  display: 'grid',
                  gap: '0.35rem',
                  padding: '0.55rem 0.7rem',
                  marginBottom: '0.45rem',
                  borderRadius: '0.65rem',
                  border: '1px solid rgba(148, 163, 184, 0.24)',
                  background: 'rgba(248, 250, 252, 0.72)'
                }}
              >
                <label
                  htmlFor="technical-summary-scope-mode"
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#475569'
                  }}
                >
                  Operacao nos lotes
                </label>
                <select
                  id="technical-summary-scope-mode"
                  value={technicalSummaryScopeMode}
                  onChange={(event) => onTechnicalSummaryScopeModeChange(event.target.value as 'full' | 'mixed' | 'partial' | 'exclude')}
                  style={{
                    width: '100%',
                    borderRadius: '0.55rem',
                    border: '1px solid rgba(148, 163, 184, 0.45)',
                    background: '#ffffff',
                    color: '#0f172a',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                  title="Define se o resumo sera total, total com parciais, parcial, ou se o trabalho atual sera de exclusao."
                >
                  <option value="full">Total</option>
                  <option value="mixed">Total + Parciais</option>
                  <option value="partial">Parciais</option>
                  <option value="exclude">Exclusao</option>
                </select>
              </div>
            ) : null}
            {dock.id === 'utilitarios' ? (
              <>
                <button
                  type="button"
                  className="cad-editor-tool-row"
                  disabled={technicalSummaryScopeMode !== 'exclude' || removableSelectionCount === 0}
                  onClick={onRemoveSelectedLotsFromDrawing}
                  aria-disabled={technicalSummaryScopeMode !== 'exclude' || removableSelectionCount === 0}
                  title={
                    technicalSummaryScopeMode !== 'exclude'
                      ? 'Ative o modo Exclusao em Operacao nos lotes para remover selecoes do desenho.'
                      : removableSelectionCount > 0
                        ? removableLotNumbers.length > 0
                          ? `Remove do desenho ${removableSelectionCount} contorno(s) marcado(s) manualmente. Lotes reconhecidos: ${removableLotNumbers.join(', ')}.`
                          : `Remove do desenho ${removableSelectionCount} contorno(s) marcado(s) manualmente com Alt + Select.`
                        : 'Marque e feche ao menos um contorno com Alt + Select para habilitar a remocao.'
                  }
                  style={{ marginBottom: '0.45rem' }}
                >
                  <span className="cad-editor-tool-row-copy">
                    <span className="cad-editor-tool-row-label">Remover Selecao</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="cad-editor-tool-row"
                  disabled={!canApplyPersistentReplacement || replaceableSelectionCount === 0}
                  onClick={onApplySavedPartialReplacementsInEditor}
                  aria-disabled={!canApplyPersistentReplacement || replaceableSelectionCount === 0}
                  title={
                    !canApplyPersistentReplacement
                      ? 'Ative o modo Parciais ou Total + Parciais em Operacao nos lotes para aplicar a substituicao persistente.'
                      : replaceableLotNumbers.length > 0
                        ? `Substitui de forma persistente no DXF os lotes ${replaceableLotNumbers.join(', ')} usando a selecao atual ou os parciais salvos.`
                        : replaceableSelectionCount > 0
                          ? `Substitui de forma persistente ${replaceableSelectionCount} contorno(s) parcial(is) selecionado(s), mesmo sem depender da camada Lotes visivel.`
                          : 'Selecione ou salve ao menos um parcial valido com Alt + Select para habilitar a substituicao persistente.'
                  }
                  style={{ marginBottom: '0.45rem' }}
                >
                  <span className="cad-editor-tool-row-copy">
                    <span className="cad-editor-tool-row-label">Substituir Lote</span>
                  </span>
                </button>
              </>
            ) : null}
            {tools.filter((tool) => tool.section === dock.id).map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`cad-editor-tool-row ${activeToolId === tool.id ? 'is-active' : ''}`}
                disabled={tool.disabled}
                onClick={() => onToolActivate(tool.id)}
                aria-disabled={tool.disabled}
                title={tool.disabled
                  ? (tool.disabledReason || tool.statusText || tool.label)
                  : (tool.statusText || tool.label)}
              >
                <svg className="cad-editor-tool-row-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d={tool.iconPath} />
                </svg>
                <span className="cad-editor-tool-row-copy">
                  <span className="cad-editor-tool-row-label">{tool.label}</span>
                  {tool.statusText && dock.id !== 'costura-medidas' ? (
                    <span className="cad-editor-tool-row-status">{tool.statusText}</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </details>
      ))}
    </aside>
  </div>
  );
};
