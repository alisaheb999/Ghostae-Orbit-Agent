const { contextBridge, ipcRenderer } = require('electron');

const ghostaeDesktopApi = {
  getHardwareId: () => ipcRenderer.invoke('get-hardware-id'),
  checkAdobeRunning: () => ipcRenderer.invoke('check-adobe-running'),
  saveHubSession: (sessionData) => ipcRenderer.invoke('save-hub-session', sessionData),
  clearHubSession: () => ipcRenderer.invoke('clear-hub-session'),
  getHubSession: () => ipcRenderer.invoke('get-hub-session'),
  installCEPExtension: (params) => ipcRenderer.invoke('install-cep-extension', params),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  scanInstalledCEPExtensions: () => ipcRenderer.invoke('scan-installed-cep-extensions'),
  uninstallCEPExtension: (folderName) => ipcRenderer.invoke('uninstall-cep-extension', folderName),
  openExtensionFolder: (targetPath) => ipcRenderer.invoke('open-extension-folder', targetPath),
  isDesktop: true
};

try {
  contextBridge.exposeInMainWorld('ghostaeDesktop', ghostaeDesktopApi);
} catch (e) {
  if (typeof window !== 'undefined') {
    window.ghostaeDesktop = ghostaeDesktopApi;
  }
}
