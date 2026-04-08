# Contributing to VPS Mount

Thank you for your interest in contributing! VPS Mount is open source and welcomes contributions from the community.

## Development Setup

### Prerequisites

- **Node.js 18+** — [download from nodejs.org](https://nodejs.org/)
- **npm** — comes with Node.js
- **Windows 10/11 (x64)** — VPS Mount is Windows-only

### Get Started

1. Clone the repository:
   ```bash
   git clone https://github.com/cleaneramade/vps-mount.git
   cd vps-mount
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the dev app:
   ```bash
   npm start
   ```
   Or with dev logging enabled (writes debug log to `%TEMP%\vps-install-debug.log`):
   ```bash
   npm run dev
   ```

4. Build the Windows installer:
   ```bash
   npm run build
   ```
   The installer will be in `dist/`.

## Project Structure

- `src/main/` — Electron main process code
  - `main.js` — app lifecycle, window creation
  - `ipc-handlers.js` — all IPC channel definitions
  - `ssh-manager.js` — SSH connection testing
  - `sshfs-manager.js` — SSHFS process mounting/unmounting
  - `drive-utils.js` — Windows drive letter enumeration
  - `dependency-checker.js` — WinFsp and SSHFS-Win detection
  - `tray-manager.js` — system tray icon and context menu
- `src/preload/` — Electron preload script that bridges main and renderer
- `src/renderer/` — UI (HTML, CSS, JavaScript)
- `assets/` — app icon source and generated icons
- `scripts/` — build utilities

## Making Changes

### Small Fixes

For typos, minor bug fixes, or small cleanups:
1. Make your change
2. Test locally with `npm start`
3. Commit with a clear message
4. Open a pull request

### Larger Features

For substantial features or architectural changes:
1. Open an issue to discuss the idea first
2. Once agreed, implement on a feature branch
3. Keep commits logical and well-described
4. Test thoroughly with `npm start`
5. Open a pull request with context on why this change is needed

## Updating Dependency Installer URLs

VPS Mount doesn't bundle the WinFsp and SSHFS-Win installers. Instead, the **Install via PowerShell** option downloads them from GitHub release URLs hard-coded in `src/main/ipc-handlers.js`. To point at newer versions:

1. Find the new version URLs on GitHub:
   - [WinFsp releases](https://github.com/winfsp/winfsp/releases)
   - [SSHFS-Win releases](https://github.com/winfsp/sshfs-win/releases)

2. Update the URLs and filenames in `src/main/ipc-handlers.js`:
   ```javascript
   const INSTALLERS = {
     winfsp: {
       url: 'https://github.com/winfsp/winfsp/releases/download/v2.x/winfsp-2.x.xxxxx.msi',
       fileName: 'winfsp-2.x.xxxxx.msi',
       // ...
     },
     sshfs: {
       url: 'https://github.com/winfsp/sshfs-win/releases/download/v3.x.xxxxx/sshfs-win-3.x.xxxxx-x64.msi',
       fileName: 'sshfs-win-3.x.xxxxx-x64.msi',
       // ...
     },
   };
   ```

3. Update `README.md` to reflect the new versions in the Prerequisites section

4. Test the installation flow locally with `npm start` > Check Dependencies > Try to install

## Security Considerations

- VPS Mount disables SSH host key verification (`StrictHostKeyChecking=no`) for usability. This is documented in `README.md` and the code. Do not add automatic host key acceptance via `known_hosts` without explicitly making this a user choice.
- Passwords are **never** saved — only the hostname, port, username, auth method, and key file path are persisted to `%APPDATA%\vps-mount\config.json`. See `src/main/ipc-handlers.js` `saveConfig()`.
- No credentials, tokens, or keys are logged, even in debug mode.

## Code Style

- Use **camelCase** for variables and functions
- Use **UPPER_CASE** for constants
- Prefer clear, descriptive names over abbreviations
- Add comments only where the logic is non-obvious
- Keep functions focused and reasonably sized

## Testing

There are currently no automated tests. Before submitting a PR:

1. Test the app with `npm start`
2. Verify the three screens work:
   - **Setup Screen**: appears if WinFsp or SSHFS-Win is missing
   - **Connect Screen**: form validation, drive letter picker, key file selector
   - **Connected Screen**: mount/unmount toggle, open in explorer, remove device
3. Test on a clean machine if possible (to catch missing dependencies)

## Commit Messages

Use clear, imperative commit messages:
- Good: `Fix SSHFS process health check timeout`
- Good: `Add security note about host key verification`
- Avoid: `Fixed stuff`, `updates`, `work in progress`

## Opening a Pull Request

1. Use a descriptive title (under 70 characters)
2. Reference any related issues: `Fixes #123`
3. Describe what changed and why
4. Note any testing you've done

## Questions?

Open an issue with the `question` label, or reach out on X: [@cleaneramade](https://x.com/cleaneramade.com).

## Code of Conduct

This project values respectful collaboration. Be kind, constructive, and considerate.
