# Quick Start After Vercel Deployment

## You have successfully prepared your ODL Monitor for Vercel deployment!

### What has been done:

1. ✅ Server configured for Vercel deployment with `vercel.json`
2. ✅ Admin Dashboard configured for Vercel deployment with `vercel.json`
3. ✅ Both applications updated to use environment variables
4. ✅ Client application executable created at: `client-agent/dist/win-unpacked/ODL Monitor Client.exe`

### Next Steps:

#### 1. Deploy Server to Vercel

```bash
cd server
vercel
```

Set these environment variables in Vercel:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A secure random string
- `NODE_ENV` - Set to "production"

#### 2. Deploy Admin Dashboard to Vercel

```bash
cd admin-dashboard
vercel
```

Set this environment variable in Vercel:
- `VITE_SERVER_URL` - Your deployed server URL from step 1

#### 3. Update Client Application

1. Run the helper script:
   ```bash
   cd client-agent
   update-server-url.bat
   ```

2. Enter your deployed server URL when prompted

3. (Optional) Rebuild if needed:
   - **Important**: Run Command Prompt as Administrator
   - Then run: `npm run build:win`

#### 4. Distribute the Client

Share the entire `client-agent/dist/win-unpacked` folder with your users.

They should run: `ODL Monitor Client.exe`

---

## Files Created/Modified:

### Server
- `server/vercel.json` - Vercel configuration
- `server/.env.example` - Environment variables template
- `server/package.json` - Added start script and dotenv dependency
- `server/index.js` - Updated to use environment variables

### Admin Dashboard
- `admin-dashboard/vercel.json` - Vercel configuration
- `admin-dashboard/.env.example` - Environment variables template
- `admin-dashboard/.env.production` - Production environment template
- `admin-dashboard/src/App.jsx` - Updated to use environment variables

### Client Agent
- `client-agent/config.js` - Server URL configuration
- `client-agent/config.production.js` - Production config template
- `client-agent/.env.example` - Environment variables template
- `client-agent/update-server-url.bat` - Helper script to update server URL
- `client-agent/dist/win-unpacked/ODL Monitor Client.exe` - **Ready to use!**

### Documentation
- `VERCEL_DEPLOYMENT.md` - Complete deployment guide

---

## Quick Commands Reference:

### Deploy Server
```bash
cd server
vercel --prod
```

### Deploy Admin Dashboard
```bash
cd admin-dashboard  
vercel --prod
```

### Update Client Config
```bash
cd client-agent
update-server-url.bat
```

---

For detailed instructions, see `VERCEL_DEPLOYMENT.md`
