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
const appShell = document.querySelector('.app');
const content = document.querySelector('.content');
const headerTitle = document.getElementById('app-header-title');
const headerSubtitle = document.getElementById('app-header-subtitle');
const connectedDeviceCard = document.getElementById('connected-device-card');
const deviceHeadingTitle = document.getElementById('device-heading-title');
const deviceHeadingSubtitle = document.getElementById('device-heading-subtitle');
const deviceStatusLabel = document.getElementById('device-status-label');
const deviceStatusCopy = document.getElementById('device-status-copy');
const powerToggleButton = document.getElementById('btn-power-toggle');
const powerActionButton = document.getElementById('btn-power-action');
const explorerButton = document.getElementById('btn-explorer');
const removeDeviceButton = document.getElementById('btn-remove-device');

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
const authMethodInfo = document.getElementById('auth-method-info');
const passwordFieldNote = document.getElementById('password-field-note');
const keyFieldNote = document.getElementById('key-field-note');
const passwordInfoBubble = document.getElementById('password-info-bubble');
const keyInfoBubble = document.getElementById('key-info-bubble');
const portInput = document.getElementById('port');
const driveLetterSelect = document.getElementById('drive-letter');
const driveLetterField = document.querySelector('.drive-letter-field');
const driveLetterTrigger = document.getElementById('drive-letter-trigger');
const driveLetterValue = document.getElementById('drive-letter-value');
const driveLetterMenu = document.getElementById('drive-letter-menu');
const driveLetterOptions = document.getElementById('drive-letter-options');
const driveLetterScrollbar = document.querySelector('.drive-letter-scrollbar');
const driveLetterScrollbarThumb = document.getElementById('drive-letter-scrollbar-thumb');

function updateAuthUI(method) {
  authButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.auth === method);
  });

  passwordGroup.style.display = method === 'password' ? 'block' : 'none';
  keyGroup.style.display = method === 'key' ? 'block' : 'none';

  if (method === 'key') {
    authMethodInfo.textContent = 'Use your private key file on this tab.';
    passwordFieldNote.textContent = 'when using Password';
    keyFieldNote.textContent = 'when using SSH Key';
    passwordInfoBubble.textContent = 'Enter the SSH password for this VPS account. This field is only used on the Password tab.';
    keyInfoBubble.textContent = 'Select the private key file you use for SSH login. Passwords are not used on the SSH Key tab.';
    return;
  }

  authMethodInfo.textContent = 'Use your SSH account password on this tab.';
  passwordFieldNote.textContent = 'when using Password';
  keyFieldNote.textContent = 'when using SSH Key';
  passwordInfoBubble.textContent = 'Enter the SSH password for this VPS account. SSH key files are only used on the SSH Key tab.';
  keyInfoBubble.textContent = 'Select the private key file you use for SSH login. This is only required on the SSH Key tab.';
}

authButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    updateAuthUI(btn.dataset.auth);
  });
});

updateAuthUI('password');

portInput.addEventListener('input', () => {
  portInput.value = portInput.value.replace(/\D/g, '').slice(0, 5);
});

const infoTips = Array.from(document.querySelectorAll('.info-tip'));
let activeInfoTip = null;
let deviceConfig = null;
let deviceMounted = false;

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
  appShell.classList.toggle('is-connected-screen', name === 'connected');
  content.classList.toggle('is-connect-screen', name === 'connect');
  const footer = document.querySelector('.status-bar');
  if (footer) footer.style.display = 'none';
  const header = headerContent[name];
  if (header) {
    headerTitle.textContent = header.title;
    headerSubtitle.textContent = header.subtitle;
    appHeader.style.display = name === 'connected' ? 'none' : (header.title || header.subtitle ? 'flex' : 'none');
  }
}

function setStatus(text, dotClass) {
  statusText.textContent = text;
  statusDot.className = 'status-dot' + (dotClass ? ' ' + dotClass : '');
}

function setDeviceButtonsDisabled(disabled) {
  powerToggleButton.disabled = disabled;
  powerActionButton.disabled = disabled;
  removeDeviceButton.disabled = disabled;
}

