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

function checkDependencies() {
  const winfspInstalled = checkWinFsp();
  const sshfsBinaryPath = findSshfsBinary();
  return {
    winfspInstalled,
    sshfsInstalled: sshfsBinaryPath !== null,
    sshfsBinaryPath,
  };
}

module.exports = { checkDependencies, WINFSP_PATHS, SSHFS_PATHS };
