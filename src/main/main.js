const { app, BrowserWindow, Notification, ipcMain } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc-handlers');
const trayManager = require('./tray-manager');
const sshfsManager = require('./sshfs-manager');

let mainWindow = null;
let isQuitting = false;
let trayNotificationShown = false;

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 660,
    resizable: false,
    frame: false,
    backgroundColor: '#070810',
    icon: path.join(__dirname, '../../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Close to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      if (!trayNotificationShown && Notification.isSupported()) {
        new Notification({
          title: 'VPS Connector',
          body: 'App is still running in the system tray. Right-click the tray icon for options.',
        }).show();
        trayNotificationShown = true;
      }
    }
  });
}

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

async function handleDisconnect() {
  await sshfsManager.disconnect();
  trayManager.setConnected(false);
  if (mainWindow) {
    mainWindow.webContents.send('connection-lost', 'Disconnected from tray');
  }
}

async function handleQuit() {
  if (sshfsManager.isConnected()) {
    await sshfsManager.disconnect();
  }
  isQuitting = true;
  app.quit();
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  // Window control IPC handlers
  ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  // Create system tray
  trayManager.createTray();
  trayManager.setHandlers({
    showWindow,
    disconnect: handleDisconnect,
    quit: handleQuit,
  });

  // Handle unexpected connection loss
  sshfsManager.setConnectionLostHandler((reason) => {
    trayManager.setConnected(false);
    if (mainWindow) {
      mainWindow.webContents.send('connection-lost', reason);
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Don't quit — tray keeps app alive
});

module.exports = { getMainWindow: () => mainWindow, setTrayConnected: (connected, host) => trayManager.setConnected(connected, host) };
