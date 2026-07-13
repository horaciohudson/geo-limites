import type React from 'react';
import type { CadGuide } from '@/graphics-engine/pages/cad-editor/cadEditorRulerUtils';

interface CadEditorContextMenusProps {
  guideContextMenuGuide: CadGuide | null;
  guideContextMenuStyle?: React.CSSProperties;
  guideContextMenuRef: React.RefObject<HTMLDivElement>;
  entityContextMenuStyle?: React.CSSProperties;
  entityContextMenuRef: React.RefObject<HTMLDivElement>;
  selectedEntityCount: number;
  selectionEntityLabel: string;
  selectionLayerLabel: string;
  selectionPositionLabel: string;
  copiedEntitiesCount: number;
  onToggleGuideLocked: (guideId: string) => void;
  onCloseGuideContextMenu: () => void;
  onRemoveGuideById: (guideId: string) => void;
  onClearSelectedGuide: () => void;
  onCutSelectedEntities: () => void;
  onCopySelectedEntities: () => void;
  onPasteCopiedEntities: () => void;
  onBringSelectedEntitiesForwardOneStep: () => void;
  onSendSelectedEntitiesBackwardOneStep: () => void;
  onBringSelectedEntitiesToFront: () => void;
  onSendSelectedEntitiesToBack: () => void;
  onDuplicateSelectedEntities: () => void;
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
  onGroupSelectedEntities: () => void;
  onUngroupSelectedEntities: () => void;
  onRemoveSelectedEntities: () => void;
  onClearSelectedEntities: () => void;
}