function renderDeviceScreen(message) {
  if (!deviceConfig) return;

  connectedDeviceCard.classList.toggle('is-mounted', deviceMounted);
  connectedDeviceCard.classList.toggle('is-unmounted', !deviceMounted);

  if (deviceMounted) {
    deviceHeadingTitle.textContent = 'Connector Ready';
    deviceHeadingSubtitle.textContent = 'Your VPS is mounted and ready to browse';
    deviceStatusLabel.textContent = 'Mounted';
    deviceStatusCopy.textContent = message || 'Click Dismount to safely unmount it.';
    powerActionButton.textContent = 'Dismount';
    explorerButton.disabled = false;
  } else {
    deviceHeadingTitle.textContent = 'Ready to Reconnect';
    deviceHeadingSubtitle.textContent = 'Your VPS is disconnected but ready to mount again';
    deviceStatusLabel.textContent = 'Ready to Mount';
    deviceStatusCopy.textContent = message || 'Click Mount to reconnect it.';
    powerActionButton.textContent = 'Mount';
    explorerButton.disabled = true;
  }
}

async function connectDevice(config, options = {}) {
  const { showFooterError = false, preserveDeviceScreen = false } = options;
  clearError();

  if (showFooterError) {
    showScreen('connect');
  }

  state = 'connecting';
  setStatus('Testing SSH connection...', 'yellow pulse');

  if (showFooterError) {
    setFormDisabled(true);
    document.getElementById('btn-connect').innerHTML = '<div class="spinner"></div> Connecting...';
  } else {
    setDeviceButtonsDisabled(true);
    powerActionButton.innerHTML = '<div class="spinner"></div> Connecting...';
  }

  try {
    const result = await window.vpsConnector.connect(config);
    deviceConfig = result.config || config;
    deviceMounted = true;
    state = 'connected';
    renderDeviceScreen();
    showScreen('connected');
    setStatus(`Connected to ${deviceConfig.host}`, 'green');
  } catch (err) {
    deviceMounted = false;
    const formatted = formatConnectError(err);
    if (showFooterError) {
      showError(formatted);
    } else if (preserveDeviceScreen && deviceConfig) {
      renderDeviceScreen(formatted);
      showScreen('connected');
    }
    state = 'disconnected';
    setStatus('Connection failed', 'red');
    throw err;
  } finally {
    if (showFooterError) {
      setFormDisabled(false);
      document.getElementById('btn-connect').innerHTML = 'Connect';
    } else {
      setDeviceButtonsDisabled(false);
      renderDeviceScreen(deviceStatusCopy.textContent);
    }
  }
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
  resetConnectForm();
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
      updateAuthUI('key');
      if (config.keyFilePath) document.getElementById('keyfile').value = config.keyFilePath;
    } else {
      updateAuthUI('password');
    }
  } catch {}
}

function resetConnectForm() {
  document.getElementById('host').value = '';
  document.getElementById('username').value = '';
  document.getElementById('port').value = '22';
  document.getElementById('password').value = '';
  document.getElementById('keyfile').value = '';
  updateAuthUI('password');

  const defaultDrive = Array.from(driveLetterSelect.options).some(opt => opt.value === 'V:')
    ? 'V:'
    : driveLetterSelect.options[0]?.value;
  if (defaultDrive) {
    setDriveLetterValue(defaultDrive);
  }

  clearError();
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
  if (!config.host) return 'Enter your VPS host or IP address before connecting.';
  if (!config.username) return 'Enter the SSH username for this VPS before connecting.';
  if (config.authMethod === 'password' && !config.password) return 'Enter the SSH password for this VPS account before connecting.';
  if (config.authMethod === 'key' && !config.keyFilePath) return 'Select the SSH private key file you want to use before connecting.';
  const port = parseInt(config.port);
  if (isNaN(port) || port < 1 || port > 65535) return 'Enter a valid SSH port between 1 and 65535 before connecting.';
  return null;
}

