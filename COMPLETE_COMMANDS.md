# 📋 COMPLETE STEP-BY-STEP COMMANDS - Start to Live Data Display

## 🎯 Follow These Commands EXACTLY in Order

---

## **STEP 1: Verify Prerequisites (1 minute)**

### **Check if Node.js is installed:**
```bash
node --version
npm --version
```

**Expected output**: 
- Node v18 or higher
- npm v8 or higher

**If not installed**: Download from https://nodejs.org/

---

### **Check if MongoDB is running:**
```bash
mongosh
```

**Expected output**:
```
Current Mongosh Log ID: ...
Connecting to: mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+...
```

**If error**: Start MongoDB:
```bash
# Windows
mongod

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

Type `exit` to close mongosh.

---

## **STEP 2: Open 4 Terminal Windows**

You need **4 separate terminals** running simultaneously:

1. **Terminal Window 1** → Backend Server
2. **Terminal Window 2** → Serial Bridge (IoT)
3. **Terminal Window 3** → Frontend
4. **Terminal Window 4** → Watching logs (optional)

---

## **STEP 3: Terminal 1 - Start Backend Server**

Open **Terminal Window 1** and run these commands:

```bash
# Navigate to backend
cd backend

# Install dependencies (first time only)
npm install

# Start the backend server
npm start
```

**WAIT** for this output:
```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         🏥 HealthConnect API Server                  ║
║                                                       ║
║         Server running on port 5000                   ║
║         Environment: development                      ║
║         Frontend URL: http://localhost:5173           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

🚀 Starting automatic report generation service...
✅ Bridge mapped to Patient User ID: xxxxxxxxxxxxx
📊 Report service initialized for 1 patient(s)
```

**✅ LEAVE THIS TERMINAL RUNNING**

---

## **STEP 4: Terminal 2 - Start Serial Bridge (IoT Device Reader)**

Open **Terminal Window 2** and run these commands:

```bash
# Navigate to backend (yes, backend again)
cd backend

# Start the serial bridge
npm run serial-bridge
```

**WAIT** for this output:
```
=============================================
      HEALTHCONNECT IoT SERIAL BRIDGE        
=============================================
✅ Bridge mapped to Patient User ID: xxxxxxxxxxxxx
🔌 Auto-Detected Device on /dev/ttyUSB0 (Arduino)
✅ Serial connection established. Reading data...
[10:30:45] 📡 IoT -> Dashboard: HR:72 | SpO2:97% | Temp:36.7°C
[10:30:46] 📡 IoT -> Dashboard: HR:73 | SpO2:97% | Temp:36.7°C
[10:30:47] 📡 IoT -> Dashboard: HR:74 | SpO2:96% | Temp:36.8°C
```

**✅ LEAVE THIS TERMINAL RUNNING**

---

## **STEP 5: Terminal 3 - Start Frontend**

Open **Terminal Window 3** and run these commands:

```bash
# Navigate to frontend
cd frontend

# Install dependencies (first time only)
npm install

# Start the frontend
npm start
```

**WAIT** for this output:
```
VITE v5.0.0 ready in 245ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

**✅ LEAVE THIS TERMINAL RUNNING**

---

## **STEP 6: Access the Dashboard**

In your browser, go to:

```
http://localhost:5173/
```

**OR** for the specific stats page:

```
http://localhost:5173/mystats
```

---

## **STEP 7: Verify Live Data is Flowing**

### **A. Check Dashboard Display:**

Look for:
- **Green Badge**: `📡 CONNECTED` (should be GREEN)
- **Orange Badge**: `MODE: HARDWARE` (should show HARDWARE, not UNKNOWN)
- **Numbers**: Heart Rate, Blood Oxygen, Temperature (should show numbers, not "--")
- **Charts**: Three line charts showing live updating data

**If you see all above**: ✅ **SUCCESS!**

---

### **B. Check Browser Console (if numbers not showing):**

Press **F12** in browser → **Console tab**

Look for:
```
✅ WebSocket Connected: Real-time monitoring active.
[HARDWARE] HR:72 | SpO2:97% | Temp:36.7°C
[HARDWARE] HR:73 | SpO2:97% | Temp:36.7°C
```

Repeated every 1-2 seconds

**If you see these**: Data is flowing! ✅

---

### **C. Check Terminal 1 Logs (Backend):**

Look for:
```
POST /api/device/device-data/xxxxxxxxxxxxx
```

Appearing every 1-2 seconds

**If you see these**: Backend is receiving data! ✅

---

### **D. Check Terminal 2 Logs (Serial Bridge):**

Look for:
```
[10:30:45] 📡 IoT -> Dashboard: HR:72 | SpO2:97% | Temp:36.7°C
[10:30:46] 📡 IoT -> Dashboard: HR:73 | SpO2:97% | Temp:36.7°C
```

**If you see these**: Arduino is sending data! ✅

---

## **STEP 8: Watch Reports Generate (Optional)**

After 60+ seconds, you should see in **Terminal 1** (backend):

```
✅ Report generated for patient xxxxxxxxxxxxx: 15 readings aggregated
✅ Report generated for patient xxxxxxxxxxxxx: 14 readings aggregated
```

This happens every 60 seconds automatically.

---

## **🎉 COMPLETE SUCCESS SCENARIO**

After all steps, you should have:

### **Terminal 1 (Backend)** shows:
```
Server running on port 5000
Report service initialized
POST /api/device/device-data/xxxxx  ← Every 1-2 seconds
✅ Report generated for patient xxxxx ← Every 60 seconds
```

### **Terminal 2 (Serial Bridge)** shows:
```
✅ Serial connection established. Reading data...
[10:30:45] 📡 IoT -> Dashboard: HR:72 | SpO2:97% | Temp:36.7°C
[10:30:46] 📡 IoT -> Dashboard: HR:73 | SpO2:97% | Temp:36.7°C
```

