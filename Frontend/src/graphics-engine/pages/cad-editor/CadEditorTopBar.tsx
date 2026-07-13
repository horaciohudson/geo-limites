import type React from 'react';
import { CAD_ICON_PATHS, CadIcon } from '@/graphics-engine/pages/cad-editor/cadEditorIcons';
import {
  type CadMenuActionsByMenu,
  type CadCommandItem,
  type CadMenuId,
  type CadMenuItem
} from '@/graphics-engine/pages/cad-editor/cadEditorMenuConfig';

interface CadEditorTopBarProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  menuBarRef: React.RefObject<HTMLDivElement>;
  menuOpenId: CadMenuId | null;
  menuItems: ReadonlyArray<CadMenuItem>;
  commandItems: ReadonlyArray<CadCommandItem>;
  menuActionsByMenu: CadMenuActionsByMenu;
  activeZoomPresetId: string | null;
  backButtonLabel: string;
  documentLabel: string;
  editorCommandValue: string;
  onFileInputChange: React.ChangeEventHandler<HTMLInputElement>;
  onMenuOpenChange: React.Dispatch<React.SetStateAction<CadMenuId | null>>;
  onMenuAction: (actionId: string) => void;
  onCommandBarAction: (actionId: string) => void;
  isCommandBarActionDisabled: (actionId: string) => boolean;
  onNavigateBack: () => void;
}

export const CadEditorTopBar: React.FC<CadEditorTopBarProps> = ({
  fileInputRef,
  menuBarRef,
  menuOpenId,
  menuItems,
  commandItems,
  menuActionsByMenu,
  activeZoomPresetId,
  backButtonLabel,
  documentLabel,
  editorCommandValue,
  onFileInputChange,
  onMenuOpenChange,
  onMenuAction,
  onCommandBarAction,
  isCommandBarActionDisabled,
  onNavigateBack
}) => (
  <>
    <div className="cad-editor-menubar" ref={menuBarRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".dxf"
        className="cad-editor-hidden-input"
        onChange={onFileInputChange}
      />
      {menuItems.map((item) => (
        <div key={item.id} className="cad-editor-menuitem-wrapper">
          <button
            type="button"
            className={`cad-editor-menuitem ${menuOpenId === item.id ? 'is-open' : ''}`}
            onClick={() => onMenuOpenChange((current) => (current === item.id ? null : item.id))}
          >
            {item.label}
          </button>
          {menuOpenId === item.id && (
            <div className="cad-editor-menu-dropdown">
              {menuActionsByMenu[item.id].map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="cad-editor-menu-dropdown-item"
                  onClick={() => onMenuAction(action.id)}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>

    <div className="cad-editor-commandbar">
      <div className="cad-editor-commandbar-group">
        {commandItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`cad-editor-command-button ${item.compact ? 'cad-editor-command-button--compact' : ''}${activeZoomPresetId === item.id ? ' is-active' : ''}`}
            onClick={() => onCommandBarAction(item.id)}
            disabled={isCommandBarActionDisabled(item.id)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className="cad-editor-command-button cad-editor-command-button--icon">
          <CadIcon path={CAD_ICON_PATHS.pencil} className="cad-editor-command-icon" />
        </button>
        <button type="button" className="cad-editor-command-button cad-editor-command-button--icon">
          <CadIcon path={CAD_ICON_PATHS.eye} className="cad-editor-command-icon" />
        </button>
      </div>

      <div className="cad-editor-commandbar-group cad-editor-commandbar-group--context">
        <button type="button" className="cad-editor-primary-button" onClick={onNavigateBack}>
          {backButtonLabel}
        </button>
        <span className="cad-editor-command-label">{documentLabel}</span>
        <strong className="cad-editor-command-value">{editorCommandValue}</strong>
      </div>
    </div>
  </>
);

