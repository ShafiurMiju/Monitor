# 🚀 Quick Start Guide - Testing Your ODL Monitor

This guide will help you quickly test all features of the ODL Monitor system.

## ⚡ Quick Setup (3 Terminals)

### Terminal 1: Start Server
```bash
cd "c:\Users\srmmi\Desktop\ODL Monitor\server"
node index.js
```

**Expected Output:**
```
MongoDB Connected: cluster0.vb0ajdn.mongodb.net
Server is online, listening on port 4000
```

### Terminal 2: Start Admin Dashboard
```bash
cd "c:\Users\srmmi\Desktop\ODL Monitor\admin-dashboard"
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Terminal 3: Start Client Agent
```bash
cd "c:\Users\srmmi\Desktop\ODL Monitor\client-agent"
npm start
```

**Expected:** Electron window opens with login screen

## 🧪 Test Scenarios

### Test 1: User Registration (5 minutes)

1. **In Client Agent Window:**
   - Click "Don't have an account? Sign up"
   - Fill in:
     - Username: `testuser1`
     - Email: `test1@example.com`
     - Password: `password123`
   - Click "Sign Up"

2. **Expected Result:**
   - Green success message appears
   - Dashboard loads automatically
   - Shows username and computer name
   - Status shows "Stopped" (orange badge)

### Test 2: Start Monitoring (2 minutes)

1. **In Client Agent Dashboard:**
   - Click "▶️ Start Monitoring" button

2. **Expected Result:**
   - Button changes to "⏹️ Stop Monitoring" (red)
   - Status badge changes to "Monitoring" (green)
   - Console shows: "User started monitoring: [MAC-ADDRESS]"

3. **In Admin Dashboard (Browser):**
   - User card appears automatically
   - Shows "🟢 Online" badge
   - Shows "📡 Streaming" badge
   - "👁️ View Stream" button is enabled (not grayed out)

### Test 3: Live Stream (2 minutes)

1. **In Admin Dashboard:**
   - Find the user card (should show online + streaming)
   - Click "👁️ View Stream" button

2. **Expected Result:**
   - Right panel shows "⏳ Connecting to stream..."
   - Within 1-2 seconds, your screen appears
   - Button changes to "📺 Viewing"
   - Live feed updates every second
   - Stream info shows at bottom

3. **Verify Live Updates:**
   - Move windows around on your screen
   - Open/close applications
   - See changes reflected in admin dashboard within 1 second

### Test 4: Stop Streaming (1 minute)

1. **In Admin Dashboard:**
   - Click "⏹️ Stop Viewing" button

2. **Expected Result:**
   - Stream stops
   - Placeholder message appears
   - User card still shows online + streaming

3. **In Client Agent:**
   - Click "⏹️ Stop Monitoring"

4. **Expected Result:**
   - Status changes to "Stopped" (orange)
   - Button changes back to "▶️ Start Monitoring"
   - In admin dashboard: "📡 Streaming" badge disappears
   - "👁️ View Stream" button becomes disabled

### Test 5: Logout & Login (3 minutes)

1. **In Client Agent:**
   - Click "🚪 Logout"

2. **Expected Result:**
   - Returns to login screen
   - In admin dashboard: User shows "🔴 Offline"
   - Last seen time appears

3. **Login Again:**
   - Enter email: `test1@example.com`
   - Enter password: `password123`
   - Click "Login"

4. **Expected Result:**
   - Dashboard loads
   - In admin dashboard: User shows "🟢 Online" again

### Test 6: MAC Address Validation (2 minutes)

1. **In Client Agent:**
   - Logout
   - Try to login with different credentials OR
   - Try to signup with same email

2. **Expected Result:**
   - Error message appears
   - Cannot login from different device with same account

## 🎯 Features Checklist

After running all tests, verify these features work:

- [ ] User registration with auto MAC detection
- [ ] Login with MAC verification
- [ ] Logout functionality
- [ ] Real-time online/offline status
- [ ] Start/stop monitoring buttons
- [ ] Admin sees user list automatically
- [ ] Status badges update in real-time
- [ ] Live stream connection
- [ ] Screen capture updates every second
- [ ] Stop viewing from admin side
- [ ] Multiple users can be online
- [ ] Last seen timestamp for offline users

## 🔍 Debugging Tips

### Server Console
Check for these messages:
```
MongoDB Connected: [host]
A user connected with ID: [socket-id]
Agent registered with MAC address: [mac]
User started monitoring: [mac]
Admin requested stream for MAC: [mac]
```

### Client Agent Console
Open DevTools: View → Toggle Developer Tools
Look for:
```
Retrieved MAC Address: [mac]
Agent has connected to the server!
Registering with MAC: [mac]
```

### Admin Dashboard Console
Press F12 in browser
Look for:
```
Requesting stream for: [mac]
```

### Common Issues

**MongoDB Connection Failed**
- Check internet connection
- Verify MongoDB credentials in `server/config/database.js`
- Check if IP is whitelisted in MongoDB Atlas

**Client Can't Connect to Server**
- Ensure server is running on port 4000
- Check if PORT is blocked by firewall
- Verify `SERVER_URL` in client code

**Stream Not Working**
- User must be online (green badge)
- User must have clicked "Start Monitoring"
- Check both client and server console logs

**"View Stream" Button Disabled**
- User must be online AND streaming
- Look for both 🟢 and 📡 badges
- User needs to click "Start Monitoring" first

## 📊 Performance Metrics

Expected performance:
- **Registration/Login:** < 2 seconds
- **Status Updates:** Real-time (< 100ms)
- **Stream Connection:** 1-2 seconds
- **Frame Rate:** ~1 frame/second
- **Stream Latency:** 1-2 seconds

## 🎉 Success Criteria

Your implementation is working correctly if:

1. ✅ Users can register and login
2. ✅ MAC address prevents account sharing
3. ✅ Admin sees online/offline status in real-time
4. ✅ "Start Monitoring" enables streaming badge
5. ✅ Admin can view live screen
6. ✅ Stream updates every second
7. ✅ Users can stop monitoring anytime
8. ✅ System handles logout/reconnection properly

## 🆘 Need Help?

If something doesn't work:
1. Check all three console logs (server, client, admin)
2. Verify MongoDB connection
3. Ensure all dependencies are installed
4. Check firewall settings
5. Refer to SETUP_GUIDE.md for detailed troubleshooting

---

**Happy Testing! 🎯**
