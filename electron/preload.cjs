const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('almakDesktop', {
  platform: process.platform,
});
