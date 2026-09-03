/**
 * Nucleus — desktop build (Electron main process).
 *
 * This app is deliberately simple: one window, one local JSON data file,
 * automatic rolling backups. No server, no login, no network dependency for
 * saving — everything Greg types into Nucleus is written straight to a file
 * on this computer, under his own Windows user profile
 * (%APPDATA%\Nucleus\nucleus-data.json), which Windows already backs up as
 * part of the user profile like any other app's data.
 *
 * Saves are atomic (write to a temp file, then rename over the real one) so
 * a crash or power loss mid-save can never leave a half-written, corrupted
 * data file. Every successful save also drops a timestamped snapshot into a
 * backups/ folder and prunes anything past the most recent 30 — the same
 * safety net already used in Nucleus's Microsoft Teams build.
 */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_DIR = app.getPath('userData');
const STATE_PATH = path.join(DATA_DIR, 'nucleus-data.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 30;

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

function loadStateSync() {
  ensureDirs();
  if (!fs.existsSync(STATE_PATH)) return null;
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    // A corrupt or unreadable data file should never silently reset someone's
    // job data to empty. Set it aside (never delete it) and start empty —
    // Greg (or anyone helping him) can inspect nucleus-data.json.corrupt-<ts>
    // afterward; the automatic backups/ folder is also there as a fallback.
    console.error('Nucleus: failed to read data file, setting it aside:', e);
    try {
      fs.copyFileSync(STATE_PATH, STATE_PATH + '.corrupt-' + Date.now());
    } catch (e2) { /* best effort */ }
    return null;
  }
}

function pruneBackups() {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('nucleus-') && f.endsWith('.json'))
      .map(f => ({ f, t: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    files.slice(MAX_BACKUPS).forEach(x => {
      try { fs.unlinkSync(path.join(BACKUPS_DIR, x.f)); } catch (e) { /* best effort */ }
    });
  } catch (e) { /* best effort — never let backup housekeeping break a save */ }
}

function saveStateSync(state) {
  ensureDirs();
  const json = JSON.stringify(state);
  const tmpPath = STATE_PATH + '.tmp';
  fs.writeFileSync(tmpPath, json, 'utf8');
  fs.renameSync(tmpPath, STATE_PATH); // atomic on the same filesystem

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    fs.writeFileSync(path.join(BACKUPS_DIR, `nucleus-${stamp}.json`), json, 'utf8');
    pruneBackups();
  } catch (e) {
    // A failed backup snapshot must never fail the actual save above.
    console.error('Nucleus: backup snapshot failed (main save still succeeded):', e);
  }
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Links Nucleus opens with target="_blank" (attached documents, etc.) should
  // open in the person's normal web browser, not spawn a bare Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

ipcMain.handle('nucleus:load-state', () => loadStateSync());

ipcMain.handle('nucleus:save-state', (event, state) => {
  saveStateSync(state);
  return true;
});

ipcMain.handle('nucleus:export-backup', async (event, state) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Nucleus backup',
    defaultPath: `nucleus-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
  return { canceled: false, filePath };
});

ipcMain.handle('nucleus:data-dir', () => DATA_DIR);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
