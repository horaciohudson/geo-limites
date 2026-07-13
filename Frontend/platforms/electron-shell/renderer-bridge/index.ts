import type { SigeveDesktopBridge } from './contracts';

const createUnavailableMethod = <TArgs extends unknown[], TResult>(name: string) => {
  return async (..._args: TArgs): Promise<TResult> => {
    throw new Error(`Desktop bridge indisponivel: ${name}.`);
  };
};

export const createUnavailableDesktopBridge = (): SigeveDesktopBridge => ({
  fileSystem: {
    openFile: createUnavailableMethod('fileSystem.openFile'),
    saveFile: createUnavailableMethod('fileSystem.saveFile'),
    selectDirectory: createUnavailableMethod('fileSystem.selectDirectory')
  },
  window: {
    minimize: createUnavailableMethod('window.minimize'),
    maximize: createUnavailableMethod('window.maximize'),
    close: createUnavailableMethod('window.close')
  },
  menu: {
    refresh: createUnavailableMethod('menu.refresh')
  },
  backend: {
    getBaseUrl: createUnavailableMethod('backend.getBaseUrl')
  }
});

export type { SigeveDesktopBridge } from './contracts';
