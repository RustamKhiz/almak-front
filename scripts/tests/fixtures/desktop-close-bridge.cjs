const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../../..');
const { protectWindowClose } = require(path.join(root, 'electron/window-close.cjs'));
const htmlPath = path.join(os.tmpdir(), `almak-close-bridge-${randomUUID()}.html`);
let finished = false;
let acknowledged = false;
let timer;

function finish(code, message) {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
  process.stdout.write(`${message}\n`);
  app.exit(code);
}

app
  .whenReady()
  .then(async () => {
    const zone = pathToFileURL(
      path.join(path.dirname(require.resolve('zone.js/package.json')), 'bundles/zone.umd.js'),
    ).href;
    fs.writeFileSync(
      htmlPath,
      `<script src="${zone}"></script><script>
    if (!window.Zone) throw new Error('Zone.js was not loaded');
    window.almakDesktop.onSaveBeforeClose(complete => {
      Promise.resolve(true).then(complete);
    });
  </script>`,
    );
    const window = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(root, 'electron/preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    protectWindowClose(window, ipcMain, () => finish(1, 'Close guard rejected the renderer acknowledgement'), 3000);
    ipcMain.on('saved-before-close', (_event, _id, value) => {
      acknowledged = value === true;
    });
    ipcMain.once('close-guard-ready', () => setTimeout(() => window.close(), 30));
    window.on('closed', () =>
      finish(
        acknowledged ? 0 : 1,
        acknowledged ? 'Electron + Zone.js: save acknowledged, window closed' : 'Window closed without acknowledgement',
      ),
    );
    timer = setTimeout(() => finish(1, 'Renderer close acknowledgement timed out'), 5000);
    await window.loadFile(htmlPath);
  })
  .catch((error) => finish(1, String(error)));
