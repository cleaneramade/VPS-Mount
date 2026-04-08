const { contextBridge, ipcRenderer, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { WINFSP_PATHS, SSHFS_PATHS } = require('../main/dependency-checker');
const { getAvailableDriveLetters } = require('../main/drive-utils');

// Direct filesystem checks — no IPC needed
function checkDepsLocal() {
  const winfspInstalled = WINFSP_PATHS.some(p => fs.existsSync(p));

  let sshfsBinaryPath = null;
  for (const p of SSHFS_PATHS) {
    if (fs.existsSync(p)) { sshfsBinaryPath = p; break; }
  }

  return { winfspInstalled, sshfsInstalled: sshfsBinaryPath !== null, sshfsBinaryPath };
}

function getAvailableDrivesLocal() {
  return getAvailableDriveLetters();
}

function loadConfigLocal() {
  try {
    const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
    const configPath = path.join(appData, 'vps-mount', 'config.json');
    if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {}
  return null;
}

function clearConfigLocal() {
  try {
    const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
    const configPath = path.join(appData, 'vps-mount', 'config.json');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    return true;
  } catch {}
  return false;
}

contextBridge.exposeInMainWorld('vpsConnector', {
  // App info
  appVersion: app.getVersion,

  // Local sync checks — instant, no IPC
  checkDepsLocal: () => checkDepsLocal(),
  getAvailableDrivesLocal: () => getAvailableDrivesLocal(),
  loadConfigLocal: () => loadConfigLocal(),
  clearConfigLocal: () => clearConfigLocal(),

  // IPC for actions that need main process
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  connect: (config) => ipcRenderer.invoke('connect', config),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  installDependency: (which) => ipcRenderer.invoke('install-dependency', which),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  selectKeyFile: () => ipcRenderer.invoke('select-key-file'),
  openExplorer: (drive) => ipcRenderer.invoke('open-explorer', drive),
  onConnectionLost: (callback) => {
    ipcRenderer.on('connection-lost', (_event, reason) => callback(reason));
  },

  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowClose: () => ipcRenderer.send('window-close'),
});
