# Quick Setup Guide for App Usage Tracking Feature

## Installation Steps

### 1. Install Client Agent Dependencies
Open PowerShell and navigate to the client-agent directory:

```powershell
cd "c:\Users\srmmi\Desktop\ODL Monitor\client-agent"
npm install active-win@7.8.2
```

### 2. Restart Services

#### Restart Server
```powershell
cd "c:\Users\srmmi\Desktop\ODL Monitor\server"
npm start
```
(or if you have it running, just restart it with Ctrl+C and run again)

#### Rebuild Client Agent (if needed)
```powershell
cd "c:\Users\srmmi\Desktop\ODL Monitor\client-agent"
npm run build:win
```

#### Restart Admin Dashboard
```powershell
cd "c:\Users\srmmi\Desktop\ODL Monitor\admin-dashboard"
npm run dev
```

### 3. Test the Feature

1. **Login to Client Agent**
   - Open the client agent application
   - Login with your credentials
   - The app tracking will start automatically

2. **Use Some Applications**
   - Open and use different applications (e.g., Chrome, Notepad, VS Code)
   - Switch between apps
   - The client will track your usage automatically

3. **View in Admin Dashboard**
   - Open the admin dashboard in your browser
   - Find your user in the list
   - Click the "📊 App Usage" button
   - You should see the apps you've been using with statistics

## Verification

To verify everything is working:

1. Check that the client agent is running without errors
2. Check server logs for any MongoDB connection issues
3. Open admin dashboard and look for the new "📊 App Usage" button
4. After using apps for a few minutes, click the button to see statistics

## Troubleshooting

### If app tracking isn't working:
- Make sure `active-win` package is installed
- Check if the client agent has permissions to access active window information
- Check browser console for any errors

### If data isn't showing in dashboard:
- Wait 60 seconds (data uploads every minute)
- Click the refresh button
- Check server logs for any API errors

### If you see errors:
- Make sure MongoDB is running
- Verify all dependencies are installed
- Check that all files were properly updated

## Files Modified/Created

### New Files:
- `server/models/AppUsage.js`
- `admin-dashboard/src/AppUsage.jsx`
- `admin-dashboard/src/AppUsage.css`

### Modified Files:
- `server/index.js` (added API endpoints)
- `client-agent/package.json` (added active-win dependency)
- `client-agent/main.js` (added app tracking functionality)
- `admin-dashboard/src/App.jsx` (integrated AppUsage component)
- `admin-dashboard/src/App.css` (added button styling)

## Next Steps

Once everything is working:
1. Test with multiple users
2. Try the date range filtering
3. Monitor for at least a few hours to see meaningful data
4. Check if the statistics are calculating correctly

Enjoy your new app usage tracking feature! 🎉
