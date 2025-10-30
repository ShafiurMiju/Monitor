# Building the Client Agent .exe

## Prerequisites
- Node.js and npm installed
- All dependencies installed (`npm install`)

## Building Instructions

### Quick Build (for testing)
To create a portable executable in a folder (faster):
```bash
npm run build:dir
```
This creates an unpacked directory in `dist/win-unpacked/` with the executable.

### Full Build (for distribution)
To create a full installer:
```bash
npm run build:win
```
This creates:
- A full installer (NSIS) in `dist/` folder
- File will be named something like: `ODL Monitor Client Setup 1.0.0.exe`

### General Build
To build for the current platform:
```bash
npm run build
```

## Output Location
All built files will be in the `dist/` folder:
- `ODL Monitor Client Setup X.X.X.exe` - Full installer (users can choose install location)
- `win-unpacked/` - Portable version (if you used build:dir)

## Installation Options
The NSIS installer will:
- Allow users to choose installation directory
- Create desktop shortcut
- Create start menu shortcut
- Support proper uninstallation

## Icon
To customize the app icon:
1. Create or obtain a `.ico` file (Windows icon format)
2. Place it in the `build/` folder as `icon.ico`
3. Rebuild the application

You can create .ico files from PNG images using online tools like:
- https://icoconvert.com/
- https://convertio.co/png-ico/

## Troubleshooting

### If build fails:
1. Make sure all dependencies are installed: `npm install`
2. Delete `node_modules` and `dist` folders, then run `npm install` again
3. Check that you have enough disk space

### Antivirus warnings:
Electron apps may trigger false positives. You can:
- Add an exception for your build folder
- Code sign your application (requires a certificate)

## Distribution
The installer in `dist/` folder can be:
- Shared directly with users
- Uploaded to your website
- Distributed via USB drives
- Packaged in a zip file

Users just need to run the installer - no Node.js required on their machine!
