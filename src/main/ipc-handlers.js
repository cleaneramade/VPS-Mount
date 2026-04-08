const { ipcMain, dialog, shell, app } = require('electron');
const { exec } = require('child_process');
const { checkDependencies } = require('./dependency-checker');
const { getAvailableDriveLetters } = require('./drive-utils');
const { testConnection } = require('./ssh-manager');
const sshfsManager = require('./sshfs-manager');
const fs = require('fs');
const path = require('path');
const os = require('os');

const POWERSHELL_EXE = path.join(
  process.env.SystemRoot || 'C:\\Windows',
  'System32',
  'WindowsPowerShell',
  'v1.0',
  'powershell.exe'
);

const DEBUG_LOG = path.join(process.env.TEMP || os.tmpdir(), 'vps-install-debug.log');

const INSTALLERS = {
  winfsp: {
    name: 'WinFsp',
    url: 'https://github.com/winfsp/winfsp/releases/download/v2.1/winfsp-2.1.25156.msi',
    fileName: 'winfsp-2.1.25156.msi',
    isInstalled: (deps) => deps.winfspInstalled,
  },
  sshfs: {
    name: 'SSHFS-Win',
    url: 'https://github.com/winfsp/sshfs-win/releases/download/v3.5.20357/sshfs-win-3.5.20357-x64.msi',
    fileName: 'sshfs-win-3.5.20357-x64.msi',
    isInstalled: (deps) => deps.sshfsInstalled,
  },
};

function debugLog(msg) {
  // Only write debug logs in development mode (when app is not packaged)
  if (app.isPackaged) return;

  try {
    fs.appendFileSync(DEBUG_LOG, new Date().toISOString() + ' ' + msg + '\r\n');
  } catch {}
}

let cachedDeps = null;

function refreshDependencyCache() {
  cachedDeps = checkDependencies();
  return cachedDeps;
}

function getConfigPath() {
  const appData = process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'vps-mount', 'config.json');
}

