import type {
  DesktopFileSystemBridge,
  DesktopSavedFile,
  DesktopSelectedFile,
  SigeveDesktopBridge
} from '../renderer-bridge/contracts';

const path = require('node:path') as typeof import('node:path');
const fs = require('node:fs/promises') as typeof import('node:fs/promises');
const fsSync = require('node:fs') as typeof import('node:fs');
const electron = require('electron') as {
  app: ElectronAppLike;
  BrowserWindow: ElectronBrowserWindowConstructor;
  dialog: ElectronDialogLike;
  ipcMain: ElectronIpcMainLike;
  Menu: ElectronMenuLike;
};

const logElectronShell = (...messages: unknown[]) => {
  const serializedMessage = messages
    .map((message) => {
      if (typeof message === 'string') {
        return message;
      }

      try {
        return JSON.stringify(message);
      } catch {
        return String(message);
      }
    })
    .join(' ');

  console.log('[electron-shell]', ...messages);
  try {
    fsSync.appendFileSync(
      path.resolve(process.cwd(), 'electron-shell.runtime.log'),
      `[${new Date().toISOString()}] ${serializedMessage}\n`,
      'utf8'
    );
  } catch {
    // Mantem o bootstrap funcionando mesmo se o arquivo de log falhar.
  }
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

type OpenFileOptions = Parameters<DesktopFileSystemBridge['openFile']>[0];
type SaveFileOptions = Parameters<DesktopFileSystemBridge['saveFile']>[0];
type OpenFileResult = Awaited<ReturnType<DesktopFileSystemBridge['openFile']>>;
type SelectDirectoryResult = Awaited<ReturnType<DesktopFileSystemBridge['selectDirectory']>>;

interface ElectronBrowserWindowOptions {
  title: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  show?: boolean;
  autoHideMenuBar?: boolean;
  webPreferences: {
    preload: string;
    contextIsolation: boolean;
    nodeIntegration: boolean;
    sandbox: boolean;
  };
}

interface ElectronBrowserWindowLike {
  loadURL: (url: string) => Promise<void>;
  loadFile: (filePath: string) => Promise<void>;
  minimize: () => void;
  maximize: () => void;
  unmaximize: () => void;
  isMaximized: () => boolean;
  show?: () => void;
  focus?: () => void;
  setAlwaysOnTop?: (flag: boolean) => void;
  close: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  webContents: {
    reload: () => void;
    openDevTools?: (options?: { mode?: 'detach' | 'bottom' | 'right' | 'undocked' }) => void;
    on?: (event: string, listener: (...args: unknown[]) => void) => void;
  };
}

interface ElectronBrowserWindowConstructor {
  new (options: ElectronBrowserWindowOptions): ElectronBrowserWindowLike;
  getAllWindows?: () => ElectronBrowserWindowLike[];
  getFocusedWindow?: () => ElectronBrowserWindowLike | null;
}

interface ElectronAppLike {
  setAppUserModelId?: (appId: string) => void;
  isPackaged?: boolean;
  whenReady: () => Promise<void>;
  on: (event: 'window-all-closed' | 'activate', listener: () => void) => void;
  quit: () => void;
  getPath?: (name: 'documents') => string;
}

interface ElectronIpcMainLike {
  handle: (channel: string, listener: (_event: unknown, payload?: unknown) => unknown | Promise<unknown>) => void;
  removeHandler?: (channel: string) => void;
}

interface ElectronDialogFileFilter {
  name: string;
  extensions: string[];
}

interface ElectronDialogLike {
  showMessageBox?: (
    browserWindow: ElectronBrowserWindowLike | null,
    options: {
      type?: 'none' | 'info' | 'error' | 'question' | 'warning';
      title: string;
      message: string;
      detail?: string;
    }
  ) => Promise<unknown>;
  showOpenDialog: (
    browserWindow: ElectronBrowserWindowLike | null,
    options: {
      properties: Array<'openFile' | 'openDirectory'>;
      filters?: ElectronDialogFileFilter[];
      defaultPath?: string;
    }
  ) => Promise<{
    canceled: boolean;
    filePaths: string[];
  }>;
  showSaveDialog: (
    browserWindow: ElectronBrowserWindowLike | null,
    options: {
      title: string;
      defaultPath?: string;
      filters?: ElectronDialogFileFilter[];
    }
  ) => Promise<{
    canceled: boolean;
    filePath?: string;
  }>;
}

interface ElectronMenuLike {
  buildFromTemplate?: (template: Array<Record<string, unknown>>) => unknown;
  setApplicationMenu?: (menu: unknown) => void;
}

export interface ElectronShellWindowOptions {
  title: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  url: string;
}

export interface ElectronShellMainConfig {
  appId: string;
  preloadEntry: string;
  backendBaseUrl: string;
  mainWindow: ElectronShellWindowOptions;
}

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const normalizeFileFilters = (filters?: OpenFileOptions extends undefined ? never : NonNullable<OpenFileOptions>['filters']) => {
  if (!filters?.length) {
    return undefined;
  }

  return filters
    .filter((filter) => filter.name && Array.isArray(filter.extensions) && filter.extensions.length > 0)
    .map((filter) => ({
      name: filter.name,
      extensions: filter.extensions
    }));
};

const resolvePreloadEntry = (preloadEntry: string) => {
  if (path.isAbsolute(preloadEntry)) {
    return preloadEntry;
  }

  return path.resolve(__dirname, '..', preloadEntry.replace(/^\.\//, ''));
};

const resolvePackagedFrontendEntry = () => (
  path.resolve(__dirname, '../../../../dist/index.html')
);

const resolveFrontendEntry = () => {
  const explicitFrontendUrl = overridesSafeTrim(process.env.SIGEVE_FRONTEND_URL);
  if (explicitFrontendUrl) {
    return explicitFrontendUrl;
  }

  if (electron.app.isPackaged && fsSync.existsSync(resolvePackagedFrontendEntry())) {
    return resolvePackagedFrontendEntry();
  }

  return 'http://localhost:3004';
};

const overridesSafeTrim = (value?: string) => value?.trim();

const getDefaultSavePath = (suggestedName: string) => {
  const documentsPath = electron.app.getPath?.('documents');
  return documentsPath ? path.join(documentsPath, suggestedName) : suggestedName;
};

const getActiveWindow = (mainWindow: ElectronBrowserWindowLike | null) => (
  electron.BrowserWindow.getFocusedWindow?.() || mainWindow
);

const createApplicationMenu = (mainWindowRef: () => ElectronBrowserWindowLike | null) => {
  if (!electron.Menu.buildFromTemplate || !electron.Menu.setApplicationMenu) {
    return;
  }

  const menu = electron.Menu.buildFromTemplate([
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Atualizar',
          click: () => {
            mainWindowRef()?.webContents.reload();
          }
        }
      ]
    }
  ]);

  electron.Menu.setApplicationMenu(menu);
};

