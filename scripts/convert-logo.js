// Converts assets/VPS Mount.png into icon.png (512px) and icon.ico (multi-size)
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const LOGO_PATH = path.join(ASSETS, 'VPS Mount.png');

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  const logo = nativeImage.createFromPath(LOGO_PATH);
  const size = logo.getSize();
  console.log(`Source: ${size.width}x${size.height}`);

  // Save 512px icon.png
  const icon512 = logo.resize({ width: 512, height: 512, quality: 'best' });
  fs.writeFileSync(path.join(ASSETS, 'icon.png'), icon512.toPNG());
  console.log('Saved icon.png (512x512)');

  // Build multi-size ICO (256 is max for ICO)
  const sizes = [256, 128, 64, 48, 32, 16];
  const entries = sizes.map(s => logo.resize({ width: s, height: s, quality: 'best' }).toPNG());
  fs.writeFileSync(path.join(ASSETS, 'icon.ico'), buildIco(entries, sizes));
  console.log('Saved icon.ico (multi-size)');

  app.quit();
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
