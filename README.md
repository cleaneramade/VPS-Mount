## VPS Mount

Electron app for mounting a VPS filesystem as a Windows drive letter through SSHFS.

### Project Layout

- `src/main/` main-process code, tray logic, SSHFS mounting, IPC
- `src/preload/` preload bridge exposed to the renderer
- `src/renderer/` UI files for the app window
- `assets/VPS Mount.png` source artwork for the app icon
- `assets/icon.png` generated PNG app icon
- `assets/icon.ico` generated Windows app icon used by Electron Builder
- `scripts/convert-logo.js` regenerates `icon.png` and `icon.ico` from `assets/VPS Mount.png`
- `dist/` generated build output, with `VPS Mount Setup 1.0.0.exe` as the main installer

### Common Commands

```powershell
npm run start
npm run build:icon
npm run build
```

### Icon Workflow

1. Replace `assets/VPS Mount.png` with the new artwork.
2. Run `npm run build:icon`.
3. Run `npm run build`.

The packaged Windows app and installer both use `assets/icon.ico`.
