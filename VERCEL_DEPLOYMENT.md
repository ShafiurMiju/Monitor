# Vercel Deployment Guide for ODL Monitor

This guide will help you deploy the server and admin-dashboard to Vercel and configure the client application.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- MongoDB Atlas account for database (sign up at https://www.mongodb.com/cloud/atlas)
- Vercel CLI (optional, but recommended)

## Part 1: Deploy the Server to Vercel

### Step 1: Prepare MongoDB Connection

1. Go to MongoDB Atlas (https://www.mongodb.com/cloud/atlas)
2. Create a new cluster or use an existing one
3. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (it looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

### Step 2: Deploy Server

#### Option A: Using Vercel Web Interface

1. Go to https://vercel.com and sign in
2. Click "Add New" → "Project"
3. Import your Git repository or upload the `server` folder
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `server` (if deploying from a monorepo)
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty

5. Add Environment Variables:
   Click "Environment Variables" and add:
   ```
   MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/odl-monitor?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-jwt-key-change-this
   NODE_ENV=production
   ```

6. Click "Deploy"
7. Wait for deployment to complete
8. **Note your server URL**: https://your-server-name.vercel.app

#### Option B: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to the server directory:
   ```bash
   cd server
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Deploy:
   ```bash
   vercel
   ```

5. Add environment variables:
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   vercel env add NODE_ENV
   ```

6. Redeploy with environment variables:
   ```bash
   vercel --prod
   ```

## Part 2: Deploy the Admin Dashboard to Vercel

### Step 1: Configure Environment Variables

1. In the `admin-dashboard` folder, create a `.env.production` file (or update the existing one):
   ```
   VITE_SERVER_URL=https://your-server-name.vercel.app
   ```
   Replace `your-server-name.vercel.app` with your actual server URL from Part 1.

### Step 2: Deploy Admin Dashboard

#### Option A: Using Vercel Web Interface

1. Go to https://vercel.com and sign in
2. Click "Add New" → "Project"
3. Import your Git repository or upload the `admin-dashboard` folder
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `admin-dashboard` (if deploying from a monorepo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add Environment Variables:
   ```
   VITE_SERVER_URL=https://your-server-name.vercel.app
   ```

6. Click "Deploy"
7. Wait for deployment to complete
8. **Note your dashboard URL**: https://your-dashboard-name.vercel.app

#### Option B: Using Vercel CLI

1. Navigate to the admin-dashboard directory:
   ```bash
   cd admin-dashboard
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Add environment variable:
   ```bash
   vercel env add VITE_SERVER_URL
   ```
   Enter: `https://your-server-name.vercel.app`

4. Redeploy with environment variables:
   ```bash
   vercel --prod
   ```

## Part 3: Configure the Client Application

### Step 1: Update Configuration

1. Open `client-agent/config.production.js`
2. Update the SERVER_URL with your deployed server URL:
   ```javascript
   module.exports = {
     SERVER_URL: 'https://your-server-name.vercel.app'
   };
   ```

3. Rename `config.production.js` to `config.js` (replace the existing config.js):
   ```bash
   cd client-agent
   copy config.production.js config.js
   ```

### Step 2: Use the Existing Executable

The Windows executable has already been built and is located at:
```
client-agent/dist/win-unpacked/ODL Monitor Client.exe
```

You can distribute the entire `win-unpacked` folder to your users. They should:
1. Copy the entire `win-unpacked` folder to their computer
2. Run `ODL Monitor Client.exe`

### Step 3: (Optional) Create a Portable Installer

If you want to create a single portable .exe file:

1. **Run as Administrator** (required for symbolic link permissions)
2. Open PowerShell or Command Prompt as Administrator
3. Navigate to the client-agent folder:
   ```bash
   cd "c:\Users\srmmi\Desktop\ODL Monitor\client-agent"
   ```
4. Run the build command:
   ```bash
   npm run build:win
   ```

The portable executable will be created at:
```
client-agent/dist/ODL-Monitor-Client-Portable.exe
```

## Part 4: Testing the Deployment

### Test the Server

1. Open a browser and go to your server URL
2. Try the health check endpoint: `https://your-server-name.vercel.app/api/users`
3. You should see an empty users array if no users are registered

### Test the Admin Dashboard

1. Open your admin dashboard URL: `https://your-dashboard-name.vercel.app`
2. You should see the ODL Monitor Admin Dashboard interface
3. Initially, you'll see "No registered users yet"

### Test the Client Application

1. Run the client application on a Windows machine
2. Create a new account (Sign Up)
3. Login with your credentials
4. Click "Start Monitoring"
5. Go to the admin dashboard
6. You should see your user listed as "Online" and "Streaming"
7. Click "View Stream" to see the screen

## Troubleshooting

### CORS Issues

If you encounter CORS errors, verify that your server's `cors` configuration allows connections from your admin dashboard URL.

### Socket.IO Connection Issues

Vercel's free tier has limitations with WebSockets. If you experience connection issues:
- Consider upgrading your Vercel plan
- Or use a different hosting service for the server (Railway, Render, Heroku, etc.)

### MongoDB Connection Issues

- Verify your MongoDB connection string is correct
- Ensure your MongoDB cluster allows connections from anywhere (0.0.0.0/0) or add Vercel's IP ranges
- Check that your MongoDB user has proper permissions

### Client Application Not Connecting

1. Verify the SERVER_URL in `client-agent/config.js` is correct
2. Check that the server is running and accessible
3. Ensure your firewall allows outbound connections to the server

## Important Notes

### Vercel Limitations for Real-Time Applications

- **WebSocket Support**: Vercel's free tier has limited WebSocket support
- **Serverless Functions**: Each function has a 10-second timeout on the free tier
- **Consider Alternatives**: For production use with real-time streaming, consider:
  - Railway (https://railway.app)
  - Render (https://render.com)
  - DigitalOcean App Platform
  - AWS Elastic Beanstalk
  - Heroku

### Security Recommendations

1. **Change JWT Secret**: Always use a strong, unique JWT secret in production
2. **MongoDB Security**: 
   - Use strong passwords
   - Limit IP access when possible
   - Enable MongoDB encryption at rest
3. **HTTPS Only**: Both deployments will use HTTPS by default on Vercel
4. **Rate Limiting**: Consider adding rate limiting to your API endpoints

## Updating Your Deployment

### Update Server
```bash
cd server
vercel --prod
```

### Update Admin Dashboard
```bash
cd admin-dashboard
vercel --prod
```

### Update Client Application
1. Update the code
2. Update `config.js` if the server URL changed
3. Rebuild the application:
   ```bash
   npm run build:win
   ```
4. Distribute the new executable to users

## Support

If you encounter any issues:
1. Check the Vercel deployment logs
2. Check browser console for errors (admin dashboard)
3. Check Windows Event Viewer for client application errors
4. Verify all environment variables are set correctly

---

**Deployment Completed Successfully!**

Your ODL Monitor system is now deployed and ready to use:
- Server: `https://your-server-name.vercel.app`
- Admin Dashboard: `https://your-dashboard-name.vercel.app`
- Client Application: `client-agent/dist/win-unpacked/ODL Monitor Client.exe`
