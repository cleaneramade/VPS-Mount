const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let sshfsProcess = null;
let sshfsPid = null;
let healthInterval = null;
let onConnectionLost = null;
let onStatus = null;

// Auto-remount state. lastConfig (incl. password) is kept in memory only for the
// duration of the session so an unexpected drop can be remounted transparently.
let lastConfig = null;
let lastBinaryPath = null;
let userDisconnect = false;
let reconnecting = false;
let reconnectAttempt = 0;
let reconnectTimer = null;
const MAX_RECONNECT_ATTEMPTS = 10;

// Zombie-mount watchdog: detects the case where sshfs.exe is still running but the
// SSH channel inside it is dead (half-open TCP), leaving a frozen drive forever.
let probeInFlight = false;
let probeFailures = 0;
const PROBE_TIMEOUT_MS = 30000;
const PROBE_MAX_FAILURES = 2;

function buildArgs({ username, host, remotePath, driveLetter, port, authMethod, keyFilePath }) {
  const args = [
    `${username}@${host}:${remotePath}`,
    driveLetter,
    `-p${port}`,
    `-ovolname=VPS(${host})`,
    // Note: Host key verification is disabled for usability (no interactive known_hosts management in GUI).
    // This accepts MITM attacks silently on untrusted networks. Users should only connect to trusted hosts.
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
    // Keepalives keep the SSH session alive through NAT/firewall idle timeouts and
    // detect dead links. CountMax is generous (15s x 8 = ~120s) because keepalive
    // replies queue behind bulk data during large transfers — an aggressive value
    // would itself drop the connection mid-transfer.
    '-oServerAliveInterval=15',
    '-oServerAliveCountMax=8',
    '-oTCPKeepAlive=yes',
    '-oConnectTimeout=15',
  ];

  if (authMethod === 'password') {
    args.push('-oPreferredAuthentications=password');
    args.push('-opassword_stdin');
    // No -oreconnect here: sshfs cannot re-read the password from stdin on its own
    // reconnect. Password sessions are healed by the app-level auto-remount instead.
  } else {
    args.push('-oPreferredAuthentications=publickey');
    args.push(`-oIdentityFile=${keyFilePath.replace(/\\/g, '/')}`);
    args.push('-oreconnect');
  }

  return args;
}

// --- rclone engine -----------------------------------------------------------
// rclone mounts the same drive letter via WinFsp but with a local write cache
// (Explorer copies complete at disk speed, uploads continue in the background
// over 16 parallel connections) — vastly faster than sshfs for bulk transfers.

function isRcloneBinary(binaryPath) {
  return path.basename(binaryPath || '').toLowerCase().includes('rclone');
}

// rclone refuses plaintext passwords on the command line; they must be obscured
// (reversible encoding, NOT encryption — same trust level as password_stdin).
function obscurePassword(binaryPath, password) {
  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath, ['obscure', password], { windowsHide: true });
    let out = '';
    let errOut = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { errOut += d.toString(); });
    proc.on('error', (err) => reject(new Error(`Failed to run rclone obscure: ${err.message}`)));
    proc.on('close', (code) => {
      if (code === 0 && out.trim()) resolve(out.trim());
      else reject(new Error(`rclone obscure failed: ${errOut.slice(-200)}`));
    });
  });
}

function buildRcloneArgs({ username, host, remotePath, driveLetter, port, authMethod, keyFilePath }, obscuredPassword) {
  const args = [
    'mount',
    // On-the-fly sftp remote — no rclone.conf needed, config comes from the GUI.
    `:sftp:${remotePath}`,
    driveLetter,
    '--sftp-host', host,
    '--sftp-user', username,
    '--sftp-port', String(port),
    // Note: like the sshfs config (StrictHostKeyChecking=no), host keys are not
    // verified. Only connect to trusted hosts on trusted networks.
    '--vfs-cache-mode', 'full',
    '--vfs-cache-max-size', '10G',
    '--vfs-write-back', '5s',
    '--transfers', '16',
    '--checkers', '32',
    '--dir-cache-time', '15s',
    '--volname', `VPS(${host})`,
    '--contimeout', '15s',
    // Register with the Windows network provider so Explorer can query the
    // connection state — without this the drive works but shows a red X icon.
    '--network-mode',
  ];

  if (authMethod === 'password') {
    args.push('--sftp-pass', obscuredPassword);
  } else {
    args.push('--sftp-key-file', keyFilePath);
  }

  return args;
}
// -----------------------------------------------------------------------------

