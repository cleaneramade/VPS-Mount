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
const appHeader = document.querySelector('.app-header');
const content = document.querySelector('.content');
const headerTitle = document.getElementById('app-header-title');
const headerSubtitle = document.getElementById('app-header-subtitle');

const headerContent = {
  setup: {
    title: 'Prepare Your Connector',
    subtitle: 'Install the required tools to mount your VPS as a local drive',
  },
  connect: {
    title: '',
    subtitle: '',
  },
  connected: {
    title: 'Connector Ready',
    subtitle: 'Your VPS is mounted and ready to browse',
  },
};

// Auth toggle
const authButtons = document.querySelectorAll('.auth-btn');
const passwordGroup = document.getElementById('password-group');
const keyGroup = document.getElementById('key-group');
const portInput = document.getElementById('port');
const driveLetterSelect = document.getElementById('drive-letter');
const driveLetterField = document.querySelector('.drive-letter-field');
const driveLetterTrigger = document.getElementById('drive-letter-trigger');
const driveLetterValue = document.getElementById('drive-letter-value');
const driveLetterMenu = document.getElementById('drive-letter-menu');
const driveLetterOptions = document.getElementById('drive-letter-options');
const driveLetterScrollbar = document.querySelector('.drive-letter-scrollbar');
const driveLetterScrollbarThumb = document.getElementById('drive-letter-scrollbar-thumb');

authButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    authButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const method = btn.dataset.auth;
    passwordGroup.style.display = method === 'password' ? 'block' : 'none';
    keyGroup.style.display = method === 'key' ? 'block' : 'none';
  });
});

portInput.addEventListener('input', () => {
  portInput.value = portInput.value.replace(/\D/g, '').slice(0, 5);
});

const infoTips = Array.from(document.querySelectorAll('.info-tip'));
let activeInfoTip = null;

function positionInfoTip(tip) {
  const bubble = tip.querySelector('.info-bubble');
  if (!bubble) return;

  const viewportPadding = 12;
  const gap = 10;

  tip.classList.add('is-open');
  bubble.style.top = '-9999px';
  bubble.style.left = '-9999px';

  const tipRect = tip.getBoundingClientRect();
  const bubbleRect = bubble.getBoundingClientRect();

  let top = tipRect.bottom + gap;
  if (top + bubbleRect.height > window.innerHeight - viewportPadding) {
    top = tipRect.top - bubbleRect.height - gap;
  }
  top = Math.max(
    viewportPadding,
    Math.min(top, window.innerHeight - bubbleRect.height - viewportPadding)
  );

  let left = tipRect.right - bubbleRect.width;
  left = Math.max(
    viewportPadding,
    Math.min(left, window.innerWidth - bubbleRect.width - viewportPadding)
  );

  bubble.style.top = `${Math.round(top)}px`;
  bubble.style.left = `${Math.round(left)}px`;
}

function showInfoTip(tip) {
  if (activeInfoTip && activeInfoTip !== tip) {
    activeInfoTip.classList.remove('is-open');
  }
  activeInfoTip = tip;
  positionInfoTip(tip);
}

function hideInfoTip(tip) {
  tip.classList.remove('is-open');
  if (activeInfoTip === tip) {
    activeInfoTip = null;
  }
}

function initInfoTips() {
  infoTips.forEach(tip => {
    tip.addEventListener('mouseenter', () => showInfoTip(tip));
    tip.addEventListener('focus', () => showInfoTip(tip));
    tip.addEventListener('mouseleave', () => hideInfoTip(tip));
    tip.addEventListener('blur', () => hideInfoTip(tip));
  });

  window.addEventListener('resize', () => {
    if (activeInfoTip) {
      positionInfoTip(activeInfoTip);
    }
  });

  window.addEventListener('scroll', () => {
    if (activeInfoTip) {
      positionInfoTip(activeInfoTip);
    }
  }, true);
}

