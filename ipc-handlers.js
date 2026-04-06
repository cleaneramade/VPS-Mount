const { ipcMain, dialog, shell } = require('electron');
const { exec } = require('child_process');
const { checkDependencies } = require('./dependency-checker');
const { getAvailableDriveLetters } = require('./drive-utils');
const { testConnection } = require('./ssh-manager');
const sshfsManager = require('./sshfs-manager');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Full path to powershell.exe — don't rely on PATH in GUI apps
const POWERSHELL_EXE = path.join(
  process.env.SystemRoot || 'C:\\Windows',
  'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'
);

// File-based logging (console.log doesn't work in Windows GUI apps)
const DEBUG_LOG = path.join(process.env.TEMP || os.tmpdir(), 'vps-install-debug.log');
function debugLog(msg) {
  try {
    fs.appendFileSync(DEBUG_LOG, new Date().toISOString() + ' ' + msg + '\r\n');
  } catch {}
}

// Confirm module loaded
debugLog('ipc-handlers.js MODULE LOADED');

let cachedDeps = null;

function refreshDependencyCache() {
  cachedDeps = checkDependencies();
  return cachedDeps;
}

function getConfigPath() {
  const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'vps-connector', 'config.json');
}

function registerIpcHandlers() {
  debugLog('registerIpcHandlers() CALLED');
  ipcMain.handle('check-dependencies', () => {
    return new Promise((resolve) => {
      setImmediate(() => {
        resolve(refreshDependencyCache());
      });
    });
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
    const deps = cachedDeps || refreshDependencyCache();
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
      sshfs: 'SSHFS-Win.SSHFS-Win',
    };
    const packageId = packages[which];
    if (!packageId) {
      return { success: false, error: 'Unknown dependency' };
    }

    debugLog('Starting install for ' + which + ' (' + packageId + ')');

    const timestamp = Date.now();
    const installScript = path.join(os.tmpdir(), 'vps-install-' + timestamp + '.ps1');
    const wrapperScript = path.join(os.tmpdir(), 'vps-wrapper-' + timestamp + '.ps1');

    // Install script — runs inside the elevated PowerShell
    const installContent = [
      '# Reconstruct PATH so winget app alias is available in elevated context',
      '$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")',
      '$userPath = [Environment]::GetEnvironmentVariable("Path", "User")',
      '$localApps = [System.IO.Path]::Combine($env:LOCALAPPDATA, "Microsoft", "WindowsApps")',
      '$env:Path = "$localApps;$machinePath;$userPath"',
      '',
      '$wg = Get-Command winget -ErrorAction SilentlyContinue',
      'if (-not $wg) { Write-Output "WINGET_NOT_FOUND"; exit 1 }',
      '',
      'winget install ' + packageId + ' --accept-package-agreements --accept-source-agreements --silent',
      'exit $LASTEXITCODE',
    ].join('\r\n');

    // Wrapper script — launches the install script elevated via UAC
    const wrapperContent = [
      "$installScript = '" + installScript + "'",
      'try {',
      '  $p = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$installScript`"" -Verb RunAs -Wait -PassThru',
      '  if ($p) { exit $p.ExitCode } else { exit 1 }',
      '} catch {',
      '  Write-Error $_.Exception.Message',
      '  exit 1',
      '}',
    ].join('\r\n');

    fs.writeFileSync(installScript, installContent, 'utf8');
    fs.writeFileSync(wrapperScript, wrapperContent, 'utf8');
    debugLog('Wrote scripts: ' + wrapperScript + ' | ' + installScript);

    try {
      const { getMainWindow } = require('./main');
      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.minimize();
      }

      const result = await new Promise((resolve) => {
        debugLog('Launching via exec: ' + POWERSHELL_EXE);
        // Use exec (goes through cmd.exe) — NOT execFile.
        // execFile calls CreateProcess directly which can fail to trigger UAC
        // from GUI apps. exec goes through the shell which handles it properly.
        const cmd = '"' + POWERSHELL_EXE + '" -NoProfile -ExecutionPolicy Bypass -File "' + wrapperScript + '"';
        debugLog('Command: ' + cmd);
        exec(cmd, { timeout: 300000, windowsHide: false }, (err, stdout, stderr) => {
          const output = (stdout || '') + (stderr || '');
          debugLog('Done. err=' + (err ? err.message : 'null') + ' stdout=' + stdout + ' stderr=' + stderr);

          if (err) {
            if (output.includes('canceled by the user') || output.includes('cancelled by the user')) {
              resolve({ success: false, error: 'Installation was cancelled. Administrator access is required.' });
            } else if (output.includes('WINGET_NOT_FOUND')) {
              resolve({ success: false, error: 'winget was not found. Please install "App Installer" from the Microsoft Store.' });
            } else {
              resolve({ success: false, error: 'Installation failed: ' + (err.message || 'unknown error') });
            }
            return;
          }

          // Verify installation by checking the filesystem
          const deps = refreshDependencyCache();
          const installed = which === 'winfsp' ? deps.winfspInstalled : deps.sshfsInstalled;
          debugLog('Filesystem check: ' + which + ' installed=' + installed);
          if (installed) {
            resolve({ success: true, output: 'Installation completed and verified.' });
          } else {
            resolve({ success: false, error: 'Installer reported success but the dependency was not detected. A restart may be required, or try installing manually.' });
          }
        });
      });
      return result;
    } finally {
      try { fs.unlinkSync(installScript); } catch {}
      try { fs.unlinkSync(wrapperScript); } catch {}
    }
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
