# 🖥️ ODL Monitor

A real-time remote monitoring system with user authentication and MAC address-based device binding. Admins can view live screen streams of registered users who opt-in to monitoring.

## 🌟 Features

- 🔐 **User Authentication** - Secure signup/login with MongoDB
- 🔗 **MAC Address Binding** - Each device needs its own account
- 🟢 **Real-time Status** - See who's online/offline instantly
- 📡 **Opt-in Monitoring** - Users control when admins can view their screen
- 👁️ **Live Streaming** - Real-time screen capture and viewing
- 🎨 **Modern UI** - Beautiful, responsive interfaces
- 🔒 **Secure** - Password hashing, JWT tokens, secure connections

## 📁 Project Structure

```
ODL Monitor/
├── server/              # Node.js + Express + Socket.IO backend
│   ├── config/         # Database configuration
│   ├── models/         # MongoDB models
│   └── index.js        # Main server file
├── client-agent/       # Electron app for end users
│   ├── main.js         # Electron main process
│   ├── index.html      # Login/signup UI
│   └── package.json
├── admin-dashboard/    # React app for administrators
│   └── src/
│       ├── App.jsx     # Main dashboard component
│       └── App.css     # Dashboard styling
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)

### Installation & Running

1. **Clone and Install Dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client-agent dependencies
cd ../client-agent
npm install

# Install admin-dashboard dependencies
cd ../admin-dashboard
npm install
```

2. **Start the Server**
```bash
cd server
node index.js
# Server runs on http://localhost:4000
```

3. **Start the Admin Dashboard**
```bash
cd admin-dashboard
npm run dev
# Dashboard opens in browser (usually http://localhost:5173)
```

4. **Start the Client Agent**
```bash
cd client-agent
npm start
# Electron app launches with login screen
```

## 📖 Usage

### For End Users

1. **Register Your Device**
   - Launch the client agent
   - Click "Don't have an account? Sign up"
   - Enter username, email, and password
   - Your MAC address is automatically registered

2. **Login**
   - Enter your credentials
   - The system verifies your device matches the registered one

3. **Start Monitoring**
   - Click "▶️ Start Monitoring" to allow admin access
   - Your status changes to "Monitoring" (green)
   - Admins can now view your screen
   - Click "⏹️ Stop Monitoring" to disable access anytime

### For Administrators

1. **View All Users**
   - Open the admin dashboard
   - See all registered users with their status:
     - 🟢 **Online** - User is connected
     - 🔴 **Offline** - User is disconnected
     - 📡 **Streaming** - User enabled monitoring

2. **View Live Streams**
   - Click "👁️ View Stream" on any streaming user
   - The live screen appears in real-time
   - Click "⏹️ Stop Viewing" to disconnect

## 🔐 Security

- Passwords are hashed using bcrypt before storage
- JWT tokens for secure authentication (30-day expiration)
- MAC address binding prevents account sharing
- Users must explicitly enable monitoring (opt-in)
- Secure WebSocket connections

## 🗄️ Database Configuration

MongoDB connection is configured in `server/config/database.js`:

```javascript
mongodb+srv://odl:odl%402025@cluster0.vb0ajdn.mongodb.net/odl-monitor
```

**For Production**: Use environment variables to store credentials securely.

## 🔧 Configuration

### Server URL
Default: `http://localhost:4000`

Update in:
- `client-agent/main.js` (line ~8)
- `admin-dashboard/src/App.jsx` (line ~7)

### JWT Secret
Located in `server/index.js`:
```javascript
const JWT_SECRET = 'your-secret-key-change-in-production';
```
⚠️ **Important**: Change this in production!

## 📡 API Endpoints

### Authentication
- `POST /api/signup` - Register new user
- `POST /api/login` - User login with MAC verification

### Users
- `GET /api/users` - Get all registered users
- `GET /api/users/:id` - Get specific user details

## 🌐 Socket Events

### Client Events
- `register` - Register client with MAC address
- `start_monitoring` - User enabled monitoring
- `stop_monitoring` - User disabled monitoring
- `stream_data` - Send screen capture

### Server Events
- `start_stream` - Request stream from client
- `stop_stream` - Stop streaming
- `user_status_changed` - Notify status updates
- `new_frame` - New screen capture frame
- `stream_error` - Connection error

## 🛠️ Technologies Used

### Backend
- Node.js
- Express.js
- Socket.IO
- MongoDB + Mongoose
- bcryptjs
- jsonwebtoken

### Client Agent
- Electron
- Socket.IO Client
- screenshot-desktop
- macaddress
- axios

### Admin Dashboard
- React
- Vite
- Socket.IO Client
- axios

## 🌐 Deployment

### Ready for Production!

The application is configured for Vercel deployment:

- ✅ Server ready for Vercel
- ✅ Admin Dashboard ready for Vercel  
- ✅ Client Application executable built

**Quick Deployment:**
- See [DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md) for quick start
- See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment guide

**Client Application:**
The Windows executable is ready at:
```
client-agent/dist/win-unpacked/ODL Monitor Client.exe
```

## 📝 Documentation

For detailed setup instructions and troubleshooting, see:
- [DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md) - Quick deployment summary
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Complete Vercel deployment guide
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup and usage guide
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical implementation details

## 🐛 Troubleshooting

### Connection Issues
- Ensure server is running on port 4000
- Check firewall settings
- Verify MongoDB connection

### MAC Address Mismatch
- Each device needs its own account
- Cannot use same account on different computers

### Stream Not Working
- User must be online
- User must have clicked "Start Monitoring"
- Check browser/electron console for errors

## 🎯 Workflow Summary

```
1. User Signup → MAC address registered
2. User Login → MAC address verified
3. User clicks "Start" → isStreaming: true
4. Admin sees "Online + Streaming"
5. Admin clicks "View Stream"
6. Live screen displayed
7. User can stop anytime
```

## 📄 License

ISC

## 👤 Author

Built for ODL Monitor Project

---

**Need Help?** Check the [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions or look at console logs for debugging.
