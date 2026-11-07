const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const { createUpdates } = require('./updates.cjs');
const { protectWindowClose } = require('./window-close.cjs');

const isDev = !app.isPackaged;
const devServerUrl = process.env.ELECTRON_START_URL || 'http://localhost:4200';
let mainWindow;
let closeGuard;

function createWindow() {
  mainWindow = new BrowserWindow({
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

  mainWindow.setMenuBarVisibility(false);
  const window = mainWindow;
  closeGuard = protectWindowClose(window, ipcMain, () => {
    void dialog.showMessageBox(window, {
      type: 'warning',
      title: 'Изменения не сохранены',
      message: 'Приложение осталось открытым, чтобы сохранить ваши изменения.',
      detail: 'Проверьте соединение и предупреждения в черновиках. После сохранения закройте приложение ещё раз.',
      buttons: ['Вернуться'],
    });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank') {
      return { action: 'allow' };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'almak', 'browser', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
    closeGuard = undefined;
  });

  return mainWindow;
}

function setupAutoUpdates() {
  const updates = createUpdates(
    autoUpdater,
    (state) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-state', state);
    },
    !isDev,
  );
  const fromMainWindow = (event) => mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents;
  ipcMain.handle('get-update-state', (event) => (fromMainWindow(event) ? updates.getState() : null));
  ipcMain.handle('check-for-updates', (event) => (fromMainWindow(event) ? updates.check() : null));
  ipcMain.on('install-update', (event) => {
    if (fromMainWindow(event) && updates.getState().status === 'ready') closeGuard.request(() => updates.install());
  });
  updates.check();
}

app.whenReady().then(() => {
  setupAutoUpdates();
  createWindow();

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
