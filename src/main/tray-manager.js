const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;
let isConnected = false;
let onShowWindow = null;
let onDisconnect = null;
let onQuit = null;

function getTrayIcon() {
  const iconPath = path.join(__dirname, '../../assets/icon.ico');
  return nativeImage.createFromPath(iconPath);
}

function createTray() {
  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('VPS Mount - Disconnected');
  updateContextMenu();

  tray.on('double-click', () => {
    if (onShowWindow) onShowWindow();
  });

  return tray;
}

function updateContextMenu() {
  const menuItems = [
    {
      label: 'Show Window',
      click: () => { if (onShowWindow) onShowWindow(); },
    },
  ];

  if (isConnected) {
    menuItems.push({
      label: 'Disconnect',
      click: () => { if (onDisconnect) onDisconnect(); },
    });
  }

  menuItems.push(
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { if (onQuit) onQuit(); },
    }
  );

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

function setConnected(connected, host) {
  isConnected = connected;
  if (tray) {
    tray.setToolTip(connected ? `VPS Mount - Connected to ${host}` : 'VPS Mount - Disconnected');
    updateContextMenu();
  }
}

function setHandlers({ showWindow, disconnect, quit }) {
  onShowWindow = showWindow;
  onDisconnect = disconnect;
  onQuit = quit;
}

function destroy() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, setConnected, setHandlers, destroy };
