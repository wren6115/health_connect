# 🚨 REAL DEVICE DATA - NOT APPEARING

## The Problem
Your dashboard shows:
- ✅ Socket.io Connected
- ✅ Data is flowing
- ❌ But source says "TEST" or "UNKNOWN" instead of "HARDWARE"

---

## 🔍 QUICK DIAGNOSIS

### Step 1: Check What Serial Bridge Is Running
Look at your 3 terminals:

**Terminal 1 (Backend):**
```bash
cd backend && npm run dev
```
Should show:
```
🏥 HealthConnect API Server running on http://localhost:5000
```
✅ This is correct.

**Terminal 2 (Serial Bridge):**
```bash
# ❌ WRONG - Shows TEST DATA:
cd backend && npm run serial-bridge -- --test
# Console shows: [12:34:56] 📡 [TEST] HR:72.5 | SpO2:96.0%

# ✅ RIGHT - Should connect to REAL Arduino:
cd backend && npm run serial-bridge
# Console should show: 🔌 Connected to COM3
```

**What are you running in Terminal 2?** 🤔

---

## 💡 THE SOLUTION

### If Arduino is Connected to COM3:
```bash
# Kill --test process first
# Then run WITHOUT --test flag:
cd backend
npm run serial-bridge
```

**Expected output:**
```
✅ Bridge mapped to Patient User ID: 507f1f77bcf86cd799439011
🔌 Connected to COM3 (ESP32 or Arduino manufacturer)
✅ Serial connection established. Reading data...
[12:34:56] 📡 IoT -> Dashboard: HR:72 | SpO2:96% | Temp:36.5°C
```

### If Arduino is NOT Connected:
```bash
# Keep using TEST mode for now:
cd backend
npm run serial-bridge -- --test
```

This is fine for development!

---

## 🔧 STEP-BY-STEP TO USE REAL DEVICE DATA

### 1. Check Arduino Connection
Windows Command Prompt:
```bash
# List COM ports to see if COM3 is available:
mode
# or in PowerShell:
Get-CimInstance -ClassName Win32_SerialPort
```

**You should see:**
```
COM3    → Your device (Arduino/ESP32)
```

If COM3 is **NOT listed:**
- ❌ Arduino not connected via USB
- ✅ Connect the USB cable to the computer now

### 2. Kill Old Serial Bridge Process
```bash
# Find the PID (first number) of serial bridge:
tasklist | grep node

# Kill the test one:
taskkill /PID [number] /F
# OR kill all:
taskkill /F /IM node.exe
```

### 3. Restart Serial Bridge (NO --test)
```bash
cd backend
npm run serial-bridge
```

**Watch the console:**
- If you see `🔌 Connected to COM3` → ✅ Success!
- If you see `⏳ Scanning for IoT device...` → ❌ Device not found, check connection

### 4. Check Browser Console
Now visit http://localhost:5173 and press F12.

**Look for:**
```
✅ RECEIVED: global_stream_data {hr: 72, spo2: 96, ..., source: "hardware"}
                                                          ^^^^^^^^
```

**If source is "hardware":**
- ✅ You're getting real device data!
- Dashboard should show MODE: HARDWARE (in blue)

**If source is "test_simulation":**
- ❌ Still running --test mode
- Kill process and restart without --test flag

---

## 📊 SOURCE VALUES EXPLAINED

| If you see... | Means | What to do |
|---|---|---|
| `"source": "hardware"` | ✅ Real Arduino/ESP32 | Keep running! |
| `"source": "test_simulation"` | ❌ Fake test data | Stop --test, restart without flag |
| `"source": "unknown"` | ❌ Data broken | Check backend broadcast |

---

## 🆘 MY ARDUINO ISN'T RECOGNIZED

**Most Common Issues:**

1. **Wrong COM Port**
   - Arduino might be on COM4, COM5, etc. (not COM3)
   - Check: `mode` command to see available ports
   - If different port, update in `backend/serialBridge.js` line 10: `path: 'COM3'` → `path: 'COM[X]'`

2. **USB Driver Missing**
   - Install: https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers
   - Or if using Arduino: https://www.arduino.cc/en/Guide

3. **USB Cable Issue**
   - Try a different USB cable (some are charge-only)
   - Try a different USB port on computer

4. **Device Not Powered**
   - Arduino must have power (USB powered)
   - LED should be blinking

---

## ⚡ QUICK TEST: Manual Serial Check

If you want to verify Arduino is actually sending data:

```bash
# Windows PowerShell - Read COM3:
$port = New-Object System.IO.Ports.SerialPort COM3,115200
$port.Open()
$port.ReadLine()
$port.Close()

# If you see JSON like: {"hr":72,"spo2":96,"temp":36.5}
# → Arduino is working!
```

---

## 📋 TELL ME:

When you're ready:
1. **Is your Arduino device connected via USB to COM3?** YES / NO / UNSURE
2. **What does your Terminal 2 (Serial Bridge) console show?** (copy last 5 lines)
3. **What source value appears on dashboard?** (TEST / HARDWARE / UNKNOWN)
4. **Does browser console show connect errors?** (red text)

With this info, I can instantly tell you exactly how to fix it! 🎯
