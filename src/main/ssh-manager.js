const { Client } = require('ssh2');
const fs = require('fs');

const ERROR_MESSAGES = {
  ECONNREFUSED: 'The VPS refused the SSH connection. Check that SSH is running and the port is correct.',
  ENOTFOUND: 'The VPS hostname could not be found. Check the server address and try again.',
  EAI_FAIL: 'The VPS hostname could not be resolved. Check the server address and remove any ssh:// prefix.',
  EAI_AGAIN: 'DNS lookup failed while reaching the VPS. Check the server address and try again.',
  ETIMEDOUT: 'The SSH connection timed out. Verify the host, port, firewall, and network access.',
  EHOSTUNREACH: 'The VPS is unreachable from this device. Check your network access and firewall rules.',
  ECONNRESET: 'The SSH connection was reset by the server during login.',
};

function formatConnectionError(err) {
  if (err.level === 'client-authentication') {
    return 'Authentication failed. Check your SSH username and password or key file.';
  }

  if (ERROR_MESSAGES[err.code]) {
    return ERROR_MESSAGES[err.code];
  }

  const rawMessage = (err && err.message ? err.message : '').trim();

  if (/getaddrinfo\s+EAI_FAIL/i.test(rawMessage) || /dns/i.test(rawMessage)) {
    return ERROR_MESSAGES.EAI_FAIL;
  }

  if (/getaddrinfo\s+EAI_AGAIN/i.test(rawMessage)) {
    return ERROR_MESSAGES.EAI_AGAIN;
  }

  if (/all configured authentication methods failed/i.test(rawMessage)) {
    return 'Authentication failed. Check your SSH username and password or key file.';
  }

  if (/timed out/i.test(rawMessage)) {
    return ERROR_MESSAGES.ETIMEDOUT;
  }

  return rawMessage || 'The SSH connection failed before the VPS could be reached.';
}

function testConnection({ host, port, username, authMethod, password, keyFilePath }) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error('Connection timed out after 10 seconds'));
    }, 10000);

    conn.on('ready', () => {
      clearTimeout(timeout);
      conn.end();
      resolve({ success: true });
    });

    conn.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => {
      if (authMethod !== 'password') {
        finish([]);
        return;
      }

      // Some VPS providers accept password login only through keyboard-interactive.
      const answers = prompts.map(() => password || '');
      finish(answers);
    });

    conn.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(formatConnectionError(err)));
    });

    const config = {
      host,
      port: parseInt(port) || 22,
      username,
      readyTimeout: 10000,
    };

    if (authMethod === 'password') {
      config.password = password;
      config.tryKeyboard = true;
    } else {
      try {
        config.privateKey = fs.readFileSync(keyFilePath);
      } catch (err) {
        clearTimeout(timeout);
        reject(new Error(`Cannot read key file: ${err.message}`));
        return;
      }
    }

    conn.connect(config);
  });
}

module.exports = { testConnection };
