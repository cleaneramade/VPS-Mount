const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let sshfsProcess = null;
let sshfsPid = null;
let healthInterval = null;
let onConnectionLost = null;

function buildArgs({ username, host, remotePath, driveLetter, port, authMethod, keyFilePath }) {
  const args = [
    `${username}@${host}:${remotePath}`,
    driveLetter,
    `-p${port}`,
    `-ovolname=VPS(${host})`,
    '-oStrictHostKeyChecking=no',
    '-oUserKnownHostsFile=/dev/null',
    '-oidmap=user',
    '-ouid=-1',
    '-ogid=-1',
    '-oumask=000',
    '-ocreate_umask=000',
    '-omax_readahead=1GB',
    '-oallow_other',
    '-olarge_read',
    '-okernel_cache',
    '-ofollow_symlinks',
    '-orellinks',
    '-ofstypename=SSHFS',
  ];

  if (authMethod === 'password') {
    args.push('-oPreferredAuthentications=password');
    args.push('-opassword_stdin');
  } else {
    args.push('-oPreferredAuthentications=publickey');
    args.push(`-oIdentityFile=${keyFilePath.replace(/\\/g, '/')}`);
  }

  return args;
}

function mount(config, sshfsBinaryPath) {
  return new Promise((resolve, reject) => {
    if (sshfsProcess) {
      reject(new Error('Already connected. Disconnect first.'));
      return;
    }

    const args = ['-f', ...buildArgs(config)];
    const sshfsDir = path.dirname(sshfsBinaryPath);

    const proc = spawn(sshfsBinaryPath, args, {
      env: { ...process.env, PATH: sshfsDir + ';' + (process.env.PATH || '') },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let debugOutput = '';
    let resolved = false;
    let mountCheckInterval = null;

    function finishMounted() {
      if (resolved) return;
      resolved = true;
      if (mountCheckInterval) {
        clearInterval(mountCheckInterval);
        mountCheckInterval = null;
      }
      sshfsProcess = proc;
      sshfsPid = proc.pid;
      startHealthMonitor();
      resolve({ pid: proc.pid });
    }

    // For password auth, pipe password to stdin
    if (config.authMethod === 'password') {
      proc.stdin.write(config.password + '\n');
    }

    proc.stderr.on('data', (data) => {
      const msg = data.toString();
      debugOutput += msg;
      debugOutput = debugOutput.slice(-2048);

      if (!resolved && msg.includes('has been started')) {
        finishMounted();
      }
    });

    proc.stdout.on('data', (data) => {
      const msg = data.toString();
      debugOutput += msg;
      debugOutput = debugOutput.slice(-2048);
    });

    mountCheckInterval = setInterval(() => {
      try {
        if (!resolved && fs.existsSync(config.driveLetter + '\\')) {
          finishMounted();
        }
      } catch {}
    }, 500);

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        if (mountCheckInterval) {
          clearInterval(mountCheckInterval);
          mountCheckInterval = null;
        }
        reject(new Error(`Failed to start SSHFS: ${err.message}`));
      }
    });

    proc.on('close', (code) => {
      if (mountCheckInterval) {
        clearInterval(mountCheckInterval);
        mountCheckInterval = null;
      }
      if (!resolved) {
        resolved = true;
        if (debugOutput.includes('mount point in use') || debugOutput.includes('already in use')) {
          reject(new Error('Drive letter is already in use. Choose a different one.'));
        } else if (debugOutput.includes('Permission denied') || debugOutput.includes('authentication')) {
          reject(new Error('Authentication failed during mount.'));
        } else if (debugOutput.includes('No such file') || debugOutput.includes('no such identity')) {
          reject(new Error('SSH key file not found.'));
        } else {
          reject(new Error(`SSHFS exited with code ${code}. ${debugOutput.slice(-200)}`));
        }
      } else {
        // Process died after successful mount
        cleanup();
        if (onConnectionLost) {
          onConnectionLost('SSHFS process exited unexpectedly');
        }
      }
    });

    // Safety timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (mountCheckInterval) {
          clearInterval(mountCheckInterval);
          mountCheckInterval = null;
        }
        proc.kill();
        reject(new Error('Mount timed out after 30 seconds. Check your connection details.'));
      }
    }, 30000);
  });
}

function disconnect() {
  return new Promise((resolve) => {
    stopHealthMonitor();
    if (sshfsPid) {
      exec(`taskkill /PID ${sshfsPid} /T /F`, () => {
        cleanup();
        resolve();
      });
    } else if (sshfsProcess) {
      sshfsProcess.kill();
      cleanup();
      resolve();
    } else {
      resolve();
    }
  });
}

function cleanup() {
  stopHealthMonitor();
  sshfsProcess = null;
  sshfsPid = null;
}

function startHealthMonitor() {
  stopHealthMonitor();
  healthInterval = setInterval(() => {
    if (!sshfsPid) {
      stopHealthMonitor();
      return;
    }
    exec(`tasklist /FI "PID eq ${sshfsPid}" /NH`, (err, stdout) => {
      if (err || !stdout.includes(String(sshfsPid))) {
        cleanup();
        if (onConnectionLost) {
          onConnectionLost('SSHFS process is no longer running');
        }
      }
    });
  }, 5000);
}

function stopHealthMonitor() {
  if (healthInterval) {
    clearInterval(healthInterval);
    healthInterval = null;
  }
}

function isConnected() {
  return sshfsProcess !== null && sshfsPid !== null;
}

function setConnectionLostHandler(handler) {
  onConnectionLost = handler;
}

module.exports = { mount, disconnect, isConnected, setConnectionLostHandler };