const registerIpcHandler = (
  channel: string,
  handler: (_event: unknown, payload?: unknown) => unknown | Promise<unknown>
) => {
  electron.ipcMain.removeHandler?.(channel);
  electron.ipcMain.handle(channel, handler);
};

const registerDesktopBridgeHandlers = (
  config: ElectronShellMainConfig,
  getMainWindow: () => ElectronBrowserWindowLike | null
) => {
  registerIpcHandler(IPC_CHANNELS.openFile, async (_event, payload) => {
    const options = (payload || {}) as OpenFileOptions;
    const result = await electron.dialog.showOpenDialog(getActiveWindow(getMainWindow()), {
      properties: ['openFile'],
      filters: normalizeFileFilters(options?.filters),
      defaultPath: options?.defaultPath?.trim() || undefined
    });

    if (result.canceled || !result.filePaths[0]) {
      return null satisfies OpenFileResult;
    }

    const selectedPath = result.filePaths[0];
    const fileBytes = await fs.readFile(selectedPath);
    return {
      path: selectedPath,
      name: path.basename(selectedPath),
      bytes: Array.from(fileBytes)
    } satisfies DesktopSelectedFile;
  });

  registerIpcHandler(IPC_CHANNELS.saveFile, async (_event, payload) => {
    const options = payload as SaveFileOptions;
    const suggestedName = options?.suggestedName?.trim() || 'arquivo.txt';
    const targetPath = options?.targetPath?.trim();
    const defaultDialogPath = options?.defaultPath?.trim();
    const fileContents = Array.isArray(options?.bytes)
      ? Buffer.from(options.bytes)
      : (options?.contents ?? '');

    if (targetPath) {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, fileContents);
      return {
        saved: true,
        path: targetPath
      } satisfies DesktopSavedFile;
    }

    const result = await electron.dialog.showSaveDialog(getActiveWindow(getMainWindow()), {
      title: 'Salvar arquivo',
      defaultPath: defaultDialogPath || getDefaultSavePath(suggestedName),
      filters: [{
        name: 'Todos os arquivos',
        extensions: ['*']
      }]
    });

    if (result.canceled || !result.filePath) {
      return {
        saved: false,
        path: ''
      } satisfies DesktopSavedFile;
    }

    await fs.mkdir(path.dirname(result.filePath), { recursive: true });
    await fs.writeFile(result.filePath, fileContents);
    return {
      saved: true,
      path: result.filePath
    } satisfies DesktopSavedFile;
  });

  registerIpcHandler(IPC_CHANNELS.selectDirectory, async () => {
    const result = await electron.dialog.showOpenDialog(getActiveWindow(getMainWindow()), {
      properties: ['openDirectory']
    });

    if (result.canceled || !result.filePaths[0]) {
      return null satisfies SelectDirectoryResult;
    }

    return result.filePaths[0];
  });

  registerIpcHandler(IPC_CHANNELS.windowMinimize, async () => {
    getActiveWindow(getMainWindow())?.minimize();
  });

  registerIpcHandler(IPC_CHANNELS.windowMaximize, async () => {
    const activeWindow = getActiveWindow(getMainWindow());
    if (!activeWindow) {
      return;
    }

    if (activeWindow.isMaximized()) {
      activeWindow.unmaximize();
      return;
    }

    activeWindow.maximize();
  });

  registerIpcHandler(IPC_CHANNELS.windowClose, async () => {
    getActiveWindow(getMainWindow())?.close();
  });

  registerIpcHandler(IPC_CHANNELS.menuRefresh, async () => {
    getActiveWindow(getMainWindow())?.webContents.reload();
  });

  registerIpcHandler(IPC_CHANNELS.backendGetBaseUrl, async () => {
    return config.backendBaseUrl;
  });
};

