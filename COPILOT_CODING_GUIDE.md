# 🤖 GitHub Copilot Coding Guide for ODL Monitor

## 📋 Project Overview
ODL Monitor is a remote monitoring system consisting of three main components:
1. **Server** (Node.js + Express + MongoDB + Socket.IO)
2. **Admin Dashboard** (React + Vite + Socket.IO Client)
3. **Client Agent** (Electron + Socket.IO Client)

---

## 🎯 Core Principles

### 1. **Understand the Architecture First**
- This is a real-time monitoring system with WebSocket communication
- Three separate applications communicate through a central server
- MongoDB stores user data with device binding (MAC address)
- Always consider the flow: Client → Server → Admin Dashboard

### 2. **Security-First Approach**
- Never store passwords in plain text (use bcrypt)
- Always validate JWT tokens for authenticated routes
- Verify device IDs match registered devices
- Never expose sensitive data in error messages
- Use environment variables for secrets (JWT_SECRET, DB credentials)

### 3. **Real-Time Communication Standards**
- Use Socket.IO events for real-time updates
- Always emit status changes to relevant parties
- Handle disconnections gracefully
- Update database state when socket events occur

---

## 🏗️ Component-Specific Guidelines

### **SERVER (Node.js + Express)**

#### File Structure
```
server/
├── index.js           # Main server file
├── config/
│   └── database.js    # MongoDB connection
└── models/
    └── User.js        # User schema
```

#### Coding Standards
1. **Always use try-catch blocks** for async operations
   ```javascript
   app.post('/api/endpoint', async (req, res) => {
     try {
       // Your code here
       res.json({ success: true, data });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Server error' });
     }
   });
   ```

2. **JWT Authentication Pattern**
   ```javascript
   const jwt = require('jsonwebtoken');
   const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
   
   // Generate token
   const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
   
   // Verify token (middleware)
   const verifyToken = (req, res, next) => {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json({ error: 'No token' });
     
     try {
       const decoded = jwt.verify(token, JWT_SECRET);
       req.userId = decoded.userId;
       next();
     } catch (error) {
       res.status(401).json({ error: 'Invalid token' });
     }
   };
   ```

