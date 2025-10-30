# 🔧 Troubleshooting Guide - Stream Connection Issues

## Issue: "⏳ Connecting to stream..." stuck

### What I've Fixed:

1. ✅ Added comprehensive logging throughout the system
2. ✅ Improved Socket.IO connection with reconnection settings
3. ✅ Added error handlers for connection issues
4. ✅ Enhanced debugging output

### How to Debug:

#### Step 1: Check Browser Console (Admin Dashboard)

Open the admin dashboard and press `F12` to open Developer Tools. Look for:

```
🌐 Connecting to server: https://your-server-url.vercel.app
✅ Admin dashboard connected to server, Socket ID: xxx
```

If you see connection errors, check:
- Is the server URL correct?
- Is the server running?
- Are there CORS errors?

#### Step 2: Check Client Application Console

The client application logs to the Electron console. To see them:

**Method 1: Run from Terminal (Easier)**
```powershell
cd "c:\Users\srmmi\Desktop\ODL Monitor\client-agent"
npm start
```

You should see:
```
✅ Agent has connected to the server!
📡 Registering with MAC address: xx:xx:xx:xx:xx:xx
```

When admin clicks "View Stream", you should see:
```
🎥 Server requested stream for admin: xxx
Starting screen capture interval...
📸 Captured and sending frame (xxxxx bytes) to admin: xxx
```

**Method 2: Built Application**
Open the app with console logging enabled:
```powershell
cd "c:\Users\srmmi\Desktop\ODL Monitor\client-agent\dist\win-unpacked"
.\resources\app\node_modules\electron\dist\electron.exe . --enable-logging
```

#### Step 3: Check Server Logs

If deployed on Vercel:
1. Go to your Vercel dashboard
2. Click on your server project
3. Go to "Logs" or "Functions"
4. You should see:

```
A user connected with ID: xxx
Agent registered with MAC address: xx:xx:xx:xx:xx:xx
Admin (xxx) requested stream for MAC: xx:xx:xx:xx:xx:xx
Connected clients: [ 'xx:xx:xx:xx:xx:xx' ]
Found target socket ID: xxx, sending start_stream command...
📸 Received frame from client (xxxxx bytes), forwarding to admin: xxx
```

### Common Issues and Solutions:

#### Issue 1: Socket.IO Connection Fails on Vercel

**Problem**: Vercel's free tier has WebSocket limitations

**Solution**: 
- The code now uses polling as fallback
- Consider upgrading Vercel plan
- Or use Railway/Render for hosting

#### Issue 2: Client Not Registered

**Check**:
1. Is the client logged in?
2. Did the client click "Start Monitoring"?
3. Check server logs for "Agent registered with MAC address"

**Fix**:
- Restart the client application
- Re-login
- Click "Start Monitoring" again

#### Issue 3: MAC Address Mismatch

**Check server logs for**: `Connected clients: [ ... ]`

Compare with the MAC address shown in the dashboard for the user.

**Fix**: If they don't match, there's a registration issue. Restart client and server.

#### Issue 4: Firewall Blocking

**Symptoms**: Client connects but stream doesn't start

**Fix**:
- Check Windows Firewall
- Allow the client application through firewall
- Check if corporate firewall blocks WebSocket connections

#### Issue 5: Screenshot Capture Fails

**Client logs show**: `❌ Failed to capture screen`

**Fix**:
- Run client as Administrator (may need screen capture permissions)
- Check if antivirus is blocking screenshot functionality

### Quick Test Script:

Run this in PowerShell to test the full flow:

```powershell
# 1. Test Server
curl https://your-server-url.vercel.app

# 2. Test Admin Dashboard
# Open in browser and check console

# 3. Test Client
cd "c:\Users\srmmi\Desktop\ODL Monitor\client-agent"
npm start
```

### Expected Flow:

1. **Client starts** → Connects to server → Registers with MAC
2. **User clicks "Start Monitoring"** → Sets isStreaming=true in database
3. **Admin clicks "View Stream"** → Sends request_stream event to server
4. **Server** → Finds client by MAC → Sends start_stream to client
5. **Client** → Starts capturing screenshots every 1 second → Sends to server
6. **Server** → Forwards frames to admin
7. **Admin** → Displays frames in browser

### Debugging Checklist:

- [ ] Server is deployed and accessible
- [ ] Admin dashboard can connect to server (check console)
- [ ] Client application is logged in
- [ ] Client clicked "Start Monitoring"
- [ ] User shows as "Online" and "Streaming" in dashboard
- [ ] Check browser console for connection logs
- [ ] Check client terminal/console for capture logs
- [ ] Check server logs for all events

### Need More Help?

If you're still stuck:
1. Copy all console logs (browser + client + server)
2. Check which step in the flow is failing
3. Look for error messages in red

### Performance Tips:

If the stream is working but slow:
- Increase the interval in `client-agent/main.js` (currently 1000ms = 1 second)
- Reduce screenshot quality in the screenshot options
- Check network bandwidth

---

## Redeploy After Changes:

Since I've added extensive logging, you should redeploy:

**Server:**
```powershell
cd server
vercel --prod
```

**Admin Dashboard:**
```powershell
cd admin-dashboard
vercel --prod
```

**Client (if needed):**
```powershell
cd client-agent
npm run build:win
```
