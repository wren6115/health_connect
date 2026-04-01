# Real-Time Graph Data Flow - Complete Debugging Guide

## Problem Summary
Real-time readings were not displaying on the graph because:
1. **Frontend Socket.io connection** was not configured optimally
2. **Environment variables** were hardcoded instead of using .env
3. **Missing error/diagnosis logging** made it hard to identify issues
4. **Dummy data generator** was still running, polluting the logs

## What Was Fixed

### 1. ✅ Frontend Socket.io Configuration (`MyStats.jsx` & `PatientDashboard.jsx`)
- Added reconnection options with exponential backoff
- Added both `websocket` and `polling` transports for better compatibility
- Added detailed console logging for debugging
- Moved `handleIncomingData` function outside event listeners

### 2. ✅ Environment Configuration (`.env.local`)
Created environment file with proper variables:
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. ✅ Backend Logging (`server.js` & `deviceData.js`)
Enhanced logging to track:
- Socket connections/disconnections
- Room joins
- Data broadcasting events
- Payload details

## Data Flow Verification

```
Arduino (code.ino)
    ↓ USB Serial on COM3
serialBridge.js
    ↓ POST to /api/device/device-data/:patientUserId
Backend Route (deviceData.js)
    ↓ Stores in MongoDB
    ↓ Broadcasts via Socket.io
Socket.io Events:
    - io.emit('global_stream_data', dataPayload)  ← All clients listen here
    - io.to(patientUserId).emit('live_health_data', dataPayload)
    - io.to('admin_and_doctors').emit('live_health_data', dataPayload)
    ↓
Frontend Socket Listeners
    - MyStats.jsx listens: 'global_stream_data'
    - PatientDashboard.jsx listens: 'global_stream_data'
    ↓
React State Updates → Charts Render
```

## Manual Testing Steps

### 1. Check Backend Logs
```bash
cd backend
npm run dev
# Look for messages like:
# 🟢 A client connected: socket-id
# 📍 Socket socket-id joined room user-id
# 📡 [BROADCAST] Real-time data for patient user-id
# ✅ Broadcasting 'global_stream_data' to ALL clients
```

### 2. Check Frontend Console (Browser DevTools)
```javascript
// You should see:
✅ Socket.io Connected - ID: socket-id
📍 Joined room: user-id
✅ RECEIVED global_stream_data: {hr: 72, spo2: 96, temp: 36.5, ...}
📊 REAL-TIME DATA: {...data...}
```

### 3. Test Without Hardware
Run serial bridge in TEST MODE:
```bash
cd backend
npm run serial-bridge -- --test
# This sends dummy data continuously
```

### 4. Verify MongoDB Readings
```bash
# Check if readings are being saved:
db.healthreadings.find().sort({timestamp: -1}).limit(5)
```

## Troubleshooting Checklist

- [ ] Backend is running (`npm run dev` in backend folder)
- [ ] Frontend has `.env.local` with correct `VITE_SOCKET_URL`
- [ ] Frontend is running (`npm run dev` in frontend folder)  
- [ ] Browser console shows "✅ Socket.io Connected"
- [ ] Arduino/serialBridge is sending data
  - [ ] Check `serialBridge.js` console for "🔥 RAW DATA FROM ESP"
  - [ ] Check `deviceData.js` console for "📡 [BROADCAST]"
- [ ] MongoDB is running and storing readings
- [ ] No firewall blocking Socket.io connections (ports 5000)
- [ ] CORS is properly configured on backend

## Common Issues & Fixes

### Issue: "Socket.io Connected" but no data appearing
**Solution:**
1. Check if serialBridge.js is running
2. Check if Arduino is sending data (COM3 must be connected)
3. Check backend logs for "📡 [BROADCAST]" message
4. Verify `patientUserId` is being sent correctly (check browser console)

### Issue: Socket keeps disconnecting
**Solution:**
1. Check network connectivity
2. Check if backend is still running
3. Increase `reconnectionAttempts` in socket options
4. Check for CORS errors in browser console

### Issue: Data shows on PatientDashboard but not on MyStats page
**Solution:**
The graph might need more data points. Real-time updates should appear within 1 second. If you see the data but not the graph:
1. Check if at least 2-3 data points are received
2. Verify chart legend shows (not hidden by CSS)
3. Check browser console for chart rendering errors

## Environment Variables Reference

**Frontend (.env.local):**
- `VITE_API_URL`: Backend API base URL (default: http://localhost:5000/api)
- `VITE_SOCKET_URL`: Socket.io server URL (default: http://localhost:5000)

**Backend (.env):**
- `MONGO_URI`: MongoDB connection string
- `PORT`: Server port (default: 5000)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:5173)

## Success Indicators

✅ Your system is working when:
1. Backend console shows "📡 [BROADCAST] Real-time data"
2. Frontend console shows "✅ RECEIVED global_stream_data"
3. Graph cards update with new values every second
4. "📡 CONNECTED" badge on dashboard shows green
5. MyStats shows "MODE: HARDWARE" when device is connected

