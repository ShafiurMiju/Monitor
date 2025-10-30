# ODL Monitor - Setup & Usage Guide

## 🎯 Overview
ODL Monitor is a remote monitoring system with MongoDB authentication. Users can register their computers, and admins can view live streams when users opt-in to monitoring.

## 📋 Features
- ✅ User Registration & Authentication with MongoDB
- ✅ MAC Address-based Device Binding
- ✅ Real-time Online/Offline Status
- ✅ Opt-in Screen Monitoring (User clicks "Start")
- ✅ Admin Dashboard with User List
- ✅ Live Screen Streaming to Admin

## 🛠️ Setup Instructions

### Prerequisites
- Node.js installed
- MongoDB Atlas account (or local MongoDB)

### 1. Server Setup
```bash
cd server
npm install
node index.js
```
The server will run on `http://localhost:4000`

### 2. Admin Dashboard Setup
```bash
cd admin-dashboard
npm install
npm run dev
```
The dashboard will open in your browser (usually `http://localhost:5173`)

### 3. Client Agent Setup
```bash
cd client-agent
npm install
npm start
```
The Electron app will launch with login/signup interface.

## 📖 How to Use

### For End Users (Client Agent)

1. **First Time Setup**
   - Launch the client agent application
   - Click "Don't have an account? Sign up"
   - Enter username, email, and password
   - Click "Sign Up"
   - Your computer's MAC address will be automatically registered

2. **Login**
   - Enter your email and password
   - Click "Login"
   - The system verifies your MAC address matches the registered device

3. **Start Monitoring**
   - After login, you'll see the dashboard
   - Click "▶️ Start Monitoring" when you want admins to be able to view your screen
   - Status will change to "Monitoring" (green badge)
   - You can stop monitoring anytime by clicking "⏹️ Stop Monitoring"

4. **Logout**
   - Click "🚪 Logout" to sign out

### For Admins (Dashboard)

1. **View Registered Users**
   - Open the admin dashboard in your browser
   - All registered users are displayed in the left panel
   - See real-time status:
     - 🟢 **Online**: User is connected
     - 🔴 **Offline**: User is disconnected
     - 📡 **Streaming**: User has enabled monitoring

2. **View Live Stream**
   - Users must be both **Online** AND **Streaming** to view
   - Click "👁️ View Stream" on any streaming user
   - The live screen will appear in the right panel
   - Click "⏹️ Stop Viewing" to disconnect from the stream

3. **User Information Displayed**
   - Username
   - Email
   - Computer name
   - MAC address
   - Online/offline status
   - Last seen time (for offline users)

## 🔐 Security Features

- Passwords are hashed using bcrypt before storage
- JWT tokens for authentication
- MAC address binding prevents account sharing across devices
- Users must explicitly start monitoring (opt-in)

## 🗄️ Database Schema

### User Model
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  macAddress: String (unique),
  computerName: String,
  isOnline: Boolean,
  isStreaming: Boolean,
  lastSeen: Date,
  createdAt: Date
}
```

## 🔄 Workflow

1. **User Registration**
   - User signs up → Server creates user with MAC address → Stored in MongoDB

2. **User Login**
   - User logs in → Server verifies credentials + MAC address → Returns JWT token

3. **Connection**
   - Client connects to socket → Registers with MAC → Server updates `isOnline: true`

4. **Start Monitoring**
   - User clicks "Start" → Client emits event → Server updates `isStreaming: true` → Admins notified

5. **Admin Views Stream**
   - Admin clicks "View Stream" → Server sends stream request to client → Client captures screen → Sends to server → Forwarded to admin

6. **Disconnection**
   - Client disconnects → Server updates `isOnline: false`, `isStreaming: false`

## 📡 API Endpoints

### Authentication
- `POST /api/signup` - Register new user
- `POST /api/login` - User login

### Users
- `GET /api/users` - Get all registered users (for admin)
- `GET /api/users/:id` - Get specific user details

## 🌐 Socket Events

### Client → Server
- `register` - Register client with MAC address
- `start_monitoring` - User started monitoring
- `stop_monitoring` - User stopped monitoring
- `stream_data` - Send screen capture to admin

### Server → Client
- `start_stream` - Admin requesting stream
- `stop_stream` - Admin stopped viewing
- `user_status_changed` - User status updated (notify admins)

### Server → Admin
- `new_frame` - New screen capture frame
- `stream_error` - Error connecting to stream
- `user_status_changed` - Refresh user list

## 🔧 Configuration

### MongoDB Connection
Located in `server/config/database.js`:
```javascript
mongodb+srv://odl:odl@2025@cluster0.vb0ajdn.mongodb.net/odl-monitor
```

### Server URL
- Server: `http://localhost:4000`
- Update in both `client-agent/main.js` and `admin-dashboard/src/App.jsx` if needed

### JWT Secret
Located in `server/index.js`:
```javascript
const JWT_SECRET = 'your-secret-key-change-in-production';
```
⚠️ **Important**: Change this in production!

## 🐛 Troubleshooting

### Client Can't Connect
- Ensure server is running on port 4000
- Check firewall settings
- Verify `SERVER_URL` in client-agent

### MAC Address Mismatch
- Each device needs its own account
- Can't login with same account on different computers

### Stream Not Starting
- User must click "Start Monitoring" first
- Check if user is online in admin dashboard
- Verify socket connection in browser/electron console

## 🚀 Production Deployment

1. **Change JWT Secret** in `server/index.js`
2. **Update SERVER_URL** to production server URL
3. **Secure MongoDB** connection string (use environment variables)
4. **Enable HTTPS** for production
5. **Add authentication** to admin dashboard
6. **Configure CORS** properly for production domains

## 📝 Notes

- Screenshots are captured every 1 second (1000ms)
- Image format: JPEG (base64 encoded)
- User stays online until they close the client app
- Admin dashboard auto-refreshes when user status changes

## 🤝 Support

For issues or questions, check the console logs:
- Server: Terminal running `node index.js`
- Client: Electron DevTools (View → Toggle Developer Tools)
- Admin: Browser DevTools (F12)
