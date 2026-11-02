function createUpdates(updater, publish, enabled) {
  let state = { status: enabled ? 'idle' : 'unsupported', revision: 0 };
  const set = (status, percent) => {
    state = { status, revision: state.revision + 1, ...(percent === undefined ? {} : { percent }) };
    publish(state);
  };
  if (enabled) {
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.on('checking-for-update', () => set('checking'));
    updater.on('update-available', () => set('downloading', 0));
    updater.on('download-progress', (progress) => {
      const percent = Number.isFinite(progress.percent) ? Math.round(Math.min(100, Math.max(0, progress.percent))) : 0;
      set('downloading', percent);
    });
    updater.on('update-not-available', () => set('current'));
    updater.on('update-downloaded', () => set('ready'));
    updater.on('error', () => {
      if (state.status !== 'ready') set('error');
    });
  }
  return {
    getState: () => state,
    check: () => {
      if (!enabled || ['checking', 'downloading', 'ready'].includes(state.status)) return state;
      set('checking');
      try {
        Promise.resolve(updater.checkForUpdates()).catch(() => {
          if (state.status !== 'ready') set('error');
        });
      } catch {
        set('error');
      }
      return state;
    },
    install: () => {
      if (state.status === 'ready') updater.quitAndInstall(false, true);
    },
  };
}

module.exports = { createUpdates };
