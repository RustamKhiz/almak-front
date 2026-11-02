const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createUpdates } = require('../../electron/updates.cjs');

function setup(enabled = true) {
  const updater = new EventEmitter();
  let checks = 0;
  let installs = 0;
  updater.checkForUpdates = () => {
    checks++;
    return Promise.resolve();
  };
  updater.quitAndInstall = () => {
    installs++;
  };
  const events = [];
  const updates = createUpdates(updater, (state) => events.push(state), enabled);
  return { updater, updates, events, checks: () => checks, installs: () => installs };
}

test('manual checks reuse an in-progress check and allow another check when current', () => {
  const { updater, updates, checks } = setup();
  updates.check();
  assert.equal(updates.check().status, 'checking');
  assert.equal(checks(), 1);
  updater.emit('update-not-available');
  assert.equal(updates.getState().status, 'current');
  updates.check();
  assert.equal(checks(), 2);
});

test('download progress and ready state are retained for a renderer that subscribes later', () => {
  const { updater, updates, events, checks, installs } = setup();
  updates.install();
  assert.equal(installs(), 0);
  updates.check();
  updater.emit('update-available');
  updater.emit('download-progress', { percent: 45.8 });
  assert.equal(updates.getState().percent, 46);
  updates.check();
  assert.equal(checks(), 1);
  updater.emit('update-downloaded');
  assert.equal(updates.getState().status, 'ready');
  assert.equal(updates.check().status, 'ready');
  updates.install();
  assert.equal(installs(), 1);
  assert.ok(events.every((state, index) => !index || state.revision > events[index - 1].revision));
});

test('a failed check can be retried, including rejected and synchronously thrown checks', async () => {
  const { updater, updates } = setup();
  updater.checkForUpdates = () => Promise.reject(new Error('offline'));
  updates.check();
  await new Promise(setImmediate);
  assert.equal(updates.getState().status, 'error');
  updater.checkForUpdates = () => {
    throw new Error('offline');
  };
  assert.equal(updates.check().status, 'error');
  updater.checkForUpdates = () => Promise.resolve();
  updates.check();
  updater.emit('update-not-available');
  assert.equal(updates.getState().status, 'current');
});

test('download errors enable retry without discarding a completed download', () => {
  const { updater, updates } = setup();
  updates.check();
  updater.emit('update-available');
  updater.emit('error', new Error('offline'));
  assert.equal(updates.getState().status, 'error');
  updates.check();
  updater.emit('update-downloaded');
  updater.emit('error', new Error('unrelated'));
  assert.equal(updates.getState().status, 'ready');
});

test('development builds never contact the updater or install an update', () => {
  const { updates, checks, installs } = setup(false);
  assert.equal(updates.check().status, 'unsupported');
  updates.install();
  assert.equal(checks(), 0);
  assert.equal(installs(), 0);
});
