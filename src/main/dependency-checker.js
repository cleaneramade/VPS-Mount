const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SSHFS_PATHS = [
  'C:\\Program Files\\SSHFS-Win\\bin\\sshfs.exe',
  'C:\\Program Files (x86)\\SSHFS-Win\\bin\\sshfs.exe',
];

function checkWinFsp() {
  try {
    const output = execSync(
      'reg query "HKLM\\SOFTWARE\\WOW6432Node\\WinFsp" /v InstallDir 2>nul || reg query "HKLM\\SOFTWARE\\WinFsp" /v InstallDir 2>nul',
      { encoding: 'utf8', shell: true }
    );
    return output.includes('InstallDir');
  } catch {
    return false;
  }
}

function findSshfsBinary() {
  for (const p of SSHFS_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  // Also check WinFsp services registry for sshfs binary path
  try {
    const output = execSync(
      'reg query "HKLM\\SOFTWARE\\WOW6432Node\\WinFsp\\Services\\sshfs" /v Executable 2>nul',
      { encoding: 'utf8', shell: true }
    );
    const match = output.match(/Executable\s+REG_SZ\s+(.+)/);
    if (match) {
      const exePath = match[1].trim();
      // sshfs-win.exe is the service, but we need sshfs.exe in the same dir
      const dir = path.dirname(exePath);
      const sshfsExe = path.join(dir, 'sshfs.exe');
      if (fs.existsSync(sshfsExe)) return sshfsExe;
      // Fallback to the service exe itself
      if (fs.existsSync(exePath)) return exePath;
    }
  } catch {
    // ignore
  }
  return null;
}

function checkDependencies() {
  const winfspInstalled = checkWinFsp();
  const sshfsBinaryPath = findSshfsBinary();
  return {
    winfspInstalled,
    sshfsInstalled: sshfsBinaryPath !== null,
    sshfsBinaryPath,
  };
}

module.exports = { checkDependencies };
