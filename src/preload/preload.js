const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Direct filesystem checks — no IPC needed
function checkDepsLocal() {
  const winfspInstalled = fs.existsSync('C:\\Program Files (x86)\\WinFsp') || fs.existsSync('C:\\Program Files\\WinFsp');

  let sshfsBinaryPath = null;
  const sshfsPaths = [
    'C:\\Program Files\\SSHFS-Win\\bin\\sshfs.exe',
    'C:\\Program Files (x86)\\SSHFS-Win\\bin\\sshfs.exe',
    'C:\\Program Files\\SSHFS-Win\\bin\\sshfs-win.exe',
    'C:\\Program Files (x86)\\SSHFS-Win\\bin\\sshfs-win.exe',
  ];
  for (const p of sshfsPaths) {
    if (fs.existsSync(p)) { sshfsBinaryPath = p; break; }
  }

  return { winfspInstalled, sshfsInstalled: sshfsBinaryPath !== null, sshfsBinaryPath };
}

function getAvailableDrivesLocal() {
  const used = new Set();
  for (let code = 65; code <= 90; code++) {
    const letter = String.fromCharCode(code);
    try { if (fs.existsSync(letter + ':\\')) used.add(letter); } catch {}
  }
  const skip = new Set(['A', 'B', 'C']);
  const available = [];
  for (let code = 90; code >= 68; code--) {
    const letter = String.fromCharCode(code);
    if (!used.has(letter) && !skip.has(letter)) available.push(letter + ':');
  }
  const vIndex = available.indexOf('V:');
  if (vIndex > 0) { available.splice(vIndex, 1); available.unshift('V:'); }
  return available;
}

function loadConfigLocal() {
  try {
    const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
    const configPath = path.join(appData, 'vps-connector', 'config.json');
    if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {}
  return null;
}

function clearConfigLocal() {
  try {
    const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
    const configPath = path.join(appData, 'vps-connector', 'config.json');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    return true;
  } catch {}
  return false;
}

contextBridge.exposeInMainWorld('vpsConnector', {
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
