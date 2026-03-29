// Generates icon.png and icon.ico from the server-only SVG design
// Server centered on transparent background, same as server.png but with proper ICO sizes
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');

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

  <!-- Unit 1 -->
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

  <!-- Unit 2 -->
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

  <!-- Unit 3 -->
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

// Render at 512x512 with server centered and padded
const RENDER = 512;
const SVG_W = 376, SVG_H = 298;
const PAD = 60;
const maxDim = RENDER - PAD * 2;
const scale = Math.min(maxDim / SVG_W, maxDim / SVG_H);
const renderW = Math.round(SVG_W * scale);
const renderH = Math.round(SVG_H * scale);
const offsetX = Math.round((RENDER - renderW) / 2);
const offsetY = Math.round((RENDER - renderH) / 2);

const HTML = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  body { width: ${RENDER}px; height: ${RENDER}px; overflow: hidden; background: transparent; position: relative; }
  svg { position: absolute; left: ${offsetX}px; top: ${offsetY}px; width: ${renderW}px; height: ${renderH}px; }
</style></head><body>${SERVER_SVG}</body></html>`;

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: RENDER, height: RENDER, show: false, frame: false, transparent: true,
    webPreferences: { offscreen: true },
  });

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(HTML));

  win.webContents.on('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 500));
    const image = await win.webContents.capturePage();

    // Save full-size PNG
    fs.writeFileSync(path.join(ASSETS, 'icon.png'), image.toPNG());

    // Build multi-size ICO
    const sizes = [256, 128, 64, 48, 32, 16];
    const entries = sizes.map(s => image.resize({ width: s, height: s, quality: 'best' }).toPNG());
    fs.writeFileSync(path.join(ASSETS, 'icon.ico'), buildIco(entries, sizes));

    console.log('Generated assets/icon.png and assets/icon.ico (server design)');
    app.quit();
  });
});

function buildIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  let offset = 6 + 16 * count;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4);
  const dirs = pngBuffers.map((buf, i) => {
    const e = Buffer.alloc(16);
    e[0] = sizes[i] >= 256 ? 0 : sizes[i]; e[1] = sizes[i] >= 256 ? 0 : sizes[i];
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8); e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });
  return Buffer.concat([header, ...dirs, ...pngBuffers]);
}
