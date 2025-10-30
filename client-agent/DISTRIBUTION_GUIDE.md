# ODL Monitor Client - Distribution Guide

## ✅ Build Complete!

Your production client application is ready to use and distribute.

### 📍 Location
**Path:** `C:\Users\srmmi\Desktop\ODL Monitor\client-agent\dist\win-unpacked\`

**Main Executable:** `ODL Monitor Client.exe` (200.75 MB)

### 🌐 Server Configuration
- **Backend API:** https://monitor-d0dx.onrender.com
- **Admin Dashboard:** https://monitor-client-gsbf.onrender.com

### 📦 Distribution Options

#### Option 1: ZIP Distribution (Recommended)
1. Zip the entire `win-unpacked` folder
2. Share the ZIP file with your users
3. Users extract and run `ODL Monitor Client.exe`

#### Option 2: Network Share
1. Copy the `win-unpacked` folder to a network location
2. Users can run the executable directly from the network

#### Option 3: Direct Copy
1. Copy the entire `win-unpacked` folder to user machines
2. Place in `C:\Program Files\ODL Monitor\` or any preferred location

### 📋 User Instructions

1. **Extract/Copy** all files from the win-unpacked folder
2. **Run** `ODL Monitor Client.exe`
3. **First Time:**
   - Click "Sign Up"
   - Enter required details
   - System will capture MAC address and computer name automatically
4. **Returning Users:**
   - Click "Login"
   - Enter username and password
5. **Start Monitoring:**
   - Click "Start Monitoring" button
   - Admin can now view the screen from dashboard
6. **Stop Monitoring:**
   - Click "Stop Monitoring" to disconnect

### ⚙️ System Requirements
- Windows 10 or later (64-bit)
- Internet connection (required)
- ~500 MB disk space
- Screen capture permissions

### 🔒 Security Notes
- Application connects to: https://monitor-d0dx.onrender.com
- Screen data transmitted via secure WebSocket connection
- Each client identified by unique MAC address
- Monitoring only active when user clicks "Start Monitoring"

### 🐛 Troubleshooting

**Application won't start:**
- Ensure all files from win-unpacked folder are together
- Check Windows Defender/Antivirus settings
- Run as Administrator if needed

**Connection issues:**
- Verify internet connection
- Check firewall settings
- Ensure server URL is accessible: https://monitor-d0dx.onrender.com

**Login failed:**
- Verify credentials with administrator
- Check server status at dashboard

### 📝 Build Information
- Build Date: October 30, 2025
- Version: 1.0.0
- Electron: 39.0.0
- Target: Windows x64

### 🔄 Creating Distribution Package

To create a ZIP for distribution:
```powershell
# Navigate to dist folder
cd "C:\Users\srmmi\Desktop\ODL Monitor\client-agent\dist"

# Stop all running instances first
Stop-Process -Name "ODL Monitor Client" -ErrorAction SilentlyContinue

# Wait a moment
Start-Sleep -Seconds 3

# Create ZIP
Compress-Archive -Path "win-unpacked\*" -DestinationPath "ODL-Monitor-Client-Production.zip" -Force
```

### 📤 Deployment Checklist
- [x] Backend server deployed: https://monitor-d0dx.onrender.com
- [x] Admin dashboard deployed: https://monitor-client-gsbf.onrender.com
- [x] Client application built with production config
- [x] Executable tested locally
- [ ] Create distribution ZIP
- [ ] Test on clean Windows machine
- [ ] Distribute to users

---

**Ready to Deploy!** 🚀

The application is configured to connect to your live production servers.
