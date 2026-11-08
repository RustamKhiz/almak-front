const { contextBridge, ipcRenderer } = require('electron');
const { version } = require('../package.json');

contextBridge.exposeInMainWorld('almakDesktop', {
  platform: process.platform,
  version,
  onSaveBeforeClose: (callback) => {
    const listener = (_event, id) => {
      let replied = false;
      const complete = (saved) => {
        if (replied) return;
        replied = true;
        ipcRenderer.send('saved-before-close', id, saved === true);
      };
      try {
        callback(complete);
      } catch {
        complete(false);
      }
    };
    ipcRenderer.on('save-before-close', listener);
    ipcRenderer.send('close-guard-ready');
    return () => ipcRenderer.removeListener('save-before-close', listener);
  },
  getUpdateState: () => ipcRenderer.invoke('get-update-state'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('update-state', listener);
    return () => ipcRenderer.removeListener('update-state', listener);
  },
  installUpdate: () => ipcRenderer.send('install-update'),
});
