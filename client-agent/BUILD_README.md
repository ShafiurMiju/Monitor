# Building ODL Monitor Client Installer

## Prerequisites
- Node.js installed
- All dependencies installed (`npm install`)

## Build Steps

### Option 1: Standard Installer (Recommended)
Run the build script:
```bash
build-installer.bat
```

This will create: `dist\ODL-Monitor-Client-Setup.exe`

**Features:**
- Standard Windows installer with setup wizard
- Installs to Program Files
- Creates desktop and start menu shortcuts
- Can be uninstalled from Windows Control Panel
- Professional installation experience

### Option 2: Manual Build
```bash
npm run build:win
```

## Server Configuration

The installer is pre-configured to connect to:
- **Backend**: https://monitor-d0dx.onrender.com
- **Frontend**: https://monitor-client-gsbf.onrender.com

## Icon Note

If you want a custom icon:
1. Create or download a `.ico` file (256x256px recommended)
2. Save it as `build/icon.ico`
3. Rebuild the installer

Without a custom icon, Windows will use the default Electron icon.

## Distribution

After building, distribute the file:
- `dist\ODL-Monitor-Client-Setup.exe`

Users simply run this file to install the ODL Monitor Client.

## Installer Size

Typical installer size: 120-180 MB (includes Electron runtime)

## Troubleshooting

**Build fails:**
- Make sure no ODL Monitor processes are running
- Delete the `dist` folder manually and try again
- Run `npm install` to ensure all dependencies are installed

**Installer doesn't work:**
- Windows SmartScreen may block unsigned installers
- Users should click "More info" → "Run anyway"
- Consider code signing for production distribution
