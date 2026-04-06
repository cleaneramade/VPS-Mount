// Window controls
document.getElementById('wc-close').addEventListener('click', () => window.vpsConnector.windowClose());
document.getElementById('wc-minimize').addEventListener('click', () => window.vpsConnector.windowMinimize());

// State
let state = 'checking';

// DOM elements
const screens = {
  setup: document.getElementById('setup-screen'),
  connect: document.getElementById('connect-screen'),
  connected: document.getElementById('connected-screen'),
};

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// Auth toggle
const authButtons = document.querySelectorAll('.auth-btn');
const passwordGroup = document.getElementById('password-group');
const keyGroup = document.getElementById('key-group');

authButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    authButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const method = btn.dataset.auth;
    passwordGroup.style.display = method === 'password' ? 'block' : 'none';
    keyGroup.style.display = method === 'key' ? 'block' : 'none';
  });
});

// Screen management
function showScreen(name) {
  Object.values(screens).forEach(s => s.style.display = 'none');
  if (screens[name]) screens[name].style.display = 'block';
  const footer = document.querySelector('.status-bar');
  if (footer) footer.style.display = name === 'setup' ? 'none' : 'flex';
}

function setStatus(text, dotClass) {
  statusText.textContent = text;
  statusDot.className = 'status-dot' + (dotClass ? ' ' + dotClass : '');
}

// Initialize — all sync, no IPC
function init() {
  try {
    const deps = window.vpsConnector.checkDepsLocal();

    if (deps.winfspInstalled && deps.sshfsInstalled) {
      showScreen('connect');
      setStatus('Disconnected', 'red');
      state = 'disconnected';
      populateDriveLetters();
      loadSavedConfig();
    } else {
      showSetupScreen(deps);
    }
  } catch (err) {
    // If anything fails, show setup with both missing
    showSetupScreen({ winfspInstalled: false, sshfsInstalled: false });
  }
}

function showSetupScreen(deps) {
  showScreen('setup');
  state = 'setup';

  const winfspDot = document.querySelector('#dep-winfsp .dep-status');
  const sshfsDot = document.querySelector('#dep-sshfs .dep-status');
  const winfspBtn = document.getElementById('btn-install-winfsp');
  const sshfsBtn = document.getElementById('btn-install-sshfs');

  winfspDot.className = 'status-dot ' + (deps.winfspInstalled ? 'green' : 'red');
  sshfsDot.className = 'status-dot ' + (deps.sshfsInstalled ? 'green' : 'red');

  if (deps.winfspInstalled) {
    winfspBtn.textContent = 'Installed';
    winfspBtn.className = 'btn-install installed';
    winfspBtn.disabled = true;
  } else {
    winfspBtn.textContent = 'Install';
    winfspBtn.className = 'btn-install';
    winfspBtn.disabled = false;
  }

  if (deps.sshfsInstalled) {
    sshfsBtn.textContent = 'Installed';
    sshfsBtn.className = 'btn-install installed';
    sshfsBtn.disabled = true;
  } else {
    sshfsBtn.textContent = 'Install';
    sshfsBtn.className = 'btn-install';
    sshfsBtn.disabled = false;
  }

  // Clear any previous verify message
  const msg = document.getElementById('verify-msg');
  if (msg) msg.style.display = 'none';
}

function populateDriveLetters() {
  try {
    const drives = window.vpsConnector.getAvailableDrivesLocal();
    const select = document.getElementById('drive-letter');
    select.innerHTML = '';
    drives.forEach(letter => {
      const opt = document.createElement('option');
      opt.value = letter;
      opt.textContent = letter;
      select.appendChild(opt);
    });
  } catch {}
}

function loadSavedConfig() {
  try {
    const config = window.vpsConnector.loadConfigLocal();
    if (!config) return;
    if (config.host) document.getElementById('host').value = config.host;
    if (config.username) document.getElementById('username').value = config.username;
    if (config.port) document.getElementById('port').value = config.port;
    if (config.remotePath) document.getElementById('remote-path').value = config.remotePath;
    if (config.driveLetter) document.getElementById('drive-letter').value = config.driveLetter;
    if (config.authMethod === 'key') {
      authButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.auth === 'key');
      });
      passwordGroup.style.display = 'none';
      keyGroup.style.display = 'block';
      if (config.keyFilePath) document.getElementById('keyfile').value = config.keyFilePath;
    }
  } catch {}
}

