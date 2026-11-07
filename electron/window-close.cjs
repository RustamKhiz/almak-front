const { randomUUID } = require('node:crypto');

function protectWindowClose(window, ipc, showError, timeoutMs = 15000) {
  let ready = false;
  let allowed = false;
  let pending;
  const fromWindow = (event) => !window.isDestroyed() && event.sender === window.webContents;
  const fail = () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending = undefined;
    allowed = false;
    if (!window.isDestroyed()) showError();
  };
  const request = (action = () => window.close()) => {
    if (pending) return;
    if (!ready) {
      action();
      return;
    }
    const id = randomUUID();
    pending = { id, action, timer: setTimeout(fail, timeoutMs) };
    window.webContents.send('save-before-close', id);
  };
  const onReady = (event) => {
    if (fromWindow(event)) ready = true;
  };
  const onSaved = (event, id, saved) => {
    if (!fromWindow(event) || !pending || id !== pending.id) return;
    if (saved !== true) {
      fail();
      return;
    }
    const action = pending.action;
    clearTimeout(pending.timer);
    pending = undefined;
    allowed = true;
    action();
  };
  ipc.on('close-guard-ready', onReady);
  ipc.on('saved-before-close', onSaved);
  window.on('close', (event) => {
    if (!ready || allowed) return;
    event.preventDefault();
    request();
  });
  window.webContents.on('will-prevent-unload', () => {
    allowed = false;
    showError();
  });
  window.on('closed', () => {
    if (pending) clearTimeout(pending.timer);
    ipc.removeListener('close-guard-ready', onReady);
    ipc.removeListener('saved-before-close', onSaved);
  });
  return { request };
}

module.exports = { protectWindowClose };