export const createElectronShellMainConfig = (
  overrides?: Partial<ElectronShellMainConfig>
): ElectronShellMainConfig => ({
  appId: overrides?.appId ?? 'br.com.sigeve.desktop',
  preloadEntry: overrides?.preloadEntry ?? './preload/index.js',
  backendBaseUrl: overrides?.backendBaseUrl ?? process.env.SIGEVE_BACKEND_BASE_URL ?? 'http://localhost:9010',
  mainWindow: {
    title: overrides?.mainWindow?.title ?? 'Sigeve Desktop',
    width: overrides?.mainWindow?.width ?? 1440,
    height: overrides?.mainWindow?.height ?? 900,
    minWidth: overrides?.mainWindow?.minWidth ?? 1200,
    minHeight: overrides?.mainWindow?.minHeight ?? 720,
    url: overrides?.mainWindow?.url ?? resolveFrontendEntry()
  }
});

export const bootstrapElectronShell = (config: ElectronShellMainConfig) => {
  let mainWindow: ElectronBrowserWindowLike | null = null;

  process.on('uncaughtException', (error) => {
    logElectronShell('uncaughtException', error instanceof Error ? error.stack || error.message : error);
  });

  process.on('unhandledRejection', (reason) => {
    logElectronShell('unhandledRejection', reason);
  });

  const createMainWindow = async () => {
    const resolvedPreload = resolvePreloadEntry(config.preloadEntry);
    logElectronShell('Criando janela principal...', {
      url: config.mainWindow.url,
      preload: resolvedPreload
    });

    mainWindow = new electron.BrowserWindow({
      title: config.mainWindow.title,
      width: config.mainWindow.width,
      height: config.mainWindow.height,
      minWidth: config.mainWindow.minWidth,
      minHeight: config.mainWindow.minHeight,
      show: true,
      autoHideMenuBar: false,
      webPreferences: {
        preload: resolvedPreload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    mainWindow.on('closed', () => {
      logElectronShell('Janela principal fechada.');
      mainWindow = null;
    });

    mainWindow.on('ready-to-show', () => {
      logElectronShell('Evento ready-to-show recebido.');
      mainWindow?.show?.();
      mainWindow?.focus?.();
      mainWindow?.setAlwaysOnTop?.(true);
      setTimeout(() => {
        mainWindow?.setAlwaysOnTop?.(false);
      }, 1500);
    });

    mainWindow.webContents.on?.('did-finish-load', () => {
      logElectronShell('did-finish-load disparado.');
      mainWindow?.show?.();
      mainWindow?.focus?.();
    });

    mainWindow.webContents.on?.('did-fail-load', (...args) => {
      logElectronShell('did-fail-load disparado.', args);
    });

    if (isHttpUrl(config.mainWindow.url)) {
      logElectronShell('Carregando URL remota...', config.mainWindow.url);
      await mainWindow.loadURL(config.mainWindow.url);
    } else {
      logElectronShell('Carregando arquivo local...', config.mainWindow.url);
      await mainWindow.loadFile(config.mainWindow.url);
    }

    if (process.env.SIGEVE_ELECTRON_DEBUG_TOOLS === '1') {
      mainWindow.webContents.openDevTools?.({ mode: 'detach' });
    }

    mainWindow.show?.();
    mainWindow.focus?.();
    logElectronShell('Janela principal carregada com sucesso.');
    return mainWindow;
  };

  logElectronShell('Bootstrap iniciado.', {
    appId: config.appId,
    backendBaseUrl: config.backendBaseUrl,
    frontendUrl: config.mainWindow.url
  });

  electron.app.setAppUserModelId?.(config.appId);
  registerDesktopBridgeHandlers(config, () => mainWindow);
  createApplicationMenu(() => mainWindow);

  const ready = electron.app.whenReady().then(async () => {
    logElectronShell('Electron app pronta.');
    if (process.env.SIGEVE_ELECTRON_BOOTSTRAP_DIALOG === '1' && electron.dialog.showMessageBox) {
      await electron.dialog.showMessageBox(null, {
        type: 'info',
        title: 'Sigeve Desktop',
        message: 'Bootstrap do Electron iniciado.',
        detail: `Frontend: ${config.mainWindow.url}\nBackend: ${config.backendBaseUrl}`
      });
    }
    await createMainWindow();

    electron.app.on('activate', () => {
      logElectronShell('Evento activate recebido.');
      const hasOpenWindow = (electron.BrowserWindow.getAllWindows?.() || []).length > 0;
      if (!hasOpenWindow) {
        logElectronShell('Nenhuma janela aberta. Recriando janela principal.');
        void createMainWindow();
      }
    });
  });

  electron.app.on('window-all-closed', () => {
    logElectronShell('Todas as janelas foram fechadas.');
    if (process.platform !== 'darwin') {
      logElectronShell('Encerrando aplicacao no Windows/Linux.');
      electron.app.quit();
    }
  });

  return {
    status: 'ready' as const,
    config,
    ready
  };
};

if (process.versions?.electron && (process as NodeJS.Process & { type?: string }).type !== 'renderer') {
  try {
    fsSync.writeFileSync(path.resolve(process.cwd(), 'electron-shell.runtime.log'), '', 'utf8');
  } catch {
    // Se nao conseguir limpar o arquivo, continua o bootstrap normalmente.
  }
  logElectronShell('Entrada principal detectada via require.main === module.');
  bootstrapElectronShell(createElectronShellMainConfig());
}
