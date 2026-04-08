# VPS Mount

**Mount a remote Linux VPS as a local Windows drive letter — no command line required.**

VPS Mount is a Windows desktop app that turns any SSH-accessible Linux server into a drive letter in File Explorer. Work with remote files the same way you work with local ones — open, edit, drag-and-drop — without touching SFTP clients or the terminal. Built for developers, sysadmins, and anyone who wants their VPS to feel like a local disk.

## Features

- **Simple mounting** — connect to your VPS and get a drive letter (Z:, Y:, etc.) in a few clicks
- **Guided dependency setup** — detects missing dependencies and gives you two ways to install them (see below)
- **Password and SSH key authentication** — use whichever your server supports
- **System tray integration** — quick mount/unmount and status at a glance
- **Multiple saved devices** — store connection details for each of your servers
- **Clean GUI** — no config files, no command line

## Requirements

- **Windows 10 or 11 (x64)** — VPS Mount is Windows-only
- **WinFsp 2.x** — required (VPS Mount helps you install it, see below)
- **SSHFS-Win 3.5+** — required (VPS Mount helps you install it, see below)

## Installation

1. Download the latest `VPS Mount Setup <version>.exe` from the [Releases page](https://github.com/cleaneramade/vps-mount/releases).
2. Run the installer and follow the prompts.
3. On first launch, VPS Mount checks for WinFsp and SSHFS-Win. If either is missing, it shows a setup screen with two options for each dependency:
   - **Download & Install** — opens the dependency's GitHub release page in your browser so you can download and run the MSI installer yourself.
   - **Install via PowerShell** — runs a PowerShell script that downloads the MSI and installs it silently. Windows will prompt you for administrator access (UAC) before it runs.

   Neither option is fully automatic — you'll either be running the installer yourself or approving the UAC prompt.

## Usage

1. Launch **VPS Mount**.
2. Click **Add Device** and enter your server's host, port, username, and password or SSH key.
3. Pick a drive letter and click **Connect**.
4. Open **File Explorer** — your VPS is now mounted at the chosen drive letter.
5. To disconnect, click **Unmount** in the app or right-click the tray icon.

## Security Notes

Before you use VPS Mount, there are three things you should know.

**1. Host key verification is disabled.** To keep the GUI simple, VPS Mount sets `StrictHostKeyChecking=no` and points `UserKnownHostsFile` at `/dev/null`. This means the app does not verify that the SSH server's public key matches a trusted one, and it does not keep a `known_hosts` record between sessions. **Man-in-the-middle (MITM) attacks are possible** on untrusted networks. Only connect to servers you trust, and prefer SSH key authentication over passwords when you can.

**2. Dependency installers are not hash-verified.** When you use **Install via PowerShell** on the setup screen, VPS Mount downloads the WinFsp and SSHFS-Win MSI installers from their official GitHub release URLs over HTTPS and runs them with administrator privileges. It does **not** verify a checksum or digital signature before running them. Trust in the install depends on GitHub and HTTPS. If you want stronger assurance, use **Download & Install** instead and verify the MSI yourself before running it.

**3. What's stored on disk.** VPS Mount saves your device details to `%APPDATA%\vps-mount\config.json` as plain JSON. The file contains the host, port, username, auth method, and (for key auth) the path to your SSH key file. **Passwords are never saved** — you re-enter them each time you mount.

## Known Limitations

- Windows-only (x64)
- Requires WinFsp and SSHFS-Win
- Does not support SSH key passphrases (use password auth or an unencrypted key)
- Remote paths are mounted as case-insensitive (Windows filesystem behavior)

## Troubleshooting

**"WinFsp not found"**
- Ensure you're on Windows 10/11
- On the setup screen, click **Install via PowerShell** (approve the UAC prompt) or **Download & Install** to get it from [WinFsp releases](https://github.com/winfsp/winfsp/releases)

**"SSHFS-Win not found"**
- Same as above — use **Install via PowerShell** or download manually from [SSHFS-Win releases](https://github.com/winfsp/sshfs-win/releases)

**"Connection failed"**
- Verify your SSH credentials (host, port, username, password/key)
- Confirm the remote SSH server is running and reachable
- For key auth, ensure the key file is in PEM or PPK format

**"Cannot unmount the drive"**
- Close any open files on the mounted drive first
- If it's still stuck, run: `taskkill /IM sshfs.exe /T`

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and guidelines.

## License

Released under the MIT License — see [LICENSE](LICENSE) for details.

## Author

Made by **Cleanera Made** · Kadeem Johnson · [@cleaneramade on X](https://x.com/cleaneramade.com)
