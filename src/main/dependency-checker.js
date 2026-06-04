const fs = require('fs');
const path = require('path');

// Known default install paths — no shell commands, just fast file checks
const WINFSP_PATHS = [
  'C:\\Program Files (x86)\\WinFsp',
  'C:\\Program Files\\WinFsp',
];

const SSHFS_PATHS = [
  'C:\\Program Files\\SSHFS-Win\\bin\\sshfs.exe',
  'C:\\Program Files (x86)\\SSHFS-Win\\bin\\sshfs.exe',
  'C:\\Program Files\\SSHFS-Win\\bin\\sshfs-win.exe',
  'C:\\Program Files (x86)\\SSHFS-Win\\bin\\sshfs-win.exe',
];

function checkWinFsp() {
  // Just check if the WinFsp directory exists in default install locations
  for (const p of WINFSP_PATHS) {
    if (fs.existsSync(p)) return true;
  }
  return false;
}

function findSshfsBinary() {
  // Check known default install paths
  for (const p of SSHFS_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// rclone is the preferred mount engine (parallel transfers + local write cache —
// massively faster than sshfs for bulk copies). Installed via winget, whose
// package dir embeds the version, so scan rather than hardcode.
function findRcloneBinary() {
  const candidates = [];
  const localAppData = process.env.LOCALAPPDATA || '';
  const wingetPkgs = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
  try {
    for (const pkg of fs.readdirSync(wingetPkgs)) {
      if (!pkg.startsWith('Rclone.Rclone_')) continue;
      const pkgDir = path.join(wingetPkgs, pkg);
      for (const sub of fs.readdirSync(pkgDir)) {
        candidates.push(path.join(pkgDir, sub, 'rclone.exe'));
      }
    }
  } catch {}
  candidates.push(path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'rclone.exe'));
  candidates.push('C:\\Program Files\\rclone\\rclone.exe');
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return null;
}

function checkDependencies() {
  const winfspInstalled = checkWinFsp();
  const sshfsBinaryPath = findSshfsBinary();
  const rcloneBinaryPath = findRcloneBinary();
  return {
    winfspInstalled,
    sshfsInstalled: sshfsBinaryPath !== null,
    sshfsBinaryPath,
    rcloneInstalled: rcloneBinaryPath !== null,
    rcloneBinaryPath,
  };
}

module.exports = { checkDependencies, WINFSP_PATHS, SSHFS_PATHS };