function closeDriveLetterDropdown() {
  driveLetterField.classList.remove('is-open');
  driveLetterField.classList.remove('is-open-upward');
  driveLetterTrigger.setAttribute('aria-expanded', 'false');
}

function updateDriveLetterScrollbar() {
  const trackHeight = driveLetterScrollbar.clientHeight;
  const visibleHeight = driveLetterOptions.clientHeight;
  const totalHeight = driveLetterOptions.scrollHeight;

  if (!trackHeight || totalHeight <= visibleHeight + 1) {
    driveLetterScrollbar.classList.remove('is-visible');
    driveLetterScrollbarThumb.style.height = '0px';
    driveLetterScrollbarThumb.style.transform = 'translateY(0)';
    return;
  }

  driveLetterScrollbar.classList.add('is-visible');
  const minThumbHeight = 28;
  const thumbHeight = Math.max(minThumbHeight, Math.round((visibleHeight / totalHeight) * trackHeight));
  const maxThumbOffset = trackHeight - thumbHeight;
  const scrollRange = totalHeight - visibleHeight;
  const thumbOffset = scrollRange > 0
    ? Math.round((driveLetterOptions.scrollTop / scrollRange) * maxThumbOffset)
    : 0;

  driveLetterScrollbarThumb.style.height = `${thumbHeight}px`;
  driveLetterScrollbarThumb.style.transform = `translateY(${thumbOffset}px)`;
}

function positionDriveLetterDropdown() {
  const viewportPadding = 12;
  const gap = 8;
  const preferredMenuHeight = 255;
  const triggerRect = driveLetterTrigger.getBoundingClientRect();
  const preferredWidth = Math.max(Math.round(triggerRect.width), 112);

  driveLetterMenu.style.width = `${preferredWidth}px`;
  driveLetterMenu.style.top = '-9999px';
  driveLetterMenu.style.left = '-9999px';
  driveLetterMenu.style.maxHeight = `${preferredMenuHeight}px`;
  driveLetterOptions.style.maxHeight = `${preferredMenuHeight - 12}px`;

  const menuRect = driveLetterMenu.getBoundingClientRect();
  const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding - gap;
  const spaceAbove = triggerRect.top - viewportPadding - gap;
  const menuHeight = Math.min(menuRect.height || preferredMenuHeight, preferredMenuHeight);
  const shouldOpenUpward = spaceBelow < Math.min(menuHeight, 180) && spaceAbove > spaceBelow;
  const availableHeight = shouldOpenUpward ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(96, Math.min(preferredMenuHeight, availableHeight));

  driveLetterField.classList.toggle('is-open-upward', shouldOpenUpward);
  driveLetterMenu.style.maxHeight = `${Math.round(maxHeight)}px`;
  driveLetterOptions.style.maxHeight = `${Math.max(84, Math.round(maxHeight) - 12)}px`;

  const measuredRect = driveLetterMenu.getBoundingClientRect();
  const resolvedHeight = Math.min(measuredRect.height || menuHeight, maxHeight);
  const top = shouldOpenUpward
    ? Math.max(viewportPadding, triggerRect.top - resolvedHeight - gap)
    : Math.min(triggerRect.bottom + gap, window.innerHeight - resolvedHeight - viewportPadding);
  const left = Math.max(
    viewportPadding,
    Math.min(triggerRect.left, window.innerWidth - preferredWidth - viewportPadding)
  );

  driveLetterMenu.style.top = `${Math.round(top)}px`;
  driveLetterMenu.style.left = `${Math.round(left)}px`;
  updateDriveLetterScrollbar();
}

function openDriveLetterDropdown() {
  if (driveLetterTrigger.disabled) return;
  driveLetterField.classList.add('is-open');
  driveLetterTrigger.setAttribute('aria-expanded', 'true');
  positionDriveLetterDropdown();
}

