// Smoke test: boots the app and verifies the renderer fully initialized —
// preload bridge exposed, version label set, UI rendered, no preload errors.
//
//   npm run smoke            -> tests working-tree sources
//   npm run smoke:packaged   -> tests dist/win-unpacked/resources/app.asar
//                               (run "npm run build" first)
//
// This guards against regressions like sandboxed-preload require failures,
// which produce a blank window only detectable by actually booting the app.
const { app, BrowserWindow } = require('electron');
const path = require('path');

const packaged = process.argv.includes('--packaged');
const root = packaged
  ? path.join(__dirname, '..', 'dist', 'win-unpacked', 'resources', 'app.asar')
  : path.join(__dirname, '..');
const expectedVersion = require(path.join(root, 'package.json')).version;

const preloadErrors = [];
const consoleErrors = [];

require(path.join(root, 'src', 'main', 'main.js'));

app.on('web-contents-created', (_event, wc) => {
  wc.on('preload-error', (_e, preloadPath, err) => {
    preloadErrors.push(`${preloadPath}: ${err.message}`);
  });
  wc.on('console-message', (_e, level, message) => {
    if (level >= 3) consoleErrors.push(message);
  });
});

app.whenReady().then(() => {
  setTimeout(async () => {
    let exitCode = 1;
    try {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) throw new Error('No window was created');

      const result = await win.webContents.executeJavaScript(`({
        hasBridge: typeof window.vpsMount !== 'undefined',
        versionText: (document.getElementById('app-version') || {}).textContent || null,
        bodyHasContent: document.body.innerText.trim().length > 50,
      })`);

      console.log(`TARGET: ${packaged ? 'packaged asar' : 'working tree'} (v${expectedVersion})`);
      console.log('RESULT: ' + JSON.stringify(result));
      console.log('PRELOAD ERRORS: ' + JSON.stringify(preloadErrors));
      console.log('CONSOLE ERRORS: ' + JSON.stringify(consoleErrors));

      const pass = result.hasBridge
        && result.versionText === `Version ${expectedVersion}`
        && result.bodyHasContent
        && preloadErrors.length === 0;
      console.log(pass ? 'SMOKE TEST PASSED' : 'SMOKE TEST FAILED');
      exitCode = pass ? 0 : 1;
    } catch (err) {
      console.log('SMOKE TEST FAILED: ' + err.message);
    }
    app.exit(exitCode);
  }, 4000);
});