### **Terminal 3 (Frontend)** shows:
```
Local: http://localhost:5173/
```

### **Browser Dashboard** shows:
```
📡 CONNECTED (green badge)
MODE: HARDWARE (orange badge)

Heart Rate (BPM)     Blood Oxygen (%)    Temperature (°C)
        72                  97                36.7

[Live updating line charts]
```

---

## **🚨 IF NOT WORKING - Quick Checks**

### **Charts still empty/MODE still UNKNOWN:**

In Terminal 3 (frontend directory), press **Ctrl+C** to stop, then:

```bash
# Hard clear and restart
cd frontend
npm cache clean --force
npm install
npm start
```

Then hard refresh browser: **Ctrl+Shift+R**

---

### **Serial Bridge keeps "Scanning for IoT devices":**

Arduino not detected. Check:
```bash
# Windows - Check COM ports
mode

# Mac/Linux - Check serial ports
ls /dev/tty*
```

Make sure Arduino is:
1. ✅ Connected via USB cable
2. ✅ Powered on
3. ✅ Has code uploaded with: sendInterval = 1000

---

### **Backend shows no POST requests:**

Serial bridge not running or not sending data.

In Terminal 2, check for:
```
[HH:MM:SS] 📡 IoT -> Dashboard: HR:XX
```

If missing, restart:
```bash
# In Terminal 2, press Ctrl+C to stop
# Then:
npm run serial-bridge
```

---

## **📊 Full Command Reference (Copy-Paste Ready)**

### **Setup (First Time Only):**
```bash
cd backend
npm install
cd ../frontend
npm install
```

### **Every Time You Start:**

**Terminal 1:**
```bash
cd backend
npm start
```

**Terminal 2 (wait 5 seconds after Terminal 1 is ready):**
```bash
cd backend
npm run serial-bridge
```

**Terminal 3 (wait 5 seconds after Terminal 2 shows data):**
```bash
cd frontend
npm start
```

**Browser:**
```
http://localhost:5173/mystats
```

---

## **⏱️ Timing Summary**

| Step | Time | What Happens |
|------|------|-------------|
| 1. Backend Start (npm start) | 5 sec | Server starts on port 5000 |
| 2. Wait for backend ready | 5 sec | "Report service initialized" appears |
| 3. Serial Bridge (npm run serial-bridge) | 3 sec | Connects to Arduino |
| 4. Wait for serial bridge ready | 2 sec | "Reading data..." appears |
| 5. Frontend Start (npm start) | 5 sec | Vite starts on port 5173 |
| 6. Wait for frontend ready | 2 sec | "Local: http://localhost:5173" |
| 7. Open browser to URL | 1 sec | Page loads |
| 8. Wait for WebSocket connection | 2 sec | MODE changes to HARDWARE |
| **TOTAL** | **~30 sec** | **Live data visible!** |

---

## **✅ FINAL VERIFICATION CHECKLIST**

Before declaring success, verify ALL of these:

- [ ] Terminal 1 shows: `Server running on port 5000`
- [ ] Terminal 1 shows: `Report service initialized`
- [ ] Terminal 2 shows: `✅ Serial connection established`
- [ ] Terminal 2 shows: `📡 IoT -> Dashboard: HR:XX` (repeated)
- [ ] Terminal 3 shows: `Local: http://localhost:5173`
- [ ] Browser opens: http://localhost:5173/mystats
- [ ] Browser shows green `📡 CONNECTED` badge
- [ ] Browser shows `MODE: HARDWARE` (not UNKNOWN)
- [ ] Dashboard shows Heart Rate (not "--")
- [ ] Dashboard shows Blood Oxygen (not "--")
- [ ] Dashboard shows Temperature (not "--")
- [ ] Browser console shows: `✅ WebSocket Connected`
- [ ] Browser console shows: `[HARDWARE] HR:XX | SpO2:XX%`
- [ ] Charts have animated lines updating every 1-2 seconds
- [ ] Terminal 1 shows POST requests every 1-2 seconds

**If ALL checked**: 🎉 **YOU'RE DONE! LIVE DATA WORKING!**

---

## **🔧 Troubleshooting Commands**

### **If ports are blocked:**
```bash
# Find what's using port 5000
netstat -ano | findstr :5000  # Windows
lsof -i :5000                  # Mac/Linux

# Find what's using port 5173
netstat -ano | findstr :5173  # Windows
lsof -i :5173                  # Mac/Linux
```

### **Kill stuck processes:**
```bash
# Kill all node processes and restart
killall node           # Mac/Linux
taskkill /F /IM node.exe  # Windows
```

### **Clear everything and start fresh:**
```bash
# Backend
cd backend
rm -rf node_modules
npm install
npm start

# In different terminal
cd backend
npm run serial-bridge

# In different terminal
cd frontend
rm -rf node_modules
npm install
npm start
```

---

## **📱 Port Reference**

| Port | Service | URL |
|------|---------|-----|
| 5000 | Backend Server | http://localhost:5000 |
| 5173 | Frontend (Vite) | http://localhost:5173 |
| 27017 | MongoDB | (database connection) |

---

## **🎓 What Each Command Does**

| Command | Purpose | Terminal |
|---------|---------|----------|
| `npm start` (in backend) | Starts Express server, loads routes, starts report service | 1 |
| `npm run serial-bridge` | Reads Arduino via USB, forwards data to backend | 2 |
| `npm start` (in frontend) | Starts Vite dev server, loads React app | 3 |
| Browser: `http://localhost:5173/mystats` | Loads dashboard, connects via WebSocket | Browser |

---

**FOLLOW THESE COMMANDS EXACTLY AND YOU WILL SEE LIVE DATA!**
