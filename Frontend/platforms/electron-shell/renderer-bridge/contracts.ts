export interface DesktopSelectedFile {
  path: string;
  name: string;
  bytes: number[];
}

export interface DesktopSavedFile {
  path: string;
  saved: boolean;
}

export interface DesktopFileSystemBridge {
  openFile(options?: {
    filters?: Array<{ name: string; extensions: string[] }>;
    defaultPath?: string;
  }): Promise<DesktopSelectedFile | null>;
  saveFile(options: {
    suggestedName: string;
    contents?: string;
    bytes?: number[];
    targetPath?: string;
    defaultPath?: string;
  }): Promise<DesktopSavedFile>;
  selectDirectory(): Promise<string | null>;
}

export interface DesktopWindowBridge {
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
}

export interface DesktopMenuBridge {
  refresh(): Promise<void>;
}

export interface DesktopBackendBridge {
  getBaseUrl(): Promise<string>;
}

export interface SigeveDesktopBridge {
  fileSystem: DesktopFileSystemBridge;
  window: DesktopWindowBridge;
  menu: DesktopMenuBridge;
  backend: DesktopBackendBridge;
}
