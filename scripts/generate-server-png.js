// Renders just the server rack as a standalone transparent PNG — no glow, no shadow bleed, perfectly centered
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const SIZE = 1024;
const ASSETS = path.join(__dirname, '..', 'assets');

// All content drawn inside a tight bounding box, then viewBox set to exactly that box
// so SVG scales to fill the canvas with equal padding on all sides.
//
// Content bounds:  x: 54..430  (width 376)   y: 0..298  (height 298)
// We use viewBox that matches the content exactly — the browser then centers it.
const SERVER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 376 298" width="376" height="298">
  <defs>
    <linearGradient id="sf1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3d3578"/>
      <stop offset="100%" stop-color="#262058"/>
    </linearGradient>
    <linearGradient id="sf2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#352e6e"/>
      <stop offset="100%" stop-color="#222050"/>
    </linearGradient>
    <linearGradient id="sf3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2e2862"/>
      <stop offset="100%" stop-color="#1e1a48"/>
    </linearGradient>

    <radialGradient id="lg" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#a6e3a1"/>
      <stop offset="40%" stop-color="#a6e3a1" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#a6e3a1" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="lb" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#6a4dff"/>
      <stop offset="40%" stop-color="#6a4dff" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#6a4dff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Unit 1: y=0..90 -->
  <rect x="0" y="0" width="376" height="90" rx="16" fill="url(#sf1)" stroke="#4a4290" stroke-width="2"/>
  <rect x="28" y="22" width="44" height="46" rx="7" fill="#151235" stroke="#2a2460" stroke-width="1.5"/>
  <rect x="80" y="22" width="44" height="46" rx="7" fill="#151235" stroke="#2a2460" stroke-width="1.5"/>
  <rect x="132" y="22" width="44" height="46" rx="7" fill="#151235" stroke="#2a2460" stroke-width="1.5"/>
  <line x1="200" y1="25" x2="320" y2="25" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="200" y1="36" x2="320" y2="36" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="200" y1="47" x2="320" y2="47" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="200" y1="58" x2="320" y2="58" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="348" cy="33" r="7" fill="#a6e3a1" opacity="0.95"/>
  <circle cx="348" cy="33" r="11" fill="url(#lg)" opacity="0.45"/>
  <circle cx="348" cy="57" r="6" fill="#6a4dff" opacity="0.9"/>
  <circle cx="348" cy="57" r="10" fill="url(#lb)" opacity="0.35"/>

  <!-- Unit 2: y=104..194 -->
  <rect x="0" y="104" width="376" height="90" rx="16" fill="url(#sf2)" stroke="#3e3880" stroke-width="2"/>
  <rect x="28" y="126" width="44" height="46" rx="7" fill="#151235" stroke="#2a2460" stroke-width="1.5"/>
  <rect x="80" y="126" width="44" height="46" rx="7" fill="#151235" stroke="#2a2460" stroke-width="1.5"/>
  <rect x="132" y="126" width="44" height="46" rx="7" fill="#151235" stroke="#2a2460" stroke-width="1.5"/>
  <line x1="200" y1="129" x2="320" y2="129" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="200" y1="140" x2="320" y2="140" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="200" y1="151" x2="320" y2="151" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="200" y1="162" x2="320" y2="162" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="348" cy="137" r="7" fill="#a6e3a1" opacity="0.95"/>
  <circle cx="348" cy="137" r="11" fill="url(#lg)" opacity="0.45"/>
  <circle cx="348" cy="161" r="6" fill="#6a4dff" opacity="0.9"/>
  <circle cx="348" cy="161" r="10" fill="url(#lb)" opacity="0.35"/>

  <!-- Unit 3: y=208..298 -->
  <rect x="0" y="208" width="376" height="90" rx="16" fill="url(#sf3)" stroke="#342e72" stroke-width="2"/>
  <rect x="28" y="230" width="44" height="46" rx="7" fill="#151235" stroke="#2a2460" stroke-width="1.5"/>
  <rect x="80" y="230" width="44" height="46" rx="7" fill="#151235" stroke="#2a2460" stroke-width="1.5"/>
  <rect x="132" y="230" width="44" height="46" rx="7" fill="#151235" stroke="#2a2460" stroke-width="1.5"/>
  <line x1="200" y1="233" x2="320" y2="233" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="200" y1="244" x2="320" y2="244" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="200" y1="255" x2="320" y2="255" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="200" y1="266" x2="320" y2="266" stroke="#2a2460" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="348" cy="241" r="7" fill="#a6e3a1" opacity="0.95"/>
  <circle cx="348" cy="241" r="11" fill="url(#lg)" opacity="0.45"/>
  <circle cx="348" cy="265" r="6" fill="#6a4dff" opacity="0.9"/>
  <circle cx="348" cy="265" r="10" fill="url(#lb)" opacity="0.35"/>
</svg>
`;

// Render at exactly 512x512 CSS pixels (Electron captures at 1x since we disable HW accel)
// Then the output is 512x512 PNG — clean and centered.
const RENDER = 512;
// Server should fill ~65% of the canvas width, leaving ~17.5% padding on each side
const serverW = Math.round(RENDER * 0.65);  // ~333px
const serverH = Math.round(serverW * (298 / 376)); // maintain aspect ratio ~264px
const offsetX = Math.round((RENDER - serverW) / 2);
const offsetY = Math.round((RENDER - serverH) / 2);

const HTML = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  body {
    width: ${RENDER}px;
    height: ${RENDER}px;
    overflow: hidden;
    background: transparent;
    position: relative;
  }
  svg {
    position: absolute;
    left: ${offsetX}px;
    top: ${offsetY}px;
    width: ${serverW}px;
    height: ${serverH}px;
  }
</style></head><body>${SERVER_SVG}</body></html>`;

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: RENDER,
    height: RENDER,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true },
  });

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(HTML));

  win.webContents.on('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 500));
    const image = await win.webContents.capturePage();
    // Upscale to 1024 for high res
    const upscaled = image.resize({ width: 1024, height: 1024, quality: 'best' });
    const pngBuffer = upscaled.toPNG();
    fs.writeFileSync(path.join(ASSETS, 'server.png'), pngBuffer);
    console.log('Generated assets/server.png (1024x1024)');
    app.quit();
  });
});