function mount(config, mountBinaryPath) {
  return new Promise((resolve, reject) => {
    if (sshfsProcess) {
      reject(new Error('Already connected. Disconnect first.'));
      return;
    }

    // A user-initiated mount supersedes any pending auto-reconnect attempt.
    // (When called from attemptReconnect the timer has already fired and is null,
    // so this only triggers for user mounts that preempt a scheduled reconnect.)
    if (reconnectTimer) {
      cancelReconnect();
    }

    if (config.authMethod !== 'password') {
      if (!config.keyFilePath) {
        reject(new Error('SSH key file path is required for key authentication.'));
        return;
      }
      try {
        fs.accessSync(config.keyFilePath, fs.constants.R_OK);
      } catch {
        reject(new Error(`SSH key file not found or not readable: ${config.keyFilePath}`));
        return;
      }
    }

    const useRclone = isRcloneBinary(mountBinaryPath);
    let resolved = false;

    function launch(args) {
      const binDir = path.dirname(mountBinaryPath);

      const proc = spawn(mountBinaryPath, args, {
        env: { ...process.env, PATH: binDir + ';' + (process.env.PATH || '') },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let debugOutput = '';
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
        lastConfig = config;
        lastBinaryPath = mountBinaryPath;
        userDisconnect = false;
        reconnecting = false;
        reconnectAttempt = 0;
        startHealthMonitor();
        resolve({ pid: proc.pid });
      }

      // For sshfs password auth, pipe password to stdin (rclone gets it via args)
      if (!useRclone && config.authMethod === 'password') {
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

      // Engine-agnostic success check: the drive letter appearing is the truth.
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
          reject(new Error(`Failed to start mount engine: ${err.message}`));
        }
      });

      proc.on('close', (code) => {
        if (mountCheckInterval) {
          clearInterval(mountCheckInterval);
          mountCheckInterval = null;
        }
        if (!resolved) {
          resolved = true;
          const lower = debugOutput.toLowerCase();
          if (lower.includes('mount point in use') || lower.includes('already in use') || lower.includes('mountpoint path already exists')) {
            reject(new Error('Drive letter is already in use. Choose a different one.'));
          } else if (lower.includes('permission denied') || lower.includes('authentication') || lower.includes('unable to authenticate')) {
            reject(new Error('Authentication failed during mount.'));
          } else if (lower.includes('no such file') || lower.includes('no such identity') || lower.includes('failed to read private key')) {
            reject(new Error('SSH key file not found.'));
          } else {
            reject(new Error(`Mount engine exited with code ${code}. ${debugOutput.slice(-200)}`));
          }
        } else {
          // Process died after successful mount
          cleanup();
          scheduleReconnect('Mount process exited unexpectedly');
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
    }

    if (useRclone) {
      const passwordStep = config.authMethod === 'password'
        ? obscurePassword(mountBinaryPath, config.password)
        : Promise.resolve(null);
      passwordStep
        .then((obscured) => launch(buildRcloneArgs(config, obscured)))
        .catch((err) => {
          if (!resolved) {
            resolved = true;
            reject(err);
          }
        });
    } else {
      launch(['-f', ...buildArgs(config)]);
    }
  });
}

function isValidPid(pid) {
  return Number.isInteger(pid) && pid > 0;
}

function disconnect() {
  return new Promise((resolve) => {
    // User-initiated: suppress auto-remount and drop in-memory credentials.
    userDisconnect = true;
    cancelReconnect();
    lastConfig = null;
    lastBinaryPath = null;
    stopHealthMonitor();
    if (isValidPid(sshfsPid)) {
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

function cancelReconnect() {
  reconnecting = false;
  reconnectAttempt = 0;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(reason) {
  // Already (re)connected — e.g. a user mount won a race against a reconnect attempt.
  if (sshfsProcess) return;
  if (userDisconnect || !lastConfig) {
    if (onConnectionLost) {
      onConnectionLost(reason);
    }
    return;
  }
  reconnecting = true;
  reconnectAttempt += 1;
  if (reconnectAttempt > MAX_RECONNECT_ATTEMPTS) {
    cancelReconnect();
    if (onStatus) {
      onStatus('gave-up', reason);
    }
    if (onConnectionLost) {
      onConnectionLost('Reconnect failed after multiple attempts.');
    }
    return;
  }
  // Exponential backoff: 2s, 4s, 8s... capped at 30s.
  const delay = Math.min(2000 * 2 ** (reconnectAttempt - 1), 30000);
  if (onStatus) {
    onStatus('reconnecting', `Attempt ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS}`);
  }
  reconnectTimer = setTimeout(attemptReconnect, delay);
}

function attemptReconnect() {
  reconnectTimer = null;
  if (userDisconnect || !lastConfig || sshfsProcess) return;
  mount(lastConfig, lastBinaryPath)
    .then(() => {
      const host = lastConfig ? lastConfig.host : '';
      reconnecting = false;
      reconnectAttempt = 0;
      if (onStatus) {
        onStatus('reconnected', host);
      }
    })
    .catch((err) => {
      // Includes transient "drive letter in use" while WinFsp frees it — backoff retries.
      scheduleReconnect(err.message);
    });
}

function cleanup() {
  stopHealthMonitor();
  sshfsProcess = null;
  sshfsPid = null;
}

function startHealthMonitor() {
  stopHealthMonitor();
  probeFailures = 0;
  healthInterval = setInterval(() => {
    if (!isValidPid(sshfsPid)) {
      stopHealthMonitor();
      return;
    }
    exec(`tasklist /FI "PID eq ${sshfsPid}" /NH`, (err, stdout) => {
      if (err || !stdout.includes(String(sshfsPid))) {
        cleanup();
        scheduleReconnect('SSHFS process is no longer running');
      }
    });
    probeMount();
  }, 5000);
}

// Checks that the mounted drive actually responds, not just that the process exists.
// A stat of the drive root goes through the SSH channel; the timeout is generous
// (30s, 2 consecutive failures = ~1min unresponsive) so a saturated pipe during a
// large transfer is never mistaken for a dead mount.
function probeMount() {
  if (probeInFlight || !sshfsProcess || !lastConfig) return;
  probeInFlight = true;
  let timer = null;
  const timeout = new Promise((_, timeoutReject) => {
    timer = setTimeout(() => timeoutReject(new Error('probe timeout')), PROBE_TIMEOUT_MS);
  });
  Promise.race([fs.promises.stat(lastConfig.driveLetter + '\\'), timeout])
    .then(() => {
      probeFailures = 0;
    })
    .catch(() => {
      if (!sshfsProcess || userDisconnect) return;
      probeFailures += 1;
      if (probeFailures >= PROBE_MAX_FAILURES) {
        probeFailures = 0;
        // Kill the zombie process; its 'close' handler runs cleanup() and
        // scheduleReconnect(), so the normal auto-remount path takes over.
        if (isValidPid(sshfsPid)) {
          exec(`taskkill /PID ${sshfsPid} /T /F`, () => {});
        }
      }
    })
    .finally(() => {
      if (timer) clearTimeout(timer);
      probeInFlight = false;
    });
}

function stopHealthMonitor() {
  if (healthInterval) {
    clearInterval(healthInterval);
    healthInterval = null;
  }
}

function isConnected() {
  // A reconnect in progress still counts as connected so the app stays in the
  // tray (and doesn't quit) while the mount is being restored.
  return (sshfsProcess !== null && sshfsPid !== null) || reconnecting;
}

function setConnectionLostHandler(handler) {
  onConnectionLost = handler;
}

function setStatusHandler(handler) {
  onStatus = handler;
}

module.exports = { mount, disconnect, isConnected, setConnectionLostHandler, setStatusHandler };