function setDriveLetterValue(value) {
  if (!value) return;
  driveLetterSelect.value = value;
  driveLetterValue.textContent = value;
  Array.from(driveLetterOptions.querySelectorAll('.drive-letter-option')).forEach(option => {
    const isSelected = option.dataset.value === value;
    option.classList.toggle('is-selected', isSelected);
    option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });
}

function renderDriveLetterOptions(drives) {
  driveLetterOptions.innerHTML = '';
  drives.forEach(letter => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'drive-letter-option';
    option.dataset.value = letter;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.textContent = letter;
    option.addEventListener('click', () => {
      setDriveLetterValue(letter);
      closeDriveLetterDropdown();
      driveLetterTrigger.focus();
    });
    driveLetterOptions.appendChild(option);
  });
  updateDriveLetterScrollbar();
}

function initDriveLetterDropdown() {
  driveLetterTrigger.addEventListener('click', () => {
    if (driveLetterField.classList.contains('is-open')) {
      closeDriveLetterDropdown();
    } else {
      openDriveLetterDropdown();
    }
  });

  driveLetterTrigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDriveLetterDropdown();
      const selected = driveLetterOptions.querySelector('.drive-letter-option.is-selected');
      if (selected) selected.focus();
    }
    if (event.key === 'Escape') {
      closeDriveLetterDropdown();
    }
  });

  driveLetterOptions.addEventListener('keydown', event => {
    const options = Array.from(driveLetterOptions.querySelectorAll('.drive-letter-option'));
    const currentIndex = options.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDriveLetterDropdown();
      driveLetterTrigger.focus();
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = options[Math.min(currentIndex + 1, options.length - 1)] || options[0];
      if (next) next.focus();
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = options[Math.max(currentIndex - 1, 0)] || options[0];
      if (prev) prev.focus();
    }
    if (event.key === 'Tab') {
      closeDriveLetterDropdown();
    }
  });

  document.addEventListener('pointerdown', event => {
    if (!driveLetterField.contains(event.target)) {
      closeDriveLetterDropdown();
    }
  });

  driveLetterOptions.addEventListener('scroll', updateDriveLetterScrollbar);

  window.addEventListener('resize', () => {
    if (driveLetterField.classList.contains('is-open')) {
      positionDriveLetterDropdown();
    }
  });

  window.addEventListener('scroll', () => {
    if (driveLetterField.classList.contains('is-open')) {
      positionDriveLetterDropdown();
    }
  }, true);
}

// Screen management
function showScreen(name) {
  Object.values(screens).forEach(s => s.style.display = 'none');
  if (screens[name]) screens[name].style.display = 'flex';
  content.classList.toggle('is-connect-screen', name === 'connect');
  const footer = document.querySelector('.status-bar');
  if (footer) footer.style.display = name === 'connected' ? 'flex' : 'none';
  const header = headerContent[name];
  if (header) {
    headerTitle.textContent = header.title;
    headerSubtitle.textContent = header.subtitle;
    appHeader.style.display = header.title || header.subtitle ? 'flex' : 'none';
  }
}

function setStatus(text, dotClass) {
  statusText.textContent = text;
  statusDot.className = 'status-dot' + (dotClass ? ' ' + dotClass : '');
}

// Initialize — all sync, no IPC
async function getDependencyState() {
  if (window.vpsConnector.checkDependencies) {
    try {
      return await window.vpsConnector.checkDependencies();
    } catch {}
  }
  return window.vpsConnector.checkDepsLocal();
}

function buildDependencyStatusMessage(deps, options = {}) {
  const missing = [];
  if (!deps.winfspInstalled) missing.push('WinFsp');
  if (!deps.sshfsInstalled) missing.push('SSHFS-Win');

  const installedCount = (deps.winfspInstalled ? 1 : 0) + (deps.sshfsInstalled ? 1 : 0);

  if (installedCount === 2) {
    return options.successMessage || '2/2 installed. Opening app...';
  }

  const missingLabel = missing.length === 1
    ? missing[0]
    : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;

  return `${installedCount}/2 installed. Missing: ${missingLabel}.`;
}

