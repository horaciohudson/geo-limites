export type CadMenuId = 'file' | 'edit' | 'view' | 'tools' | 'help' | 'config';

export interface CadMenuItem {
  id: CadMenuId;
  label: string;
}

export interface CadMenuAction {
  id: string;
  label: string;
  disabled?: boolean;
}

export type CadMenuActionsByMenu = Record<CadMenuId, CadMenuAction[]>;

export interface CadCommandItem {
  id: string;
  label: string;
  compact?: boolean;
}
