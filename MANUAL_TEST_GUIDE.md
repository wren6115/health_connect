# HealthConnect - Manual Data Flow Test (Bypass Serial Bridge)

## 🧪 Test Without Arduino/Serial Bridge

This helps you verify that your backend and frontend ARE working - to isolate if the issue is with the serial bridge.

---

## **Test 1: Send Test Data to Backend**

Open Postman or use curl to send test vitals:

### **Using curl**

```bash
# Send test data to backend
curl -X POST http://localhost:5000/api/device/device-data/PASTE_PATIENT_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "hr": 75,
    "spo2": 96,
    "temp": 36.7,
    "source": "test"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "reading": {
    "_id": "...",
    "heartRate": 75,
    "spo2": 96,
    "temperature": 36.7,
    "timestamp": "2026-03-31T10:30:45.123Z"
  }
}
```

**If you get this**: ✅ Backend is working!

**If you get an error**: ❌ Backend has an issue

---

## **Finding Your Patient ID**

You need `PASTE_PATIENT_ID_HERE` - this is your patient's user ID.

### **Get it from Database**

```bash
mongosh
use healthconnect
db.patients.findOne()
# Copy the "userId" field
```

**Example output**:
```javascript
{
  "_id": ObjectId("..."),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "email": "patient@example.com",
  ...
}
```

Use the `userId` value in the curl command above.

---

## **Test 2: Check if Frontend Receives Data**

After sending test data (Test 1):

1. **Open Dashboard**: http://localhost:5173/mystats
2. **Open Browser DevTools**: Press F12
3. **Go to Console tab**
4. **Look for these messages**:
   ```
   [TEST] HR:75 | SpO2:96% | Temp:36.7°C
   ```

**If you see this**: ✅ WebSocket is working!

**If you DON'T see this**: ❌ WebSocket has an issue

---

## **Test 3: Send Continuous Test Data (Simulate Stream)**

Save this as `test_data.sh` (or `test_data.ps1` for Windows):

### **For Mac/Linux** - `test_data.sh`

```bash
#!/bin/bash

PATIENT_ID="YOUR_PATIENT_ID_HERE"
BACKEND_URL="http://localhost:5000/api/device/device-data/$PATIENT_ID"

echo "Sending continuous test data to backend..."
echo "PATIENT_ID: $PATIENT_ID"
echo "URL: $BACKEND_URL"
echo "Press Ctrl+C to stop"
echo ""

HR=72
while true; do
    SPO2=$((92 + RANDOM % 9))
    TEMP=$(echo "36.5 + $(echo 'scale=1; $RANDOM/32768' | bc)" | bc)
    
    echo "[$(date '+%H:%M:%S')] Sending HR:$HR | SpO2:$SPO2% | Temp:$TEMP°C"
    
    curl -s -X POST "$BACKEND_URL" \
      -H "Content-Type: application/json" \
      -d "{\"hr\": $HR, \"spo2\": $SPO2, \"temp\": $TEMP, \"source\": \"test\"}" > /dev/null
    
    HR=$((70 + RANDOM % 30))
    sleep 1
done
```

### **For Windows** - `test_data.ps1`

```powershell
$PATIENT_ID = "YOUR_PATIENT_ID_HERE"
$BACKEND_URL = "http://localhost:5000/api/device/device-data/$PATIENT_ID"

Write-Host "Sending continuous test data to backend..."
Write-Host "PATIENT_ID: $PATIENT_ID"
Write-Host "URL: $BACKEND_URL"
Write-Host "Press Ctrl+C to stop"
Write-Host ""

while ($true) {
    $HR = Get-Random -Minimum 70 -Maximum 100
    $SPO2 = Get-Random -Minimum 92 -Maximum 100
    $TEMP = [math]::Round(36.5 + (Get-Random -Minimum 0 -Maximum 20) / 10, 1)
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] Sending HR:$HR | SpO2:$SPO2% | Temp:$TEMP°C"
    
    $body = @{
        hr = $HR
        spo2 = $SPO2
        temp = $TEMP
        source = "test"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri $BACKEND_URL -Method Post `
        -ContentType "application/json" `
        -Body $body | Out-Null
    
    Start-Sleep -Seconds 1
}
```

### **Run it**

**Mac/Linux**:
```bash
chmod +x test_data.sh
./test_data.sh
```

**Windows**:
```powershell
# May need to enable scripts first:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

.\test_data.ps1
```

---

## **What These Tests Tell You**

| Test | If Works | If Fails | Means |
|------|----------|----------|-------|
| Test 1 (Curl) | ✅ Data stored in DB | ❌ 404/500 error | Backend configuration |
| Test 2 (Console) | ✅ Events visible | ❌ No event logs | WebSocket issue |
| Test 3 (Continuous) | ✅ Charts update | ❌ No updates | Frontend reactivity |

---

## 🔍 **Interpretation Guide**

### **Scenario A: All Tests Pass ✅✅✅**

**Verdict**: Backend, database, and frontend are all working correctly.

**Problem**: Serial bridge (the missing piece)

**Solution**: 
```bash
cd backend
npm run serial-bridge
```

Check if Arduino is connected and powered.

---

### **Scenario B: Test 1 Works, Tests 2+3 Fail ❌**

**Verdict**: Backend works, but WebSocket not receiving data.

**Problem**: WebSocket event not emitted or frontend not listening

**Solution**:
1. Check if `source` field is in the POST request
2. Verify `global_stream_data` event is emitted (add console logs to deviceData.js)
3. Check browser console for Socket.io errors

---

### **Scenario C: Test 1 Fails ❌**

**Verdict**: Backend cannot process the data.

**Problem**: Could be multiple:
- Wrong patient ID
- Backend route error
- Database not connected
- Patient not found

**Solution**:
1. Verify patient exists: `db.patients.findOne()`
2. Verify backend is running: `curl http://localhost:5000/api/health`
3. Check backend logs for errors
4. Verify .env config

---

## 📍 **Quick Diagnostic Decision Tree**

```
Is dashboard showing data?
├─ YES → Done! Your system works
├─ NO
  ├─ Is WebSocket connected? (Check CONNECTED badge)
  │  ├─ NO → Backend/WebSocket issue
  │  │   └─ Fix: Restart backend and serial bridge
  │  ├─ YES but MODE: UNKNOWN → Data not flowing
  │      └─ Run Test 1 (curl) to verify backend
  │          ├─ Test 1 Works → Serial bridge not running
  │          │   └─ Fix: npm run serial-bridge
  │          ├─ Test 1 Fails → Backend configuration issue
  │              └─ Fix: Check backend logs and database
```

---

## 💡 **Pro Tips**

**Tip 1**: If Test 1 works but serial bridge doesn't detect Arduino:
- Arduino needs to be sending JSON data first
- Check Arduino serial monitor at 9600 baud

**Tip 2**: If data flows but charts don't update:
- Hard refresh browser: Ctrl+Shift+R
- Clear browser cache
- Check chart.js library is loaded

**Tip 3**: To debug WebSocket events, add to browser console:
```javascript
// Get socket if available
const socket = window.io('http://localhost:5000');
socket.on('global_stream_data', (data) => {
    console.log('📊 RECEIVED:', data);
});
```

---

## ✅ **Expected Results After Tests**

After all tests pass:

1. ✅ Backend receives and stores data
2. ✅ WebSocket emits `global_stream_data` events
3. ✅ Frontend receives events and updates state
4. ✅ Charts render with new data points
5. ✅ Dashboard shows MODE: HARDWARE
6. ✅ Vitals display real numbers

---

**Run these tests now to identify exactly where the issue is!**