function openConnectScreen() {
  showScreen('connect');
  setStatus('Disconnected', 'red');
  state = 'disconnected';
  populateDriveLetters();
  loadSavedConfig();
}

function applyDependencyState(deps) {
  const winfspItem = document.getElementById('dep-winfsp');
  const sshfsItem = document.getElementById('dep-sshfs');
  const winfspDot = document.querySelector('#dep-winfsp .dep-status');
  const sshfsDot = document.querySelector('#dep-sshfs .dep-status');
  const winfspLink = document.getElementById('link-install-winfsp');
  const sshfsLink = document.getElementById('link-install-sshfs');
  const winfspCommandBtn = document.getElementById('cmd-install-winfsp');
  const sshfsCommandBtn = document.getElementById('cmd-install-sshfs');

  winfspDot.className = 'status-dot ' + (deps.winfspInstalled ? 'green' : 'red');
  sshfsDot.className = 'status-dot ' + (deps.sshfsInstalled ? 'green' : 'red');

  if (deps.winfspInstalled) {
    winfspItem.classList.add('is-installed');
    winfspLink.textContent = 'Installed';
    winfspLink.className = 'btn-install installed';
    winfspLink.setAttribute('aria-disabled', 'true');
    winfspCommandBtn.textContent = 'Install via PowerShell';
    winfspCommandBtn.className = 'btn-install btn-install-secondary is-hidden';
    winfspCommandBtn.disabled = true;
  } else {
    winfspItem.classList.remove('is-installed');
    winfspLink.textContent = 'Download & Install';
    winfspLink.className = 'btn-install';
    winfspLink.removeAttribute('aria-disabled');
    winfspCommandBtn.textContent = 'Install via PowerShell';
    winfspCommandBtn.className = 'btn-install btn-install-secondary';
    winfspCommandBtn.disabled = false;
  }

  if (deps.sshfsInstalled) {
    sshfsItem.classList.add('is-installed');
    sshfsLink.textContent = 'Installed';
    sshfsLink.className = 'btn-install installed';
    sshfsLink.setAttribute('aria-disabled', 'true');
    sshfsCommandBtn.textContent = 'Install via PowerShell';
    sshfsCommandBtn.className = 'btn-install btn-install-secondary is-hidden';
    sshfsCommandBtn.disabled = true;
  } else {
    sshfsItem.classList.remove('is-installed');
    sshfsLink.textContent = 'Download & Install';
    sshfsLink.className = 'btn-install';
    sshfsLink.removeAttribute('aria-disabled');
    sshfsCommandBtn.textContent = 'Install via PowerShell';
    sshfsCommandBtn.className = 'btn-install btn-install-secondary';
    sshfsCommandBtn.disabled = false;
  }
}

function init() {
  return initAsync();
}

