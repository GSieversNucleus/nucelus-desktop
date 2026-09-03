/**
 * Exposes a small, explicit API to the Nucleus page (renderer/index.html) —
 * nothing else from Node or Electron is reachable from the page's own
 * JavaScript. This is what index.html's boot()/doPersist()/downloadBackup()
 * call instead of Claude's Artifact runtime.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nucleusDesktop', {
  loadState: () => ipcRenderer.invoke('nucleus:load-state'),
  saveState: (state) => ipcRenderer.invoke('nucleus:save-state', state),
  exportBackup: (state) => ipcRenderer.invoke('nucleus:export-backup', state),
  getDataDir: () => ipcRenderer.invoke('nucleus:data-dir')
});
