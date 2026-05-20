const { app, BrowserWindow, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');

const isDev = !app.isPackaged;
const devServerUrl = process.env.ELECTRON_START_URL || 'http://localhost:4200';

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'Almak',
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.setMenuBarVisibility(false);

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank') {
      return { action: 'allow' };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    window.loadURL(devServerUrl);
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'almak', 'browser', 'index.html'));
  }

  return window;
}

function setupAutoUpdates() {
  if (isDev) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error('Failed to check for updates:', error);
  });
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