3. **Socket.IO Event Handling**
   - Always validate data received from clients
   - Update database state when needed
   - Emit events to relevant parties (don't broadcast unnecessarily)
   ```javascript
   socket.on('event_name', async (data) => {
     try {
       // Validate data
       if (!data.deviceId) return;
       
       // Update database
       await User.updateOne({ deviceId: data.deviceId }, { status: 'new_status' });
       
       // Notify admins
       io.emit('admin_event', { deviceId: data.deviceId, status: 'new_status' });
     } catch (error) {
       console.error('Socket error:', error);
       socket.emit('error', { message: 'Operation failed' });
     }
   });
   ```

4. **Database Operations**
   - Use mongoose methods consistently
   - Always handle errors
   - Use lean() for read-only queries to improve performance
   ```javascript
   // Find
   const user = await User.findOne({ email }).lean();
   
   // Update
   await User.updateOne({ _id: userId }, { $set: { isOnline: true } });
   
   // Create
   const newUser = new User({ username, email, password });
   await newUser.save();
   ```

---

### **ADMIN DASHBOARD (React + Vite)**

#### File Structure
```
admin-dashboard/
├── src/
│   ├── App.jsx        # Main component
│   ├── App.css        # Styles
│   ├── main.jsx       # Entry point
│   └── index.css      # Global styles
├── index.html
└── package.json
```

#### Coding Standards

1. **Component Structure**
   ```jsx
   import { useState, useEffect, useRef } from 'react';
   import axios from 'axios';
   import io from 'socket.io-client';
   
   function App() {
     // State declarations
     const [state, setState] = useState(initialValue);
     
     // Refs for socket/intervals
     const socketRef = useRef(null);
     
     // Effects
     useEffect(() => {
       // Setup logic
       return () => {
         // Cleanup logic
       };
     }, [dependencies]);
     
     // Event handlers
     const handleEvent = () => {
       // Handler logic
     };
     
     // Render
     return (
       <div>
         {/* JSX */}
       </div>
     );
   }
   
   export default App;
   ```

2. **Socket.IO Client Pattern**
   ```jsx
   const socketRef = useRef(null);
   
   useEffect(() => {
     // Connect
     socketRef.current = io('http://localhost:4000');
     
     // Event listeners
     socketRef.current.on('event_name', (data) => {
       setState(data);
     });
     
     // Cleanup
     return () => {
       if (socketRef.current) {
         socketRef.current.disconnect();
       }
     };
   }, []);
   
   // Emit events
   const emitEvent = () => {
     if (socketRef.current) {
       socketRef.current.emit('event_name', data);
     }
   };
   ```

3. **API Calls with Axios**
   ```jsx
   const fetchData = async () => {
     try {
       const response = await axios.get('http://localhost:4000/api/endpoint');
       setData(response.data);
     } catch (error) {
       console.error('Error fetching data:', error);
       setError(error.message);
     }
   };
   ```

4. **State Management**
   - Keep state close to where it's used
   - Use meaningful state variable names
   - Initialize state with proper default values
   ```jsx
   const [users, setUsers] = useState([]);
   const [selectedUser, setSelectedUser] = useState(null);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState(null);
   ```

5. **Conditional Rendering**
   ```jsx
   {isLoading && <div>Loading...</div>}
   {error && <div className="error">{error}</div>}
   {users.length === 0 ? (
     <div>No users found</div>
   ) : (
     <ul>
       {users.map(user => (
         <li key={user._id}>{user.username}</li>
       ))}
     </ul>
   )}
   ```

6. **Image Handling (Base64)**
   ```jsx
   // Display base64 image
   <img 
     src={`data:image/jpeg;base64,${imageData}`} 
     alt="Stream" 
   />
   ```

---

### **CLIENT AGENT (Electron)**

#### File Structure
```
client-agent/
├── main.js            # Main process
├── index.html         # UI
└── package.json
```

#### Coding Standards

1. **Electron Main Process Structure**
   ```javascript
   const { app, BrowserWindow, ipcMain } = require('electron');
   const io = require('socket.io-client');
   
   let mainWindow;
   let socket;
   
   function createWindow() {
     mainWindow = new BrowserWindow({
       width: 800,
       height: 600,
       webPreferences: {
         nodeIntegration: true,
         contextIsolation: false
       }
     });
     
     mainWindow.loadFile('index.html');
   }
   
   app.whenReady().then(createWindow);
   
   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') app.quit();
   });
   ```

2. **Socket.IO in Electron**
   ```javascript
   const socket = io('http://localhost:4000');
   
   socket.on('connect', () => {
     console.log('Connected to server');
     // Register with device ID
     socket.emit('register', { deviceId, token });
   });
   
   socket.on('disconnect', () => {
     console.log('Disconnected from server');
   });
   ```

3. **Screen Capture Pattern**
   ```javascript
   const screenshot = require('screenshot-desktop');
   
   async function captureScreen() {
     try {
       const img = await screenshot({ format: 'jpg' });
       const base64 = img.toString('base64');
       socket.emit('stream_data', { deviceId, image: base64 });
     } catch (error) {
       console.error('Screenshot error:', error);
     }
   }
   
   // Start streaming
   let streamInterval;
   function startStreaming() {
     streamInterval = setInterval(captureScreen, 1000); // Every 1 second
   }
   
   // Stop streaming
   function stopStreaming() {
     if (streamInterval) {
       clearInterval(streamInterval);
       streamInterval = null;
     }
   }
   ```

4. **IPC Communication (if needed)**
   ```javascript
   // Main process
   ipcMain.on('event-from-renderer', (event, data) => {
     // Handle event
     event.reply('response-to-renderer', responseData);
   });
   
   // Renderer process (in HTML)
   const { ipcRenderer } = require('electron');
   ipcRenderer.send('event-from-renderer', data);
   ipcRenderer.on('response-to-renderer', (event, data) => {
     // Handle response
   });
   ```

5. **Device ID Handling**
   ```javascript
   const { machineIdSync } = require('node-machine-id');
   const deviceId = machineIdSync();
   ```

---

## 🔄 Common Workflows & Patterns

### **Adding a New Feature**

1. **Identify the components involved**
   - Will it require server changes?
   - Does the admin dashboard need updates?
   - Does the client agent need modifications?

2. **Start with the data model**
   - Update `User.js` schema if needed
   - Add new fields with appropriate types and defaults

3. **Implement server-side logic**
   - Add API endpoints in `server/index.js`
   - Add Socket.IO event handlers
   - Update database operations

4. **Update client-side**
   - Add UI elements in `client-agent/index.html`
   - Add event handlers in `client-agent/main.js`
   - Emit socket events to server

5. **Update admin dashboard**
   - Add UI in `admin-dashboard/src/App.jsx`
   - Add socket listeners for real-time updates
   - Add API calls if needed

### **Authentication Flow Pattern**

1. **Signup**
   ```
   Client → POST /api/signup (username, email, password, deviceId)
   Server → Hash password → Save to MongoDB → Return JWT
   Client → Store JWT → Connect socket with JWT
   ```

2. **Login**
   ```
   Client → POST /api/login (email, password, deviceId)
   Server → Verify credentials → Verify device → Return JWT
   Client → Store JWT → Connect socket with JWT
   ```

3. **Authenticated Socket Connection**
   ```
   Client → Connect socket with JWT
   Server → Verify JWT → Register socket → Update isOnline: true
   ```

### **Real-Time Status Updates Pattern**

1. **User comes online**
   ```
   Client → Socket connects → Emit 'register'
   Server → Update User.isOnline = true → Emit 'user_status_changed'
   Admin → Receive event → Update user list UI
   ```

2. **User starts monitoring**
   ```
   Client → User clicks "Start" → Emit 'start_monitoring'
   Server → Update User.isStreaming = true → Emit 'user_status_changed'
   Admin → Receive event → Show "View Stream" button
   ```

3. **Admin views stream**
   ```
   Admin → Click "View Stream" → Emit 'request_stream'
   Server → Emit 'start_stream' to specific client
   Client → Start capturing screen → Emit 'stream_data' every 1s
   Server → Receive 'stream_data' → Emit 'new_frame' to admin
   Admin → Receive 'new_frame' → Display image
   ```

---

## 🚫 Common Mistakes to Avoid

### **1. Don't Use Synchronous Operations in Server**
❌ **Bad:**
```javascript
const data = fs.readFileSync('file.txt');
```

✅ **Good:**
```javascript
const data = await fs.promises.readFile('file.txt');
```

### **2. Don't Forget to Clean Up**
❌ **Bad:**
```javascript
useEffect(() => {
  const interval = setInterval(() => {}, 1000);
}, []);
```

✅ **Good:**
```javascript
useEffect(() => {
  const interval = setInterval(() => {}, 1000);
  return () => clearInterval(interval);
}, []);
```

### **3. Don't Broadcast When You Can Target**
❌ **Bad:**
```javascript
io.emit('new_frame', data); // Sends to everyone
```

✅ **Good:**
```javascript
io.to(adminSocketId).emit('new_frame', data); // Sends to specific admin
```

### **4. Don't Store Sensitive Data in State**
❌ **Bad:**
```javascript
localStorage.setItem('password', password);
```

✅ **Good:**
```javascript
localStorage.setItem('token', token); // Store only JWT
```

### **5. Don't Skip Error Handling**
❌ **Bad:**
```javascript
const user = await User.findOne({ email });
res.json(user);
```

✅ **Good:**
```javascript
try {
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({ error: 'Server error' });
}
```

### **6. Don't Mutate State Directly**
❌ **Bad:**
```javascript
users.push(newUser);
setUsers(users);
```

✅ **Good:**
```javascript
setUsers([...users, newUser]);
```

### **7. Don't Forget Dependencies in useEffect**
❌ **Bad:**
```javascript
useEffect(() => {
  fetchData(userId);
}, []); // Missing userId dependency
```

✅ **Good:**
```javascript
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

---

## 📝 Code Style Guidelines

### **Naming Conventions**

1. **Variables & Functions**: camelCase
   ```javascript
   const userName = 'John';
   function handleClick() {}
   ```

2. **Constants**: UPPER_SNAKE_CASE
   ```javascript
   const JWT_SECRET = 'secret';
   const MAX_RETRIES = 3;
   ```

3. **Components**: PascalCase
   ```javascript
   function UserCard() {}
   ```

4. **Database Models**: PascalCase
   ```javascript
   const User = mongoose.model('User', userSchema);
   ```

5. **Socket Events**: snake_case
   ```javascript
   socket.emit('user_status_changed');
   socket.on('start_monitoring');
   ```

### **Code Organization**

1. **Imports at the top**
   ```javascript
   // External packages first
   const express = require('express');
   const mongoose = require('mongoose');
   
   // Internal modules second
   const User = require('./models/User');
   const { connectDB } = require('./config/database');
   ```

2. **Constants after imports**
   ```javascript
   const PORT = 4000;
   const JWT_SECRET = process.env.JWT_SECRET;
   ```

3. **Helper functions before main logic**
   ```javascript
   function validateEmail(email) {
     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
   }
   
   app.post('/api/signup', async (req, res) => {
     if (!validateEmail(req.body.email)) {
       return res.status(400).json({ error: 'Invalid email' });
     }
     // ...
   });
   ```

### **Comments & Documentation**

1. **Use comments for complex logic**
   ```javascript
   // Update user status and notify all admins
   await User.updateOne({ deviceId }, { isStreaming: true });
   io.emit('user_status_changed', { deviceId, isStreaming: true });
   ```

2. **Document function parameters**
   ```javascript
   /**
    * Authenticate user and generate JWT token
    * @param {string} email - User email
    * @param {string} password - User password
    * @param {string} deviceId - Device MAC address
    * @returns {Object} { success, token, user }
    */
   async function authenticateUser(email, password, deviceId) {
     // ...
   }
   ```

3. **Explain why, not what**
   ```javascript
   // Bad: Loop through users
   for (const user of users) {}
   
   // Good: Filter out offline users to reduce network traffic
   const onlineUsers = users.filter(u => u.isOnline);
   ```

---

## 🧪 Testing Considerations

When adding new features, consider:

1. **Does it work when user is offline?**
2. **What happens if the socket disconnects?**
3. **Is the UI responsive during loading states?**
4. **Are errors displayed to the user?**
5. **Does it handle edge cases?** (no data, invalid data, etc.)

### **Example: Defensive Coding**
```javascript
// Always check if data exists before using it
socket.on('new_frame', (data) => {
  if (data && data.image) {
    setStreamImage(data.image);
  } else {
    console.warn('Received invalid frame data');
  }
});
```

---

## 🔧 Environment Variables

### **Server (.env file)**
```env
PORT=4000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your-super-secret-key-change-in-production
NODE_ENV=development
```

### **Usage Pattern**
```javascript
require('dotenv').config();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
```

---

## 🚀 Performance Best Practices

1. **Limit screenshot frequency**
   - Current: 1 frame per second (1000ms)
   - Don't go below 500ms (server overload risk)

2. **Use database indexes**
   ```javascript
   userSchema.index({ deviceId: 1 });
   userSchema.index({ email: 1 });
   ```

3. **Lean queries when possible**
   ```javascript
   const users = await User.find({}).lean(); // Faster, plain objects
   ```

4. **Debounce frequent updates**
   ```javascript
   let updateTimeout;
   function debouncedUpdate(data) {
     clearTimeout(updateTimeout);
     updateTimeout = setTimeout(() => {
       performUpdate(data);
     }, 500);
   }
   ```

5. **Compress images if needed**
   ```javascript
   const screenshot = require('screenshot-desktop');
   const sharp = require('sharp');
   
   const img = await screenshot();
   const compressed = await sharp(img)
     .jpeg({ quality: 70 })
     .toBuffer();
   ```

---

## 📚 Key Dependencies & Their Usage

### **Server**
- `express`: REST API framework
- `mongoose`: MongoDB ODM
- `socket.io`: Real-time WebSocket communication
- `bcryptjs`: Password hashing
- `jsonwebtoken`: JWT authentication
- `cors`: Cross-origin requests
- `dotenv`: Environment variables

### **Admin Dashboard**
- `react`: UI framework
- `vite`: Build tool & dev server
- `axios`: HTTP client
- `socket.io-client`: WebSocket client

### **Client Agent**
- `electron`: Desktop app framework
- `socket.io-client`: WebSocket client
- `screenshot-desktop`: Screen capture
- `node-machine-id`: Device identification
- `axios`: HTTP client

---

## 🎨 UI/UX Guidelines

### **Status Indicators**
- 🟢 Green: Online, Active, Success
- 🔴 Red: Offline, Error
- 🟡 Yellow: Warning, Pending
- 🔵 Blue: Info, Streaming

### **Button States**
```jsx
<button 
  onClick={handleClick}
  disabled={isLoading}
  className={isActive ? 'active' : 'inactive'}
>
  {isLoading ? 'Loading...' : 'Click Me'}
</button>
```

### **Responsive Design**
```css
/* Mobile first */
.container {
  width: 100%;
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    width: 750px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    width: 970px;
  }
}
```

---

## 🔍 Debugging Tips

1. **Server Logs**
   ```javascript
   console.log('[SERVER]', 'Event:', eventName, 'Data:', data);
   ```

2. **Client Logs**
   ```javascript
   console.log('[CLIENT]', 'Action:', action, 'Status:', status);
   ```

3. **Socket Connection Status**
   ```javascript
   socket.on('connect', () => console.log('✅ Connected'));
   socket.on('disconnect', () => console.log('❌ Disconnected'));
   socket.on('error', (err) => console.error('⚠️ Error:', err));
   ```

4. **Network Tab**
   - Check API requests in browser DevTools
   - Verify WebSocket frames
   - Monitor payload sizes

---

## ✅ Checklist for New Features

Before marking a feature as complete:

- [ ] Code follows naming conventions
- [ ] Error handling implemented
- [ ] Loading states added (if applicable)
- [ ] Socket events properly handled
- [ ] Database operations have error handling
- [ ] UI updates in real-time (if applicable)
- [ ] Cleanup functions added (intervals, listeners)
- [ ] Works when user is offline/online
- [ ] No console errors
- [ ] Tested in all three components (server, admin, client)
- [ ] Code is commented where necessary
- [ ] No hardcoded values (use constants/env vars)

---

## 🎯 Priority Guidelines

When implementing features, prioritize in this order:

1. **Security** - Never compromise on authentication/authorization
2. **Stability** - Ensure app doesn't crash
3. **User Experience** - Make it intuitive and responsive
4. **Performance** - Optimize after it works
5. **Polish** - Add nice-to-have features last

---

## 📞 Socket Event Reference

### **Client → Server**
| Event | Data | Description |
|-------|------|-------------|
| `register` | `{ deviceId, token }` | Register client on connect |
| `start_monitoring` | `{ deviceId }` | User started monitoring |
| `stop_monitoring` | `{ deviceId }` | User stopped monitoring |
| `stream_data` | `{ deviceId, image }` | Send screen capture |

### **Server → Client**
| Event | Data | Description |
|-------|------|-------------|
| `start_stream` | `{ deviceId }` | Admin requests stream |
| `stop_stream` | `{ deviceId }` | Admin stopped viewing |

### **Server → Admin**
| Event | Data | Description |
|-------|------|-------------|
| `new_frame` | `{ deviceId, image }` | New screen frame |
| `user_status_changed` | `{ user }` | User status updated |
| `stream_error` | `{ message }` | Stream connection error |

---

## 🎓 Learning Resources

- **Socket.IO Docs**: https://socket.io/docs/
- **Mongoose Docs**: https://mongoosejs.com/docs/
- **React Docs**: https://react.dev/
- **Electron Docs**: https://www.electronjs.org/docs/

---

## 💡 Final Tips

1. **Read the existing code before modifying** - Understand patterns used
2. **Test in all three components** - Changes often affect multiple parts
3. **Keep it simple** - Don't over-engineer solutions
4. **Ask for clarification** - If requirements are unclear
5. **Update SETUP_GUIDE.md** - When adding user-facing features
6. **Use consistent patterns** - Follow established conventions
7. **Think about edge cases** - What if network fails? User offline?
8. **Log meaningful messages** - Makes debugging easier

---

**Remember**: This is a real-time monitoring system where reliability and security are paramount. Always test thoroughly and consider the implications of changes across all three components.

Happy coding! 🚀
