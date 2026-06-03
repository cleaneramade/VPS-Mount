<div align="center">

<img src="assets/VPS Mount.png" alt="VPS Mount logo" width="120" />

# VPS Mount

**Mount any Linux VPS as a Windows drive letter — like plugging in a USB drive.**

No command line. No SFTP clients. Your server, right in File Explorer.

[![Latest Release](https://img.shields.io/github/v/release/cleaneramade/VPS-Mount?label=download&color=7c5cff)](https://github.com/cleaneramade/VPS-Mount/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/cleaneramade/VPS-Mount/total?color=7c5cff)](https://github.com/cleaneramade/VPS-Mount/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011%20(x64)-0078d6)](#requirements)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[**Download**](https://github.com/cleaneramade/VPS-Mount/releases/latest) · [Quick Start](#quick-start) · [Reliability](#built-to-stay-connected) · [Security](#security-notes) · [Troubleshooting](#troubleshooting)

</div>

---

## What is VPS Mount?

VPS Mount is a Windows desktop app that turns any SSH-accessible Linux server into a local drive letter. Open, edit, and drag-and-drop remote files exactly like local ones — in File Explorer, your IDE, or any other app. Built for developers, sysadmins, and anyone who wants their VPS to feel like a disk plugged into their PC.

Under the hood it drives [SSHFS-Win](https://github.com/winfsp/sshfs-win) and [WinFsp](https://github.com/winfsp/winfsp) — the same battle-tested stack used across the industry — wrapped in a clean GUI with guided setup, so you never have to touch a terminal.

## Features

| | |
|---|---|
| 🖱️ **Mount in clicks** | Enter host, user, and credentials — get a drive letter (Z:, Y:, …) in File Explorer |
| 🔁 **Auto-reconnect** | Connection drops are detected and healed automatically — the mount comes back on its own |
| 🛡️ **Frozen-mount watchdog** | Detects "zombie" mounts (drive frozen but process alive) and restores them without your help |
| 🔑 **Password & SSH key auth** | Use whichever your server supports — keys get seamless in-channel reconnects |
| 🧰 **Guided dependency setup** | Detects missing WinFsp / SSHFS-Win and walks you through installing them |
| 📌 **System tray integration** | Mount status, reconnect progress, and quick unmount at a glance |
| 💾 **Remembers your last connection** | Host, port, username, and drive letter pre-filled next launch — passwords are **never** saved |

## What's New in v1.2.0

This release is all about **connection persistence** — fixing the disconnects that could interrupt large file transfers:

- **SSH keepalives** (`ServerAliveInterval`/`ServerAliveCountMax`/`TCPKeepAlive`) keep sessions alive through NAT and firewall idle timeouts — the #1 cause of drops during long transfers
- **In-channel reconnect** for SSH key auth: a dropped SSH channel is repaired in place, without the drive ever disappearing
- **Automatic remount** with exponential backoff (up to 10 attempts) if the SSHFS process dies — works for both password and key auth
- **Zombie-mount watchdog**: the app now probes the drive itself, not just the process — a frozen mount is detected within ~1 minute and restored automatically
- **Live reconnect status** in the app and tray: *Reconnecting… → Connected* — you always know what's happening

See the [release notes](https://github.com/cleaneramade/VPS-Mount/releases/tag/v1.2.0) for full details.

## Quick Start

### 1. Install

1. Download the latest `VPS Mount Setup <version>.exe` from the [Releases page](https://github.com/cleaneramade/VPS-Mount/releases/latest).
2. Run the installer and follow the prompts.
3. On first launch, VPS Mount checks for **WinFsp** and **SSHFS-Win**. If either is missing, the setup screen offers two options per dependency:
   - **Download & Install** — opens the official GitHub release page so you can run the MSI yourself.
   - **Install via PowerShell** — downloads and silently installs the MSI for you (you approve the UAC prompt).

### 2. Mount your VPS

1. Launch **VPS Mount**.
2. Click **Add Device** and enter your server's host, port, username, and password or SSH key.
3. Pick a drive letter and click **Connect**.
4. Open **File Explorer** — your VPS is now a local drive.
5. To disconnect, click **Unmount** in the app or right-click the tray icon.

> **Tip:** Prefer **SSH key authentication**. Key-based mounts get sshfs's built-in in-channel reconnect, so a network blip stalls transfers for a few seconds instead of interrupting them.

## Built to Stay Connected

VPS Mount layers four defenses so the mount survives real-world networks:

1. **Keepalives** — the SSH session pings the server every 15s so NAT gateways and firewalls never see it as idle. Tolerances are tuned generously (~2 min) so a pipe saturated by a large transfer is never mistaken for a dead link.
2. **In-channel reconnect** (key auth) — sshfs re-establishes a dropped SSH channel transparently; the drive letter never disappears.
3. **Zombie-mount watchdog** — the app probes the mounted drive every 5 seconds. If the drive stops responding while the process lives on, it's force-restarted automatically.
4. **Auto-remount** — if the SSHFS process dies for any reason, VPS Mount remounts with exponential backoff (2s → 30s, up to 10 attempts) using your session credentials. User-initiated unmounts never trigger a reconnect.

**Make the server side just as solid** — add this to `/etc/ssh/sshd_config` on your VPS, then `sudo systemctl restart sshd`:

```
ClientAliveInterval 15
ClientAliveCountMax 8
TCPKeepAlive yes
```

## Requirements

- **Windows 10 or 11 (x64)** — VPS Mount is Windows-only
- **WinFsp 2.x** — required (guided install built in)
- **SSHFS-Win 3.5+** — required (guided install built in)
- Any Linux server reachable over **SSH** (port 22 or custom)

## Security Notes

Three things you should know before using VPS Mount:

1. **Host key verification is disabled.** To keep the GUI simple, VPS Mount sets `StrictHostKeyChecking=no` and does not persist `known_hosts`. This means **MITM attacks are possible on untrusted networks**. Only connect to servers you trust, and prefer SSH key authentication.
2. **Dependency installers are not hash-verified.** *Install via PowerShell* downloads the WinFsp / SSHFS-Win MSIs from their official GitHub release URLs over HTTPS and runs them elevated, without verifying a checksum or signature. For stronger assurance, use *Download & Install* and verify the MSI yourself.
3. **What's stored on disk.** Device details are saved to `%APPDATA%\vps-mount\config.json` as plain JSON: host, port, username, auth method, and (for key auth) your key file's path. **Passwords are never saved** — for auto-reconnect they're held in memory only while mounted, and discarded on unmount.

## Known Limitations

- Windows-only (x64)
- Requires WinFsp and SSHFS-Win
- SSH key passphrases are not supported (use password auth or an unencrypted key)
- Remote paths are mounted case-insensitive (Windows filesystem behavior)
- Installer is unsigned — Windows SmartScreen will warn on first run (*More info → Run anyway*)

## Troubleshooting

<details>
<summary><b>"WinFsp not found" / "SSHFS-Win not found"</b></summary>

- Ensure you're on Windows 10/11 x64
- On the setup screen, use **Install via PowerShell** (approve the UAC prompt), or download manually from [WinFsp releases](https://github.com/winfsp/winfsp/releases) / [SSHFS-Win releases](https://github.com/winfsp/sshfs-win/releases)
</details>

<details>
<summary><b>"Connection failed"</b></summary>

- Verify host, port, username, and password/key
- Confirm the SSH server is running and reachable (`ssh user@host` from another machine)
- For key auth, ensure the key file is in PEM or PPK format and has no passphrase
</details>

<details>
<summary><b>Drive keeps disconnecting</b></summary>

- Update to **v1.2.0+** — older versions had no keepalive or reconnect logic
- Add the [server-side keepalive settings](#built-to-stay-connected) to your VPS
- Prefer ethernet over Wi-Fi for large transfers, and disable network adapter power saving (Device Manager → adapter → Power Management)
</details>

<details>
<summary><b>"Cannot unmount the drive"</b></summary>

- Close any open files/Explorer windows on the mounted drive first
- If it's still stuck, run: `taskkill /IM sshfs.exe /T /F`
</details>

## Building from Source

```bash
git clone https://github.com/cleaneramade/VPS-Mount.git
cd VPS-Mount
npm install
npm start          # run in development
npm run build      # build the Windows installer (output in dist/)
```

## Contributing

Found a bug or have an idea? [Open an issue](https://github.com/cleaneramade/VPS-Mount/issues) or submit a pull request.

## License

Released under the MIT License — see [LICENSE](LICENSE) for details.

## Author

Made by **Cleanera Made** · Kadeem Johnson · [@CleaneraMade on X](https://x.com/CleaneraMade)
