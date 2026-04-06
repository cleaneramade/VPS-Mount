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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 660,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    backgroundColor: '#070810',
    icon: path.join(__dirname, '../../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // This app uses a fixed-size custom window and should never maximize/fullscreen.
  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.unmaximize();
    }
  });

  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(false);
    }
  });

  // Close to tray only when connected to a VPS, otherwise quit
  mainWindow.on('close', (event) => {
    if (!isQuitting && sshfsManager.isConnected()) {
      event.preventDefault();
      mainWindow.hide();

      if (!trayNotificationShown && Notification.isSupported()) {
        new Notification({
          title: 'VPS Connector',
          body: 'VPS is still connected. App is running in the system tray.',
        }).show();
        trayNotificationShown = true;
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
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
  if (!sshfsManager.isConnected()) {
    app.quit();
  }
});

module.exports = { getMainWindow: () => mainWindow, setTrayConnected: (connected, host) => trayManager.setConnected(connected, host) };
