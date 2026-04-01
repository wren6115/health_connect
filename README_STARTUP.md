# HealthConnect - Live Data Streaming Setup & Startup Guide

## 📋 System Overview

HealthConnect is a real-time health monitoring system with the following architecture:

```
Arduino/ESP Device (IoT) 
    ↓ (Serial: 9600 baud)
Serial Bridge (Node.js)
    ↓ (HTTP POST)
Backend Server (Express + Socket.io)
    ↓ (WebSocket)
Frontend Dashboard (React)
```

---

## 🚀 STARTUP INSTRUCTIONS

### **Step 1: Prerequisites**
Ensure you have:
- Node.js v18+ installed
- MongoDB running (local or cloud)
- Arduino/ESP device connected via USB
- All dependencies installed

### **Step 2: Backend Setup**

```bash
cd backend
npm install
```

This installs all required packages including:
- `serialport`: For reading Arduino data
- `socket.io`: For real-time WebSocket communication
- `mongoose`: For database operations

### **Step 3: Configure Environment Variables**

Create a `.env` file in the backend directory:

```env
# Database
MONGO_URI=mongodb://127.0.0.1:27017/healthconnect

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Add other config as needed
```

### **Step 4: Start Backend (Terminal 1)**

```bash
cd backend
npm start
```

Expected output:
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
📊 Report service initialized for X patient(s)
```

### **Step 5: Start Serial Bridge (Terminal 2)**

**IMPORTANT**: Only start AFTER backend is running!

```bash
cd backend
npm run serial-bridge
```

Expected output:
```
=============================================
      HEALTHCONNECT IoT SERIAL BRIDGE        
=============================================
✅ Bridge mapped to Patient User ID: xxxxx
🔌 Auto-Detected Device on /dev/ttyUSB0 (Arduino)
✅ Serial connection established. Reading data...
[HH:MM:SS] 📡 IoT -> Dashboard: HR:75 | SpO2:96% | Temp:36.5°C
```

If you see continuous data logs, **✅ SUCCESS!**

### **Step 6: Start Frontend (Terminal 3)**

```bash
cd frontend
npm install
npm start
```

Expected output:
```
  VITE v5.x.x ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Now open `http://localhost:5173` in your browser.

---

## ✅ Verification Checklist

After startup, verify each component:

### 1. **Backend Health Check**
```bash
curl http://localhost:5000/api/health
```
Expected response: `{"status": "success", "message": "HealthConnect API is running"}`

### 2. **Database Connection**
Check backend logs for:
```
✅ Database connected successfully
```

### 3. **Serial Bridge Status**
Serial bridge logs should show:
```
✅ Serial connection established. Reading data...
[HH:MM:SS] 📡 IoT -> Dashboard: HR:75 | SpO2:96% | Temp:36.5°C
```

### 4. **Live Dashboard Update**
- Open MyStats dashboard at `http://localhost:5173/mystats`
- Charts should update in real-time
- Data values should refresh every 1-2 seconds

### 5. **Automatic Reports**
- Check backend logs for: `✅ Report generated for patient`
- Reports generate every 60 seconds automatically
- Fetch reports via: `GET /api/reports/history/{patientUserId}`

---

## 🔍 Debugging Guide

### **Problem: Serial Bridge Can't Find Arduino**

**Logs show:**
```
⏳ Scanning for IoT devices on USB ports...
```

**Solutions:**
1. Check USB cable connection
2. Verify Arduino is powered on
3. Check Device Manager for COM ports (Windows) or `/dev/tty*` (Linux/Mac)
4. Update Arduino drivers if needed
5. Try different USB port

### **Problem: Backend Not Broadcasting Data**

**Check:**
1. Verify serialBridge.js is running
2. Check backend logs for errors
3. Verify MongoDB is running: `mongosh`
4. Check database connection in logs

### **Problem: Dashboard Not Updating**

**Check:**
1. Open browser DevTools → Network tab
2. Look for WebSocket connection to `ws://localhost:5000`
3. Verify Socket.io events are received
4. Check frontend console for errors

### **Problem: Reports Not Generating**

**Check:**
1. Backend logs for: `✅ Report generated`
2. Verify data is being saved to DB: `db.healthreadings.find().limit(5)`
3. Check if patients exist: `db.patients.find().limit(5)`

---

## 📊 API Endpoints

### **Real-Time Data**
- **POST** `/api/device/device-data/:patientUserId` - Send IoT data

### **Reports**
- **GET** `/api/reports/history/:patientUserId` - Get report history
- **GET** `/api/reports/:reportId` - Get specific report
- **GET** `/api/reports/stats/:patientUserId` - Get report statistics
- **PUT** `/api/reports/:reportId/review` - Add doctor review

### **Health Data**
- **GET** `/api/health` - Health check
- **GET** `/data` - Latest vital reading (backward compat)

### **WebSocket Events**
- `join_room` - Join patient/doctor room
- `live_health_data` - Real-time vitals stream
- `global_stream_data` - Global vitals broadcast
- `health_report_generated` - Auto-generated reports
- `alert_report_generated` - Alert/anomaly reports

---

## 🛠 Important Notes

### **Report Generation**
- Runs automatically every 60 seconds
- Aggregates all readings from past 60 seconds
- Detects anomalies (HR, SpO2, Temp)
- Broadcasts via WebSocket to connected dashboards
- Stored in MongoDB `HealthReport` collection

### **Data Flow**
```
Arduino (JSON) 
  → Serial Port (9600 baud)
  → serialBridge.js (parsing + validation)
  → Backend POST (HTTP)
  → MongoDB (storage)
  → Socket.io (WebSocket broadcast)
  → Frontend (real-time update)
```

### **Thresholds for Anomalies**
- Heart Rate: 60-100 bpm (abnormal if outside)
- SpO2: 94-100% (abnormal if <94%)
- Temperature: 36-37.5°C (abnormal if outside)

---

## 📱 Feature Summary

✅ **Live Data Streaming**: Continuous sensor readings every 1-2 seconds  
✅ **Automatic Reports**: Generated every 60 seconds from aggregated data  
✅ **Real-Time Dashboard**: WebSocket-powered instant updates  
✅ **Anomaly Detection**: Automatic alerting for out-of-range values  
✅ **Report History**: Persistent storage and retrieval  
✅ **Multi-User Support**: Socket.io rooms for patient/doctor separation  

---

## 🆘 Support

If you encounter issues:
1. Check the debugging guide above
2. Review backend logs for error messages
3. Verify Arduino code uses `sendInterval = 1000` (1 second)
4. Ensure all three processes are running (backend, serial-bridge, frontend)

---

**Last Updated**: March 2026  
**Version**: 1.0.0