function formatConnectError(err) {
  const rawMessage = ((err && err.message) ? err.message : 'Connection failed')
    .replace(/^Error invoking remote method 'connect':\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();

  if (/getaddrinfo\s+EAI_FAIL/i.test(rawMessage) || /hostname could not be resolved/i.test(rawMessage)) {
    return 'Connection failed: the VPS hostname could not be resolved. Check the server address and remove any ssh:// prefix.';
  }

  if (/getaddrinfo\s+EAI_AGAIN/i.test(rawMessage)) {
    return 'Connection failed: DNS lookup for the VPS did not complete. Check the server address and try again.';
  }

  if (/authentication failed/i.test(rawMessage)) {
    const authMethod = deviceConfig?.authMethod || document.querySelector('.auth-btn.active')?.dataset.auth || 'password';
    return authMethod === 'key'
      ? 'Auth failed. Check username and SSH key.'
      : 'Auth failed. Check username and password.';
  }

  if (/connection timed out/i.test(rawMessage) || /timed out/i.test(rawMessage)) {
    return 'Connection failed: the VPS did not respond in time. Check the host, port, firewall, and network access.';
  }

  if (/connection refused/i.test(rawMessage)) {
    return 'Connection failed: the VPS refused the SSH connection. Check that SSH is running and the port is correct.';
  }

  if (/drive letter is already in use/i.test(rawMessage)) {
    return 'Connection failed: the selected Windows drive letter is already in use. Choose a different one and try again.';
  }

  if (/ssh key file not found/i.test(rawMessage) || /cannot read key file/i.test(rawMessage)) {
    return 'Connection failed: the selected SSH key file could not be read. Check the file path and try again.';
  }

  return rawMessage ? `Connection failed: ${rawMessage}` : 'Connection failed. Check your VPS details and try again.';
}

function showError(msg) {
  const el = document.getElementById('connect-error-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError() {
  const el = document.getElementById('connect-error-msg');
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
  const config = getFormConfig();
  const error = validateForm(config);
  if (error) {
    showError(error);
    return;
  }

  try {
    await connectDevice(config, { showFooterError: true });
  } catch (err) {
    // Footer error is already shown in connectDevice.
  }
});

async function toggleDeviceMount() {
  if (!deviceConfig) return;

  if (deviceMounted) {
    state = 'disconnecting';
    setDeviceButtonsDisabled(true);
    powerActionButton.innerHTML = '<div class="spinner"></div> Dismounting...';
    setStatus('Dismounting...', 'yellow pulse');

    try {
      await window.vpsConnector.disconnect();
      deviceMounted = false;
      renderDeviceScreen('Click Mount to reconnect it.');
      setStatus('Disconnected', 'red');
    } finally {
      setDeviceButtonsDisabled(false);
      renderDeviceScreen();
      state = 'disconnected';
    }

    return;
  }

  try {
    await connectDevice(deviceConfig, { preserveDeviceScreen: true });
  } catch {
    // Device screen already shows the error context.
  }
}

powerToggleButton.addEventListener('click', toggleDeviceMount);
powerActionButton.addEventListener('click', toggleDeviceMount);

// Open in Explorer
explorerButton.addEventListener('click', () => {
  const drive = deviceConfig?.driveLetter;
  if (drive && window.vpsConnector.openExplorer) {
    window.vpsConnector.openExplorer(drive);
  }
});

removeDeviceButton.addEventListener('click', async () => {
  if (deviceMounted) {
    try {
      await window.vpsConnector.disconnect();
    } catch {}
  }

  if (window.vpsConnector.clearConfigLocal) {
    window.vpsConnector.clearConfigLocal();
  }

  deviceMounted = false;
  deviceConfig = null;
  resetConnectForm();
  clearError();
  try {
    const deps = await getDependencyState();
    if (deps.winfspInstalled && deps.sshfsInstalled) {
      openConnectScreen();
    } else {
      showSetupScreen(deps);
    }
  } catch {
    openConnectScreen();
  }
  setStatus('Disconnected', 'red');
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
    deviceMounted = false;
    if (deviceConfig) {
      renderDeviceScreen('Click Mount to reconnect it.');
      showScreen('connected');
    } else {
      showScreen('connect');
    }
    setStatus('Connection lost: ' + reason, 'red');
  });
}

// Start
initInfoTips();
initDriveLetterDropdown();
init();
