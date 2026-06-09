const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('almakDesktop', {
  platform: process.platform,
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  installUpdate: () => ipcRenderer.send('install-update'),
});
