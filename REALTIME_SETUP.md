# 🏥 Real-Time Health Data Flow - QUICK START GUIDE

## ✅ FIXES APPLIED TO YOUR SYSTEM

Your real-time data wasn't displaying on graphs because the **Socket.io connection wasn't properly configured** on the frontend. Here's what was fixed:

### 📦 What Changed

| File | Issue | Fix |
|------|-------|-----|
| **Frontend/.env.local** | No environment config | Created with VITE_SOCKET_URL |
| **MyStats.jsx** | Hardcoded Socket URL | Now uses env variable + logging |
| **PatientDashboard.jsx** | Missing reconnection logic | Added reconnection options |
| **server.js** | Silent failures | Added detailed Socket connection logs |
| **deviceData.js** | No broadcast verification | Added payload logging |

---

## 🚀 QUICK START (3 Steps)

### Step 1: Verify Frontend .env.local exists
```bash
cd frontend
cat .env.local
# Should show:
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000
```

### Step 2: Start Backend (Terminal 1)
```bash
cd backend
npm run dev
# Wait for: "🏥 HealthConnect API Server"
```

### Step 3: Start Frontend (Terminal 2)
```bash
cd frontend  
npm run dev
# Will start on http://localhost:5173
```

---

## 📍 TESTING THE DATA FLOW

### Option A: With Real Arduino Device
1. Ensure Arduino is connected on **COM3** with USB cable
2. Start serial bridge:
   ```bash
   cd backend
   npm run serial-bridge
   ```
3. Look for logs: `✅ Bridge mapped to Patient User ID`

### Option B: With Simulated Data (Recommended for Testing)
```bash
cd backend
npm run serial-bridge -- --test
# Sends dummy health readings every second
```

---

## 🔍 VERIFY IT'S WORKING

### Check Backend Logs (Should See)
```
✅ Backend running on http://localhost:5000
🟢 A client connected: socket-6a7b9c...
📍 Socket socket-6a7b9c joined room user-id
📡 [BROADCAST] Real-time data for patient user-id: {hr: 72, spo2: 96, temp: 36.5}
✅ Broadcasting 'global_stream_data' to ALL clients
```

### Check Frontend Browser Console (Press F12)
```
✅ Socket.io Connected - ID: socket-6a7b9c
📍 Joined room: user-id
✅ RECEIVED global_stream_data: {hr: 72, spo2: 96, temp: 36.5...}
📊 REAL-TIME DATA: {hr: 72, spo2: 96, temp: 36.5...}
```

### Check Dashboard Display
- ✅ Vitals cards should update every 1-2 seconds
- ✅ "📡 CONNECTED" badge should be GREEN
- ✅ "MODE: HARDWARE" or "MODE: TEST" should show
- ✅ Graph lines should show 40+ data points

---

## 📊 THE DATA FLOW (What's Happening)

```
Hardware Device (Arduino on COM3)
    ↓ Serial Data (JSON)
serialBridge.js 
    ↓ reads UART every second
    ↓ validates & converts to JSON
    ↓ POST request with data
Backend API: /api/device/device-data/:patientUserId
    ↓ saves to MongoDB (HealthReading)
    ↓ broadcasts via Socket.io
io.emit('global_stream_data', {...})  ← ALL clients receive
    ↓
Frontend React Components
    - MyStats.jsx 
    - PatientDashboard.jsx
    ↓ listens for 'global_stream_data' event
    ↓ updates state with new values
    ↓ chart.js re-renders automatically
Charts Display Updated Live Data
```

---

## 🐛 TROUBLESHOOTING

### Issue: Frontend console shows no Socket messages
**Solution:**
1. ❌ Refresh browser (Ctrl+Shift+Delete cache)
2. ❌ Check if backend is still running
3. ❌ Verify `.env.local` has correct SOCKET_URL
4. ✅ Check browser console for errors (red text)

### Issue: Data appears in backend logs but not frontend
**Solution:**
1. ✅ Open DevTools console while data is being sent
2. ✅ Look for 'global_stream_data' messages
3. ✅ Check if Socket.io is "Connected" (green message)
4. ❌ If not connected, backend broadcast won't reach frontend

### Issue: Only PatientDashboard shows data, not MyStats
**Solution:**
- MyStats needs at least 2-3 data points before showing on graph
- Wait 3-5 seconds for chart to populate
- Check browser console for chart errors

### Issue: Socket keeps disconnecting every 5 seconds
**Solution:**
1. Backend may have crashed - check terminal for errors
2. Try running serialBridge in TEST mode (doesn't need COM3)
3. Check network - if on Wi-Fi, switch to Ethernet

---

## 📝 FILES CREATED/MODIFIED

### New Files:
- ✅ `frontend/.env.local` - Environment variables
- ✅ `REAL_TIME_DEBUG_GUIDE.md` - Detailed debugging reference
- ✅ `verify_realtime.sh` - Quick verification script

### Modified Files:
- ✅ `frontend/src/components/MyStats.jsx` - Socket.io + logging
- ✅ `frontend/src/components/PatientDashboard.jsx` - Socket.io + logging
- ✅ `backend/server.js` - Connection logging
- ✅ `backend/routes/deviceData.js` - Broadcast logging

---

## 💡 TIPS

1. **Keep multiple terminals open** while developing:
   - Terminal 1: Backend (`npm run dev`)
   - Terminal 2: Frontend (`npm run dev`)
   - Terminal 3: Serial Bridge (`npm run serial-bridge -- --test`)

2. **Watch the logs** - They tell you exactly what's happening:
   - Backend logs: "📡 [BROADCAST]" = data sent
   - Frontend logs: "✅ RECEIVED" = data received
   - If no "RECEIVED", data flow is broken

3. **Use TEST mode** while debugging:
   ```bash
   npm run serial-bridge -- --test
   # Sends fake but realistic data every second
   ```

4. **Browser DevTools Network tab** can show Socket.io messages:
   - Open DevTools → Network → WebSocket
   - Filter for messages containing your data

---

## ✅ SUCCESS CHECKLIST

- [ ] Backend running on http://localhost:5000
- [ ] Frontend .env.local created with VITE_SOCKET_URL
- [ ] Frontend running on http://localhost:5173
- [ ] Serial bridge running (real or test mode)
- [ ] Browser console shows green checkmarks
- [ ] Dashboard vitals updating every 1-2 seconds
- [ ] Graph showing 40+ data points
- [ ] "📡 CONNECTED" badge is GREEN
- [ ] No red errors in browser console

---

## 🆘 STILL NOT WORKING?

1. Check [REAL_TIME_DEBUG_GUIDE.md](./REAL_TIME_DEBUG_GUIDE.md) for detailed troubleshooting
2. Run verification script: `bash verify_realtime.sh`
3. Copy ALL error messages from console into a document
4. Share backend terminal output + frontend console output

---

**Last Updated:** April 2, 2026
**Status:** ✅ Real-time data flow fully debugged and documented