export const CadEditorContextMenus: React.FC<CadEditorContextMenusProps> = ({
  guideContextMenuGuide,
  guideContextMenuStyle,
  guideContextMenuRef,
  entityContextMenuStyle,
  entityContextMenuRef,
  selectedEntityCount,
  selectionEntityLabel,
  selectionLayerLabel,
  selectionPositionLabel,
  copiedEntitiesCount,
  onToggleGuideLocked,
  onCloseGuideContextMenu,
  onRemoveGuideById,
  onClearSelectedGuide,
  onCutSelectedEntities,
  onCopySelectedEntities,
  onPasteCopiedEntities,
  onBringSelectedEntitiesForwardOneStep,
  onSendSelectedEntitiesBackwardOneStep,
  onBringSelectedEntitiesToFront,
  onSendSelectedEntitiesToBack,
  onDuplicateSelectedEntities,
  canGroupSelection,
  canUngroupSelection,
  onGroupSelectedEntities,
  onUngroupSelectedEntities,
  onRemoveSelectedEntities,
  onClearSelectedEntities
}) => {
  const runGuideMenuAction = (action: string) => {
    if (!guideContextMenuGuide) {
      return;
    }

    switch (action) {
      case 'toggle-guide-lock':
        onToggleGuideLocked(guideContextMenuGuide.id);
        onCloseGuideContextMenu();
        break;
      case 'remove-guide':
        onRemoveGuideById(guideContextMenuGuide.id);
        break;
      case 'clear-guide':
        onClearSelectedGuide();
        break;
      default:
        break;
    }
  };

  const runEntityMenuAction = (action: string) => {
    switch (action) {
      case 'cut':
        onCutSelectedEntities();
        break;
      case 'copy':
        onCopySelectedEntities();
        break;
      case 'paste':
        onPasteCopiedEntities();
        break;
      case 'bring-forward':
        onBringSelectedEntitiesForwardOneStep();
        break;
      case 'send-backward':
        onSendSelectedEntitiesBackwardOneStep();
        break;
      case 'bring-front':
        onBringSelectedEntitiesToFront();
        break;
      case 'send-back':
        onSendSelectedEntitiesToBack();
        break;
      case 'duplicate':
        onDuplicateSelectedEntities();
        break;
      case 'group':
        onGroupSelectedEntities();
        break;
      case 'ungroup':
        onUngroupSelectedEntities();
        break;
      case 'remove':
        onRemoveSelectedEntities();
        break;
      case 'clear':
        onClearSelectedEntities();
        break;
      default:
        break;
    }
  };

  const runMenuActionOnClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.detail !== 0) {
      return;
    }
    action();
  };

  return (
    <>
    {guideContextMenuGuide && guideContextMenuStyle ? (
      <div
        ref={guideContextMenuRef}
        className="cad-editor-guide-context-menu"
        style={guideContextMenuStyle}
        role="menu"
        aria-label="Menu contextual da guia"
        onMouseDownCapture={(event) => {
          const actionButton = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('button[data-guide-action]');
          if (actionButton && !actionButton.disabled) {
            event.preventDefault();
            event.stopPropagation();
            runGuideMenuAction(actionButton.dataset.guideAction || '');
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="cad-editor-guide-context-menu-header">
          <strong>{guideContextMenuGuide.orientation === 'vertical' ? 'Guia Vertical' : 'Guia Horizontal'}</strong>
          <span>
            Pos. {guideContextMenuGuide.position.toFixed(3)} | {guideContextMenuGuide.locked ? 'Travada' : 'Livre'}
          </span>
        </div>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-guide-action="toggle-guide-lock"
          onClick={(event) => runMenuActionOnClick(event, () => {
            onToggleGuideLocked(guideContextMenuGuide.id);
            onCloseGuideContextMenu();
          })}
        >
          {guideContextMenuGuide.locked ? 'Destravar' : 'Travar'}
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item cad-editor-guide-context-menu-item--danger"
          data-guide-action="remove-guide"
          disabled={guideContextMenuGuide.locked}
          onClick={(event) => runMenuActionOnClick(event, () => {
            onRemoveGuideById(guideContextMenuGuide.id);
          })}
        >
          Remover
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-guide-action="clear-guide"
          onClick={(event) => runMenuActionOnClick(event, onClearSelectedGuide)}
        >
          Desmarcar
        </button>
      </div>
    ) : null}
    {selectedEntityCount > 0 && entityContextMenuStyle ? (
      <div
        ref={entityContextMenuRef}
        className="cad-editor-guide-context-menu"
        style={entityContextMenuStyle}
        role="menu"
        aria-label="Menu contextual da entidade"
        onMouseDownCapture={(event) => {
          const actionButton = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('button[data-entity-action]');
          if (actionButton && !actionButton.disabled) {
            event.preventDefault();
            event.stopPropagation();
            runEntityMenuAction(actionButton.dataset.entityAction || '');
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="cad-editor-guide-context-menu-header">
          <strong>{selectedEntityCount > 1 ? `${selectedEntityCount} Entidades` : selectionEntityLabel}</strong>
          <span>
            {selectionLayerLabel} | {selectionPositionLabel}
          </span>
        </div>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="cut"
          onClick={(event) => runMenuActionOnClick(event, onCutSelectedEntities)}
        >
          Recortar
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="copy"
          onClick={(event) => runMenuActionOnClick(event, onCopySelectedEntities)}
        >
          Copiar
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="paste"
          disabled={copiedEntitiesCount === 0}
          onClick={(event) => runMenuActionOnClick(event, onPasteCopiedEntities)}
        >
          Colar
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="group"
          disabled={!canGroupSelection}
          onClick={(event) => runMenuActionOnClick(event, onGroupSelectedEntities)}
        >
          Agrupar
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="ungroup"
          disabled={!canUngroupSelection}
          onClick={(event) => runMenuActionOnClick(event, onUngroupSelectedEntities)}
        >
          Desagrupar
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="bring-forward"
          onClick={(event) => runMenuActionOnClick(event, onBringSelectedEntitiesForwardOneStep)}
        >
          Avancar um nivel
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="send-backward"
          onClick={(event) => runMenuActionOnClick(event, onSendSelectedEntitiesBackwardOneStep)}
        >
          Recuar um nivel
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="bring-front"
          onClick={(event) => runMenuActionOnClick(event, onBringSelectedEntitiesToFront)}
        >
          Trazer para frente
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="send-back"
          onClick={(event) => runMenuActionOnClick(event, onSendSelectedEntitiesToBack)}
        >
          Enviar para tras
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="duplicate"
          onClick={(event) => runMenuActionOnClick(event, onDuplicateSelectedEntities)}
        >
          Duplicar
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item cad-editor-guide-context-menu-item--danger"
          data-entity-action="remove"
          onClick={(event) => runMenuActionOnClick(event, onRemoveSelectedEntities)}
        >
          Remover
        </button>
        <button
          type="button"
          className="cad-editor-guide-context-menu-item"
          data-entity-action="clear"
          onClick={(event) => runMenuActionOnClick(event, onClearSelectedEntities)}
        >
          Desmarcar
        </button>
      </div>
    ) : null}
    </>
  );
};

