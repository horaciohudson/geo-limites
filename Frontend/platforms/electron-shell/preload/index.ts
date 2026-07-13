import type { SigeveDesktopBridge } from '../renderer-bridge/contracts';

const electron = require('electron') as {
  contextBridge?: {
    exposeInMainWorld: (key: string, api: unknown) => void;
  };
  ipcRenderer: {
    invoke: (channel: string, payload?: unknown) => Promise<unknown>;
  };
};

const IPC_CHANNELS = {
  openFile: 'sigeve:file-system:open-file',
  saveFile: 'sigeve:file-system:save-file',
  selectDirectory: 'sigeve:file-system:select-directory',
  windowMinimize: 'sigeve:window:minimize',
  windowMaximize: 'sigeve:window:maximize',
  windowClose: 'sigeve:window:close',
  menuRefresh: 'sigeve:menu:refresh',
  backendGetBaseUrl: 'sigeve:backend:get-base-url'
} as const;

declare global {
  interface Window {
    sigeveDesktop?: SigeveDesktopBridge;
  }
}

export const createPreloadBridge = (): SigeveDesktopBridge => {
  return {
    fileSystem: {
      openFile: (options) => electron.ipcRenderer.invoke(IPC_CHANNELS.openFile, options) as ReturnType<SigeveDesktopBridge['fileSystem']['openFile']>,
      saveFile: (options) => electron.ipcRenderer.invoke(IPC_CHANNELS.saveFile, options) as ReturnType<SigeveDesktopBridge['fileSystem']['saveFile']>,
      selectDirectory: () => (
        electron.ipcRenderer.invoke(IPC_CHANNELS.selectDirectory) as ReturnType<SigeveDesktopBridge['fileSystem']['selectDirectory']>
      )
    },
    window: {
      minimize: () => electron.ipcRenderer.invoke(IPC_CHANNELS.windowMinimize) as ReturnType<SigeveDesktopBridge['window']['minimize']>,
      maximize: () => electron.ipcRenderer.invoke(IPC_CHANNELS.windowMaximize) as ReturnType<SigeveDesktopBridge['window']['maximize']>,
      close: () => electron.ipcRenderer.invoke(IPC_CHANNELS.windowClose) as ReturnType<SigeveDesktopBridge['window']['close']>
    },
    menu: {
      refresh: () => electron.ipcRenderer.invoke(IPC_CHANNELS.menuRefresh) as ReturnType<SigeveDesktopBridge['menu']['refresh']>
    },
    backend: {
      getBaseUrl: () => (
        electron.ipcRenderer.invoke(IPC_CHANNELS.backendGetBaseUrl) as ReturnType<SigeveDesktopBridge['backend']['getBaseUrl']>
      )
    }
  };
};

const bridge = createPreloadBridge();

if (electron.contextBridge?.exposeInMainWorld) {
  electron.contextBridge.exposeInMainWorld('sigeveDesktop', bridge);
} else {
  (globalThis as typeof globalThis & { sigeveDesktop?: SigeveDesktopBridge }).sigeveDesktop = bridge;
}

export {};
