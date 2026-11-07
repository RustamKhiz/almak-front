const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { protectWindowClose } = require('../../electron/window-close.cjs');

function setup(timeout = 15000) {
  const window = new EventEmitter();
  const ipc = new EventEmitter();
  window.webContents = new EventEmitter();
  const requests = [];
  let closed = 0,
    errors = 0;
  window.isDestroyed = () => false;
  window.webContents.send = (channel, id) => requests.push({ channel, id });
  window.close = () => {
    let prevented = false;
    window.emit('close', {
      preventDefault: () => {
        prevented = true;
      },
    });
    if (!prevented) closed++;
  };
  const guard = protectWindowClose(window, ipc, () => errors++, timeout);
  const event = { sender: window.webContents };
  ipc.emit('close-guard-ready', event);
  return { window, ipc, event, guard, requests, closed: () => closed, errors: () => errors };
}

test('closing waits for server acknowledgement and rejects foreign or stale replies', () => {
  const s = setup();
  s.window.close();
  s.window.close();
  assert.equal(s.closed(), 0);
  assert.equal(s.requests.length, 1);
  const id = s.requests[0].id;
  s.ipc.emit('saved-before-close', { sender: {} }, id, true);
  s.ipc.emit('saved-before-close', s.event, 'old-request', true);
  assert.equal(s.closed(), 0);
  s.ipc.emit('saved-before-close', s.event, id, true);
  assert.equal(s.closed(), 1);
  s.window.emit('closed');
  assert.equal(s.ipc.listenerCount('saved-before-close'), 0);
});

test('a save failure keeps the window open and a later close retries saving', () => {
  const s = setup();
  s.window.close();
  s.ipc.emit('saved-before-close', s.event, s.requests[0].id, false);
  assert.equal(s.errors(), 1);
  assert.equal(s.closed(), 0);
  s.window.close();
  s.ipc.emit('saved-before-close', s.event, s.requests[1].id, true);
  assert.equal(s.closed(), 1);
});

test('unresponsive saving keeps the app open and ignores a late confirmation', async () => {
  const s = setup(5);
  s.window.close();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(s.errors(), 1);
  s.ipc.emit('saved-before-close', s.event, s.requests[0].id, true);
  assert.equal(s.closed(), 0);
  s.window.emit('closed');
});

test('installing an update also waits for saving', () => {
  const s = setup();
  let installed = false;
  s.guard.request(() => {
    installed = true;
  });
  assert.equal(installed, false);
  s.ipc.emit('saved-before-close', s.event, s.requests[0].id, true);
  assert.equal(installed, true);
});
