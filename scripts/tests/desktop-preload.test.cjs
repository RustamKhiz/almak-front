const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { EventEmitter } = require('node:events');

test('close acknowledgement crosses the bridge as a boolean instead of a renderer Promise', () => {
  const ipc = new EventEmitter();
  const sent = [];
  ipc.send = (...args) => sent.push(args);
  let desktop;
  vm.runInNewContext(fs.readFileSync('electron/preload.cjs', 'utf8'), {
    process: { platform: 'win32' },
    require: (name) =>
      name === 'electron'
        ? {
            ipcRenderer: ipc,
            contextBridge: {
              exposeInMainWorld: (_name, api) => {
                desktop = api;
              },
            },
          }
        : { version: 'test' },
  });
  let complete;
  const stop = desktop.onSaveBeforeClose((reply) => {
    complete = reply;
    return {};
  });
  ipc.emit('save-before-close', {}, 'request-1');
  assert.deepEqual(sent, [['close-guard-ready']]);
  complete(true);
  complete(false);
  assert.deepEqual(sent[1], ['saved-before-close', 'request-1', true]);
  assert.equal(sent.length, 2);
  stop();
  assert.equal(ipc.listenerCount('save-before-close'), 0);
});
