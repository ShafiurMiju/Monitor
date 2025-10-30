# 📋 Deployment Checklist

Use this checklist to track your deployment progress.

## Phase 1: Server Deployment

- [ ] Navigate to server directory: `cd server`
- [ ] Deploy to Vercel: `vercel`
- [ ] Set environment variable: `MONGODB_URI`
- [ ] Set environment variable: `JWT_SECRET`
- [ ] Set environment variable: `NODE_ENV` = production
- [ ] Deploy to production: `vercel --prod`
- [ ] **Save Server URL**: _________________________________

## Phase 2: Admin Dashboard Deployment

- [ ] Navigate to dashboard directory: `cd admin-dashboard`
- [ ] Update `.env.production` with server URL
- [ ] Deploy to Vercel: `vercel`
- [ ] Set environment variable: `VITE_SERVER_URL` = (your server URL)
- [ ] Deploy to production: `vercel --prod`
- [ ] **Save Dashboard URL**: _________________________________

## Phase 3: Client Application Configuration

- [ ] Navigate to client directory: `cd client-agent`
- [ ] Run update script: `update-server-url.bat`
- [ ] Enter your server URL when prompted
- [ ] Verify `config.js` has correct URL
- [ ] **Client Executable Location**: `dist/win-unpacked/ODL Monitor Client.exe`

## Phase 4: Testing

### Server Tests
- [ ] Visit server URL in browser
- [ ] Test API endpoint: `/api/users`
- [ ] Verify MongoDB connection (check Vercel logs)

### Admin Dashboard Tests
- [ ] Open dashboard URL
- [ ] Verify it loads without errors
- [ ] Check browser console for any issues
- [ ] Verify Socket.IO connection (check console)

### Client Application Tests
- [ ] Run the client executable
- [ ] Create a test account (Sign Up)
- [ ] Login with test account
- [ ] Verify connection status

### End-to-End Tests
- [ ] Start monitoring from client
- [ ] Verify user appears as "Online" in dashboard
- [ ] Verify user shows "Streaming" status
- [ ] Click "View Stream" from dashboard
- [ ] Verify live stream appears
- [ ] Stop monitoring from client
- [ ] Verify status updates in dashboard
- [ ] Test with multiple clients simultaneously

## Phase 5: Distribution

### Admin Dashboard
- [ ] Share dashboard URL with administrators
- [ ] Provide login instructions (if applicable)
- [ ] Share user guide documentation

### Client Application
- [ ] Create distribution package (copy `win-unpacked` folder)
- [ ] Test on a clean Windows machine
- [ ] Create installation instructions for users
- [ ] Distribute to end users

## Post-Deployment

### Security
- [ ] Verify JWT_SECRET is strong and unique
- [ ] Verify MongoDB password is strong
- [ ] Enable MongoDB IP whitelisting (if not using 0.0.0.0/0)
- [ ] Review CORS settings
- [ ] Consider implementing rate limiting

### Monitoring
- [ ] Set up Vercel analytics (optional)
- [ ] Monitor Vercel function logs
- [ ] Monitor MongoDB Atlas metrics
- [ ] Set up error alerts (optional)

### Documentation
- [ ] Update user documentation with live URLs
- [ ] Create admin guide
- [ ] Create user guide for client application
- [ ] Document any known issues or limitations

## Troubleshooting Resources

If you encounter issues, refer to:
1. [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Detailed deployment guide
2. [DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md) - Quick reference
3. [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Setup and usage guide
4. Vercel deployment logs
5. Browser console (for dashboard issues)
6. MongoDB Atlas logs

---

## Quick Reference

**Server Deployment Command**:
```bash
cd server && vercel --prod
```

**Dashboard Deployment Command**:
```bash
cd admin-dashboard && vercel --prod
```

**Update Client Config**:
```bash
cd client-agent && update-server-url.bat
```

**Client Executable Path**:
```
client-agent/dist/win-unpacked/ODL Monitor Client.exe
```

---

**Status**: ⬜ Not Started | 🔄 In Progress | ✅ Completed

Mark items as complete as you progress through the deployment!
