import type { SigeveDesktopBridge } from '../../platforms/electron-shell/renderer-bridge/contracts';
import { createUnavailableDesktopBridge } from '../../platforms/electron-shell/renderer-bridge';

declare global {
  interface Window {
    sigeveDesktop?: SigeveDesktopBridge;
  }
}

let cachedDesktopBridge: SigeveDesktopBridge | null = null;

export const hasDesktopBridge = () => {
  return typeof window !== 'undefined' && !!window.sigeveDesktop;
};

export const getDesktopBridge = (): SigeveDesktopBridge => {
  if (cachedDesktopBridge) {
    return cachedDesktopBridge;
  }

  if (hasDesktopBridge()) {
    cachedDesktopBridge = window.sigeveDesktop as SigeveDesktopBridge;
    return cachedDesktopBridge;
  }

  cachedDesktopBridge = createUnavailableDesktopBridge();
  return cachedDesktopBridge;
};

export const desktopApi = {
  hasBridge: hasDesktopBridge,
  getBridge: getDesktopBridge,
  openFile: (options?: Parameters<SigeveDesktopBridge['fileSystem']['openFile']>[0]) => (
    getDesktopBridge().fileSystem.openFile(options)
  ),
  saveFile: (options: Parameters<SigeveDesktopBridge['fileSystem']['saveFile']>[0]) => (
    getDesktopBridge().fileSystem.saveFile(options)
  ),
  selectDirectory: () => getDesktopBridge().fileSystem.selectDirectory(),
  getBackendBaseUrl: () => getDesktopBridge().backend.getBaseUrl()
};