function normalizeConnectionConfig(config) {
  const normalized = {
    ...config,
    host: (config.host || '').trim(),
    username: (config.username || '').trim(),
    port: String(config.port || '22').trim(),
    remotePath: config.remotePath || '/',
  };

  let rawHost = normalized.host
    .replace(/^ssh\s+/i, '')
    .replace(/^sftp:\/\//i, 'ssh://')
    .trim();

  let parsedUsername = '';
  let parsedPort = '';
  let parsedHost = rawHost;

  try {
    const candidate = rawHost.includes('://') ? rawHost : `ssh://${rawHost}`;
    const parsedUrl = new URL(candidate);
    if (parsedUrl.hostname) parsedHost = parsedUrl.hostname;
    if (parsedUrl.username) parsedUsername = decodeURIComponent(parsedUrl.username);
    if (parsedUrl.port) parsedPort = parsedUrl.port;
  } catch {
    // Fall back to light string cleanup below.
  }

  if (parsedHost.includes('/')) {
    parsedHost = parsedHost.split('/')[0];
  }

  if (parsedHost.includes('@')) {
    parsedHost = parsedHost.split('@').pop();
  }

  parsedHost = parsedHost.replace(/^\[|\]$/g, '').trim();

  normalized.host = parsedHost;
  if (!normalized.username && parsedUsername) normalized.username = parsedUsername;
  if ((normalized.port === '22' || !normalized.port) && parsedPort) normalized.port = parsedPort;

  return normalized;
}

function buildInstallSteps(which, deps) {
  if (which === 'sshfs' && !deps.winfspInstalled) {
    return [INSTALLERS.winfsp, INSTALLERS.sshfs];
  }
  return [INSTALLERS[which]];
}

function escapeForDoubleQuotes(str) {
  return str.replace(/`/g, '``').replace(/"/g, '`"');
}

function createInstallerScripts(which, steps) {
  const timestamp = Date.now();
  const installScript = path.join(os.tmpdir(), `vps-install-${which}-${timestamp}.ps1`);
  const wrapperScript = path.join(os.tmpdir(), `vps-wrapper-${which}-${timestamp}.ps1`);
  const downloadDir = path.join(os.tmpdir(), 'vps-mount-installers');
  const logPath = DEBUG_LOG.replace(/\\/g, '\\\\');
  const psPath = POWERSHELL_EXE.replace(/\\/g, '\\\\');

  const stepObjects = steps.map((step) => {
    return [
      '@{',
      `  Name = "${escapeForDoubleQuotes(step.name)}"`,
      `  Url = "${escapeForDoubleQuotes(step.url)}"`,
      `  FileName = "${escapeForDoubleQuotes(step.fileName)}"`,
      '}',
    ].join('\r\n');
  }).join(',\r\n');

  const installContent = [
    '$ErrorActionPreference = "Stop"',
    '$ProgressPreference = "SilentlyContinue"',
    `$logPath = "${logPath}"`,
    'function Write-InstallLog($message) {',
    '  try { Add-Content -Path $logPath -Value ((Get-Date).ToString("o") + " [install-script] " + $message) } catch {}',
    '}',
    'try {',
    `  Write-InstallLog "Installer script started for ${which}"`,
    `$downloadDir = "${downloadDir.replace(/\\/g, '\\\\')}"`,
    '  New-Item -Path $downloadDir -ItemType Directory -Force | Out-Null',
    '  $packages = @(',
    stepObjects,
    '  )',
    '  foreach ($package in $packages) {',
    '    $installerPath = Join-Path $downloadDir $package.FileName',
    '    Write-InstallLog ("Downloading " + $package.Url + " to " + $installerPath)',
    '    Invoke-WebRequest -Uri $package.Url -OutFile $installerPath',
    '    Write-InstallLog ("Running msiexec for " + $package.Name)',
    "    $process = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', $installerPath, '/qn', '/norestart') -Wait -PassThru",
    '    Write-InstallLog ("msiexec exit code for " + $package.Name + ": " + $process.ExitCode)',
    '    if ($process.ExitCode -notin @(0, 1641, 3010)) {',
    '      throw ("Installer for " + $package.Name + " failed with exit code " + $process.ExitCode)',
    '    }',
    '  }',
    '  Write-InstallLog "Installer script completed successfully"',
    '} catch {',
    '  Write-InstallLog ("Installer script failed: " + $_.Exception.Message)',
    '  throw',
    '}',
  ].join('\r\n');

  const wrapperContent = [
    '$ErrorActionPreference = "Stop"',
    `$logPath = "${logPath}"`,
    `$installScript = "${installScript.replace(/\\/g, '\\\\')}"`,
    `$psExe = "${psPath}"`,
    'function Write-InstallLog($message) {',
    '  try { Add-Content -Path $logPath -Value ((Get-Date).ToString("o") + " [wrapper-script] " + $message) } catch {}',
    '}',
    'try {',
    `  Write-InstallLog "Wrapper started for ${which}"`,
    "  $process = Start-Process -FilePath $psExe -ArgumentList @('-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $installScript) -Verb RunAs -WindowStyle Hidden -Wait -PassThru",
    '  Write-InstallLog ("Wrapper exit code: " + $process.ExitCode)',
    '  exit $process.ExitCode',
    '} catch {',
    '  Write-InstallLog ("Wrapper failed: " + $_.Exception.Message)',
    '  throw',
    '}',
  ].join('\r\n');

  fs.writeFileSync(installScript, installContent, 'utf8');
  fs.writeFileSync(wrapperScript, wrapperContent, 'utf8');
  return { installScript, wrapperScript };
}

function runElevatedInstaller(wrapperScript) {
  const command = `"${POWERSHELL_EXE}" -NoProfile -ExecutionPolicy Bypass -File "${wrapperScript}"`;
  debugLog(`Launching via exec: ${command}`);

  return new Promise((resolve) => {
    exec(command, { timeout: 1800000, windowsHide: true }, (err, stdout, stderr) => {
      const output = ((stdout || '') + (stderr || '')).trim();
      debugLog(`Wrapper finished. err=${err ? err.message : 'null'} stdout=${stdout || ''} stderr=${stderr || ''}`);

      if (err) {
        if (output.includes('canceled by the user') || output.includes('cancelled by the user')) {
          resolve({ success: false, error: 'Installation was cancelled. Administrator access is required.' });
          return;
        }

        resolve({ success: false, error: 'Failed to run the installer: ' + (output || err.message || 'unknown error') });
        return;
      }

      resolve({ success: true, output });
    });
  });
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

  ipcMain.handle('connect', async (_event, config) => {
    const normalizedConfig = normalizeConnectionConfig(config);
    await testConnection(normalizedConfig);

    const deps = cachedDeps || refreshDependencyCache();
    if (!deps.sshfsBinaryPath) {
      throw new Error('SSHFS-Win not found. Please install it first.');
    }

    await sshfsManager.mount(normalizedConfig, deps.sshfsBinaryPath);

    const { setTrayConnected } = require('./main');
    setTrayConnected(true, normalizedConfig.host);

    saveConfig(normalizedConfig);

    return { success: true, config: normalizedConfig };
  });

  ipcMain.handle('disconnect', async () => {
    await sshfsManager.disconnect();
    const { setTrayConnected } = require('./main');
    setTrayConnected(false);
    return { success: true };
  });

  ipcMain.handle('select-key-file', async () => {
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Select SSH Private Key',
      properties: ['openFile'],
      filters: [
        { name: 'Private Key Files', extensions: ['pem', 'ppk', 'key'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('open-external', (_event, url) => {
    return shell.openExternal(url);
  });

  ipcMain.handle('open-explorer', (_event, driveLetter) => {
    return shell.openPath(driveLetter + '\\');
  });

  ipcMain.handle('install-dependency', async (_event, which) => {
    if (!INSTALLERS[which]) {
      return { success: false, error: 'Unknown dependency' };
    }

    const deps = refreshDependencyCache();
    if (INSTALLERS[which].isInstalled(deps)) {
      return { success: true, output: `${INSTALLERS[which].name} is already installed.` };
    }

    const steps = buildInstallSteps(which, deps);
    debugLog(`Starting install for ${which}; steps=${steps.map((step) => step.name).join(',')}`);

    const { installScript, wrapperScript } = createInstallerScripts(which, steps);
    debugLog(`Wrote install scripts: ${wrapperScript} | ${installScript}`);

    try {
      const result = await runElevatedInstaller(wrapperScript);
      if (!result.success) {
        return result;
      }

      const updatedDeps = refreshDependencyCache();
      const installed = INSTALLERS[which].isInstalled(updatedDeps);
      debugLog(`Filesystem check after install for ${which}: installed=${installed}`);

      if (!installed) {
        return {
          success: false,
          error: 'Installer finished but the dependency was not detected afterward. Check %TEMP%\\vps-install-debug.log for details.',
        };
      }

      setTimeout(() => {
        try {
          debugLog('Relaunching VPS Mount from main process after install success');
          app.relaunch();
          app.exit(0);
        } catch (err) {
          debugLog(`App relaunch failed: ${err && err.message ? err.message : err}`);
        }
      }, 500);

      return {
        success: true,
        output: steps.length > 1
          ? 'Installation completed. WinFsp and SSHFS-Win were installed. VPS Mount is restarting.'
          : `Installation completed. ${INSTALLERS[which].name} was installed. VPS Mount is restarting.`,
      };
    } catch (err) {
      debugLog(`Installer flow failed for ${which}: ${err && err.message ? err.message : err}`);
      return { success: false, error: 'Failed to complete the installer: ' + (err.message || 'unknown error') };
    } finally {
      try { fs.unlinkSync(installScript); } catch {}
      try { fs.unlinkSync(wrapperScript); } catch {}
    }
  });
}

function saveConfig(config) {
  try {
    const configPath = getConfigPath();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
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
    // ignore save errors
  }
}

module.exports = { registerIpcHandlers };
