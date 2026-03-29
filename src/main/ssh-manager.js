const { Client } = require('ssh2');
const fs = require('fs');

const ERROR_MESSAGES = {
  ECONNREFUSED: 'Connection refused. Check host and port.',
  ENOTFOUND: 'Host not found. Check the hostname/IP address.',
  ETIMEDOUT: 'Connection timed out. Host may be unreachable.',
  EHOSTUNREACH: 'Host unreachable. Check your network connection.',
  ECONNRESET: 'Connection reset by server.',
};

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

    conn.on('error', (err) => {
      clearTimeout(timeout);
      const friendlyMsg = ERROR_MESSAGES[err.code] || err.message;
      if (err.level === 'client-authentication') {
        reject(new Error('Authentication failed. Check your username and password/key.'));
      } else {
        reject(new Error(friendlyMsg));
      }
    });

    const config = {
      host,
      port: parseInt(port) || 22,
      username,
      readyTimeout: 10000,
    };

    if (authMethod === 'password') {
      config.password = password;
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