function showInstallError(msg) {
  let el = document.getElementById('verify-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'verify-msg';
    el.className = 'verify-msg';
    document.getElementById('btn-recheck').parentNode.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
}

function clearInstallError() {
  const el = document.getElementById('verify-msg');
  if (el) el.style.display = 'none';
}

// Install dependency via winget
async function installDep(which, btn) {
  clearInstallError();
  btn.disabled = true;
  btn.className = 'btn-install installing';
  btn.innerHTML = '<span class="spinner-small"></span> Installing...';

  const dot = document.querySelector(`#dep-${which} .dep-status`);
  dot.className = 'status-dot yellow pulse';

  try {
    const result = await window.vpsConnector.installDependency(which);

    if (result.success) {
      btn.textContent = 'Installed';
      btn.className = 'btn-install installed';
      dot.className = 'status-dot green';
    } else {
      btn.textContent = 'Retry';
      btn.className = 'btn-install';
      btn.disabled = false;
      dot.className = 'status-dot red';
      showInstallError(result.error || 'Installation failed. Please try again.');
    }
  } catch (err) {
    btn.textContent = 'Retry';
    btn.className = 'btn-install';
    btn.disabled = false;
    dot.className = 'status-dot red';
    showInstallError(err.message || 'An unexpected error occurred.');
  }
}

document.getElementById('btn-install-winfsp').addEventListener('click', function() {
  installDep('winfsp', this);
});

document.getElementById('btn-install-sshfs').addEventListener('click', function() {
  installDep('sshfs', this);
});

// Verify Installation — just check the button states on the page
document.getElementById('btn-recheck').addEventListener('click', () => {
  const recheckBtn = document.getElementById('btn-recheck');
  const winfspBtn = document.getElementById('btn-install-winfsp');
  const sshfsBtn = document.getElementById('btn-install-sshfs');

  // Show verifying state with spinner
  recheckBtn.disabled = true;
  recheckBtn.innerHTML = '<span class="spinner-small"></span> Verifying...';

  // Check after a short delay so spinner shows
  setTimeout(() => {
    // Re-check filesystem, not CSS classes
    const deps = window.vpsConnector.checkDepsLocal();

    // Update button/dot states to reflect filesystem reality
    const winfspDot = document.querySelector('#dep-winfsp .dep-status');
    const sshfsDot = document.querySelector('#dep-sshfs .dep-status');

    if (deps.winfspInstalled) {
      winfspBtn.textContent = 'Installed';
      winfspBtn.className = 'btn-install installed';
      winfspBtn.disabled = true;
      winfspDot.className = 'status-dot green';
    } else {
      winfspBtn.textContent = 'Install';
      winfspBtn.className = 'btn-install';
      winfspBtn.disabled = false;
      winfspDot.className = 'status-dot red';
    }

    if (deps.sshfsInstalled) {
      sshfsBtn.textContent = 'Installed';
      sshfsBtn.className = 'btn-install installed';
      sshfsBtn.disabled = true;
      sshfsDot.className = 'status-dot green';
    } else {
      sshfsBtn.textContent = 'Install';
      sshfsBtn.className = 'btn-install';
      sshfsBtn.disabled = false;
      sshfsDot.className = 'status-dot red';
    }

    const count = (deps.winfspInstalled ? 1 : 0) + (deps.sshfsInstalled ? 1 : 0);

    if (count === 2) {
      // Both installed — go to connect screen
      recheckBtn.innerHTML = 'All verified';
      recheckBtn.className = 'btn btn-secondary verified';

      setTimeout(() => {
        showScreen('connect');
        setStatus('Disconnected', 'red');
        state = 'disconnected';
        populateDriveLetters();
        loadSavedConfig();
      }, 800);
    } else {
      // Show message with count
      let msg = document.getElementById('verify-msg');
      if (!msg) {
        msg = document.createElement('div');
        msg.id = 'verify-msg';
        msg.className = 'verify-msg';
        recheckBtn.parentNode.appendChild(msg);
      }
      msg.textContent = count + ' out of 2 dependencies installed. Please install the missing dependencies.';
      msg.style.display = 'block';

      recheckBtn.textContent = 'Verify Installation';
      recheckBtn.className = 'btn btn-secondary';
      recheckBtn.disabled = false;
    }
  }, 1000);
});

// Get form values
function getFormConfig() {
  const authMethod = document.querySelector('.auth-btn.active').dataset.auth;
  return {
    host: document.getElementById('host').value.trim(),
    port: document.getElementById('port').value || '22',
    username: document.getElementById('username').value.trim(),
    authMethod,
    password: document.getElementById('password').value,
    keyFilePath: document.getElementById('keyfile').value,
    remotePath: document.getElementById('remote-path').value.trim() || '/',
    driveLetter: document.getElementById('drive-letter').value,
  };
}

function validateForm(config) {
  if (!config.host) return 'Host is required';
  if (!config.username) return 'Username is required';
  if (config.authMethod === 'password' && !config.password) return 'Password is required';
  if (config.authMethod === 'key' && !config.keyFilePath) return 'Key file is required';
  const port = parseInt(config.port);
  if (isNaN(port) || port < 1 || port > 65535) return 'Port must be 1-65535';
  return null;
}

function showError(msg) {
  let el = document.querySelector('.error-msg');
  if (!el) {
    el = document.createElement('div');
    el.className = 'error-msg';
    document.querySelector('#connect-screen .card').appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError() {
  const el = document.querySelector('.error-msg');
  if (el) el.style.display = 'none';
}

function setFormDisabled(disabled) {
  const form = document.querySelector('#connect-screen .card');
  form.querySelectorAll('input, select, button').forEach(el => {
    el.disabled = disabled;
  });
}

// Connect
document.getElementById('btn-connect').addEventListener('click', async () => {
  clearError();
  const config = getFormConfig();
  const error = validateForm(config);
  if (error) {
    showError(error);
    return;
  }

  state = 'connecting';
  setFormDisabled(true);
  const connectBtn = document.getElementById('btn-connect');
  connectBtn.innerHTML = '<div class="spinner"></div> Connecting...';
  setStatus('Testing SSH connection...', 'yellow pulse');

  try {
    await window.vpsConnector.connect(config);
    state = 'connected';
    document.getElementById('connected-host').textContent = `${config.username}@${config.host}`;
    document.getElementById('connected-drive').textContent = config.driveLetter;
    document.getElementById('connected-path').textContent = config.remotePath;
    showScreen('connected');
    setStatus(`Connected to ${config.host}`, 'green');
  } catch (err) {
    state = 'disconnected';
    showError(err.message || 'Connection failed');
    setStatus('Connection failed', 'red');
  } finally {
    setFormDisabled(false);
    connectBtn.innerHTML = 'Connect';
  }
});

// Disconnect
document.getElementById('btn-disconnect').addEventListener('click', async () => {
  state = 'disconnecting';
  document.getElementById('btn-disconnect').disabled = true;
  setStatus('Disconnecting...', 'yellow pulse');

  try {
    await window.vpsConnector.disconnect();
  } catch (err) {}

  state = 'disconnected';
  showScreen('connect');
  setStatus('Disconnected', 'red');
  document.getElementById('btn-disconnect').disabled = false;
});

// Open in Explorer
document.getElementById('btn-explorer').addEventListener('click', () => {
  const drive = document.getElementById('connected-drive').textContent;
  if (window.vpsConnector.openExplorer) {
    window.vpsConnector.openExplorer(drive);
  }
});

// Browse for key file
document.getElementById('btn-browse').addEventListener('click', async () => {
  if (!window.vpsConnector.selectKeyFile) return;
  const filePath = await window.vpsConnector.selectKeyFile();
  if (filePath) {
    document.getElementById('keyfile').value = filePath;
  }
});

// Connection lost handler
if (window.vpsConnector.onConnectionLost) {
  window.vpsConnector.onConnectionLost((reason) => {
    state = 'disconnected';
    showScreen('connect');
    setStatus('Connection lost: ' + reason, 'red');
  });
}

// Start
init();