async function initAsync() {
  try {
    const deps = await getDependencyState();

    if (deps.winfspInstalled && deps.sshfsInstalled) {
      openConnectScreen();
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
  applyDependencyState(deps);

  // Clear any previous verify message
  const msg = document.getElementById('verify-msg');
  if (msg) msg.style.display = 'none';
}

function populateDriveLetters() {
  try {
    const drives = window.vpsConnector.getAvailableDrivesLocal();
    const letters = drives.length ? drives : ['V:'];
    driveLetterSelect.innerHTML = '';
    letters.forEach(letter => {
      const opt = document.createElement('option');
      opt.value = letter;
      opt.textContent = letter;
      driveLetterSelect.appendChild(opt);
    });
    renderDriveLetterOptions(letters);

    const preferred = letters.includes('V:') ? 'V:' : letters[0];
    setDriveLetterValue(preferred);
  } catch {}
}

function loadSavedConfig() {
  try {
    const config = window.vpsConnector.loadConfigLocal();
    if (!config) return;
    if (config.host) document.getElementById('host').value = config.host;
    if (config.username) document.getElementById('username').value = config.username;
    if (config.port) document.getElementById('port').value = config.port;
    if (config.driveLetter && Array.from(driveLetterSelect.options).some(opt => opt.value === config.driveLetter)) {
      setDriveLetterValue(config.driveLetter);
    }
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
  const el = document.getElementById('verify-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'flex';
}

function clearInstallError() {
  const el = document.getElementById('verify-msg');
  if (el) el.style.display = 'none';
}

function openDependencyLink(event) {
  event.preventDefault();
  clearInstallError();
  if (event.currentTarget.getAttribute('aria-disabled') === 'true') {
    return;
  }

  const url = event.currentTarget.getAttribute('href');
  if (window.vpsConnector.openExternal) {
    window.vpsConnector.openExternal(url);
  }
}

async function runPowerShellInstall(which) {
  clearInstallError();
  const buttonId = which === 'winfsp' ? 'cmd-install-winfsp' : 'cmd-install-sshfs';
  const button = document.getElementById(buttonId);
  const originalText = button.textContent;

  button.disabled = true;
  button.className = 'btn-install installing';
  button.innerHTML = '<span class="spinner-small"></span> Installing...';

  try {
    const result = await window.vpsConnector.installDependency(which);
    if (result.success) {
      showInstallError(result.output || 'Install complete. Restarting app...');
      return;
    }

    button.disabled = false;
    button.className = 'btn-install btn-install-secondary';
    button.textContent = originalText;
    if (!result.success) {
      showInstallError(result.error || 'Install failed.');
    }
  } catch (err) {
    button.disabled = false;
    button.className = 'btn-install btn-install-secondary';
    button.textContent = originalText;
    showInstallError(err.message || 'Install failed.');
  }
}

document.getElementById('link-install-winfsp').addEventListener('click', openDependencyLink);
document.getElementById('link-install-sshfs').addEventListener('click', openDependencyLink);
document.getElementById('cmd-install-winfsp').addEventListener('click', () => runPowerShellInstall('winfsp'));
document.getElementById('cmd-install-sshfs').addEventListener('click', () => runPowerShellInstall('sshfs'));

// Verify Installation — just check the button states on the page
document.getElementById('btn-recheck').addEventListener('click', async () => {
  const recheckBtn = document.getElementById('btn-recheck');

  // Show verifying state with spinner
  recheckBtn.disabled = true;
  recheckBtn.innerHTML = '<span class="spinner-small"></span> Verifying...';

  try {
    await new Promise(resolve => setTimeout(resolve, 150));
    const deps = await getDependencyState();
    applyDependencyState(deps);

    const count = (deps.winfspInstalled ? 1 : 0) + (deps.sshfsInstalled ? 1 : 0);

    if (count === 2) {
      // Both installed — go to connect screen
      showInstallError(buildDependencyStatusMessage(deps));
      recheckBtn.innerHTML = 'All verified';
      recheckBtn.className = 'btn btn-secondary verified';

      setTimeout(() => {
        openConnectScreen();
      }, 800);
    } else {
      showInstallError(buildDependencyStatusMessage(deps));
      recheckBtn.textContent = 'Verify Installation';
      recheckBtn.className = 'btn btn-secondary';
      recheckBtn.disabled = false;
    }
  } catch (err) {
    const fallbackDeps = window.vpsConnector.checkDepsLocal
      ? window.vpsConnector.checkDepsLocal()
      : { winfspInstalled: false, sshfsInstalled: false };
    showInstallError(buildDependencyStatusMessage(fallbackDeps));
    recheckBtn.textContent = 'Verify Installation';
    recheckBtn.className = 'btn btn-secondary';
    recheckBtn.disabled = false;
  }
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
    remotePath: '/',
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
  if (disabled) {
    closeDriveLetterDropdown();
  }
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
    document.getElementById('connected-path').textContent = 'This PC';
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
initInfoTips();
initDriveLetterDropdown();
init();
