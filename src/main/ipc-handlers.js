const { ipcMain, dialog, shell } = require('electron');
const { execFile } = require('child_process');
const { checkDependencies } = require('./dependency-checker');
const { getAvailableDriveLetters } = require('./drive-utils');
const { testConnection } = require('./ssh-manager');
const sshfsManager = require('./sshfs-manager');
const fs = require('fs');
const path = require('path');

let cachedDeps = null;

function getConfigPath() {
  const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'vps-connector', 'config.json');
}

function registerIpcHandlers() {
  ipcMain.handle('check-dependencies', () => {
    cachedDeps = checkDependencies();
    return cachedDeps;
  });

  ipcMain.handle('get-available-drives', () => {
    return getAvailableDriveLetters();
  });

  ipcMain.handle('test-connection', async (_event, config) => {
    return testConnection(config);
  });

  ipcMain.handle('connect', async (_event, config) => {
    // Step 1: Test SSH connection
    await testConnection(config);

    // Step 2: Get sshfs binary path
    const deps = cachedDeps || checkDependencies();
    if (!deps.sshfsBinaryPath) {
      throw new Error('SSHFS-Win not found. Please install it first.');
    }

    // Step 3: Mount via sshfs
    await sshfsManager.mount(config, deps.sshfsBinaryPath);

    // Step 4: Update tray icon
    const { setTrayConnected } = require('./main');
    setTrayConnected(true, config.host);

    // Step 5: Save config (without password)
    saveConfig(config);

    return { success: true };
  });

  ipcMain.handle('disconnect', async () => {
    await sshfsManager.disconnect();
    const { setTrayConnected } = require('./main');
    setTrayConnected(false);
    return { success: true };
  });

  ipcMain.handle('get-status', () => {
    return { connected: sshfsManager.isConnected() };
  });

  ipcMain.handle('select-key-file', async () => {
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Select SSH Private Key',
      properties: ['openFile'],
      filters: [
        { name: 'Key Files', extensions: ['pem', 'ppk', 'key', 'pub'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('open-external', (_event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('open-explorer', (_event, driveLetter) => {
    shell.openPath(driveLetter + '\\');
  });

  ipcMain.handle('install-dependency', async (_event, which) => {
    const packages = {
      winfsp: 'WinFsp.WinFsp',
      sshfs: 'WinFsp.SSHFS-Win',
    };
    const packageId = packages[which];
    if (!packageId) {
      return { success: false, error: 'Unknown dependency', output: '' };
    }

    return new Promise((resolve) => {
      const args = ['install', packageId, '--accept-package-agreements', '--accept-source-agreements'];
      const proc = execFile('winget', args, { shell: true, timeout: 300000 }, (err, stdout, stderr) => {
        const output = (stdout || '') + (stderr || '');
        if (err) {
          // winget may return non-zero even on success (e.g., already installed)
          if (output.includes('Successfully installed') || output.includes('already installed') || output.includes('No available upgrade')) {
            resolve({ success: true, output });
          } else {
            resolve({ success: false, error: err.message, output });
          }
        } else {
          resolve({ success: true, output });
        }
      });
    });
  });

  ipcMain.handle('load-config', () => {
    try {
      const configPath = getConfigPath();
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch {
      // ignore
    }
    return null;
  });

}

function saveConfig(config) {
  try {
    const configPath = getConfigPath();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Never save password
    const toSave = {
      host: config.host,
      port: config.port,
      username: config.username,
      authMethod: config.authMethod,
      keyFilePath: config.keyFilePath || '',
      remotePath: config.remotePath,
      driveLetter: config.driveLetter,
    };
    fs.writeFileSync(configPath, JSON.stringify(toSave, null, 2));
  } catch {
    // Non-critical, ignore save errors
  }
}

module.exports = { registerIpcHandlers };
