const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vpsConnector', {
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  getAvailableDrives: () => ipcRenderer.invoke('get-available-drives'),
  testConnection: (config) => ipcRenderer.invoke('test-connection', config),
  connect: (config) => ipcRenderer.invoke('connect', config),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  selectKeyFile: () => ipcRenderer.invoke('select-key-file'),
  installDependency: (which) => ipcRenderer.invoke('install-dependency', which),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openExplorer: (drive) => ipcRenderer.invoke('open-explorer', drive),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  onConnectionLost: (callback) => {
    ipcRenderer.on('connection-lost', (_event, reason) => callback(reason));
  },
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
});
