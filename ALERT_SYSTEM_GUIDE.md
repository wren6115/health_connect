# Alert & Notification System - Implementation Guide

## Overview
A real-time health alert system that detects abnormal vital signs and prompts users to confirm they're okay or request help. The system includes a 15-second countdown timer that auto-escalates to emergency protocols if no response is received.

---

## 🚀 How It Works

### Flow Diagram
```
IoT Device/App sends vitals
        ↓
Backend validates data
        ↓
checkAbnormalities() checks thresholds
        ↓
If ABNORMAL → Create Alert + emit feedback_request
        ↓
Frontend receives socket event → Show AlertNotification popup
        ↓
User clicks "I'm OK" or "Get Help!"
        ↓
Frontend sends alert response → Backend marks alert status
        ↓
If "OK" → 2-min cooldown, alert resolved
If "GET HELP" → Escalate to emergency protocols
```

---

## 📋 Components

### 1. **AlertNotification.jsx** (Frontend)
New component that displays the alert popup to users.

**Features:**
- ✅ **Visual Alert Display** - Shows abnormal reading with severity color coding
- ✅ **Countdown Timer** - 15-second timer shows auto-escalation warning
- ✅ **Vitals Snapshot** - Displays current HR, SpO2, Temperature
- ✅ **Action Buttons** - "I'm OK" (green) or "Get Help!" (red)
- ✅ **Animations** - Slide-in animation + pulse effect for critical alerts
- ✅ **Response Handling** - Sends user response to backend via API

**Location:** `frontend/src/components/AlertNotification.jsx`

### 2. **MyStats.jsx** (Frontend - UPDATED)
Modified to listen for and display alerts.

**Changes:**
- Added `alert` state to store incoming alert
- Added socket listener for `feedback_request` event
- Imported and rendered AlertNotification component
- Alert automatically dismisses after user responds

**Key Lines:**
```javascript
// Listen for abnormal health alert requests
socket.on('feedback_request', (data) => {
    console.log('🚨 Alert received:', data);
    setAlert(data);
});

// Render alert notification
<AlertNotification 
    alert={alert}
    onRespond={() => setAlert(null)}
    onDismiss={() => setAlert(null)}
/>
```

### 3. **alertService.js** (Backend - EXISTING)
Backend service that detects abnormal readings and creates alerts.

**Key Functions:**
- `checkAbnormalities()` - Checks vitals against thresholds
- `resolveAlert()` - Handles user response (OK/NOT OK)
- `executeTimeoutEscalation()` - Auto-escalates if no response

**Thresholds (Configurable via .env):**
```
Heart Rate: 50-100 BPM (low/high)
SpO2: <92% (critical)
Temperature: 35-38°C (hypothermia/fever)
```

---

## 🔄 Alert Lifecycle

### Status States:
1. **WAITING_FOR_RESPONSE** - User prompt shown, waiting for action
   - Duration: 15 seconds
   - Action: User clicks "I'm OK" or "Get Help!"

2. **RESOLVED** - User confirmed they're okay
   - Result: 2-minute cooldown window
   - Alert muted for vitals stabilization
   - Next alert can trigger after 2 minutes

3. **ESCALATED** - User requested help or 15s timeout
   - Result: Alert sent to doctors/admins
   - Emergency protocols triggered (SMS, API calls)
   - Insurance & Ambulance dispatch APIs notified

---

## 📡 Socket Events

### Frontend → Backend:
**HTTP POST `/api/device/alert-response`**
```json
{
  "alertId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "isOkay": true  // true = "I'm OK", false = "Get Help!"
}
```

### Backend → Frontend:
**Socket Event: `feedback_request`**
```json
{
  "alertId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "message": "🚨 High Heart Rate: 120 bpm",
  "severity": "critical",
  "vitalsSnapshot": {
    "heartRate": 120,
    "spo2": 95,
    "temperature": 36.5
  }
}
```

---

## 🎨 Alert Severity Levels

### CRITICAL (Red)
- Heart Rate: < 50 or > 100 BPM
- SpO2: < 92%
- Temperature: < 35°C or > 38°C
- **Effect:** Pulsing animation, urgent messaging

### WARNING (Orange)
- Used for moderate concerns
- **Effect:** Standard alert with orange border

### INFO (Cyan)
- Used for routine notifications
- **Effect:** Informational alert

---

## 🛠️ Testing the System

### Test Scenario 1: High Heart Rate Alert
1. Navigate to MyStats dashboard
2. Wait for vital data (or trigger with abnormal reading)
3. When HR > 100 BPM → AlertNotification should appear
4. Click "I'm OK" → Alert resolves with success message
5. Check database: Alert status changed to "RESOLVED"

### Test Scenario 2: Emergency Escalation
1. Trigger abnormal reading (same as above)
2. Wait 15 seconds without clicking
3. Alert should automatically escalate
4. Admins/Doctors should receive escalation notification
5. SMS sent to emergency contact (if Twilio configured)

### Test Scenario 3: User Requests Help
1. Trigger abnormal reading
2. Click "Get Help!" button
3. Alert immediately escalates to ESCALATED status
4. Emergency protocols triggered instantly
5. Medical team receives notification

---

## 🔧 Configuration

### Environment Variables (.env)
```
HR_LOW=50                    # Minimum acceptable heart rate
HR_HIGH=100                  # Maximum acceptable heart rate
SPO2_CRITICAL=92            # Critical SpO2 level
TEMP_FEVER=38.0             # Fever threshold
TEMP_HYPOTHERMIA=35.0       # Hypothermia threshold
TWILIO_ACCOUNT_SID=          # SMS for emergency
TWILIO_AUTH_TOKEN=           # SMS for emergency
TWILIO_PHONE_NUMBER=         # SMS sender
```

### Timeout Settings (Code)
- **Response Window:** 15 seconds
- **Cooldown Period (After "OK"):** 2 minutes
- **Re-escalation Wait:** 5 minutes

---

## ⚙️ Integration Checklist

- [x] AlertNotification.jsx created
- [x] MyStats.jsx updated to listen to alerts
- [x] Socket event `feedback_request` listening
- [x] Alert response API integration
- [x] UI displays abnormal readings
- [x] User can respond with "OK" or "Get Help!"
- [x] Backend receives response via `/alert-response`
- [x] Timer countdown implemented
- [x] Auto-escalation after 15 seconds

---

## 🚨 Emergency Protocol Triggers

When user clicks "Get Help!" or 15-second timer expires:

1. **Alert Status:** Changed to ESCALATED
2. **Doctor/Admin Notification:** Real-time socket event sent
3. **SMS Alert:** Emergency contact notified (if Twilio configured)
4. **API Calls:**
   - Insurance API pinged with patient ID
   - Ambulance dispatch API called with location
5. **Dashboard:** Alert appears in admin dashboard as high-priority

---

## 📊 Real-World Example

**User Scenario:**
- Patient's heart rate spikes to 120 BPM while using app
- AlertNotification popup appears: "🚨 High Heart Rate: 120 bpm"
- Countdown timer shows: "Auto-escalate in 15s"
- **Option 1 (Patient OK):** User clicks "I'm OK" → Alert resolved, 2-min cooldown
- **Option 2 (Patient Needs Help):** User clicks "Get Help!" → Immediately escalates to emergency team
- **Option 3 (No Response):** After 15 seconds → Automatically escalates + SMS sent to emergency contact

---

## 🔍 Debugging

### Check Alert Creation
```javascript
// Backend logs when alert is created:
🔔 [NEW ALERT] Patient John Doe -> 🚨 High Heart Rate: 120 bpm. 15s Countdown Started!
```

### Check Socket Events
```javascript
// Frontend console logs:
🚨 Alert received: { alertId: "...", message: "...", severity: "critical" }
```

### Database Query
```javascript
// Check alert status changes:
db.alerts.find({ patientId: "..." }).sort({ timestamp: -1 }).limit(5)
```

---

## 📝 Database Schema

### Alert Model
```json
{
  "_id": ObjectId,
  "patientId": ObjectId,              // Reference to Patient
  "type": "Heart Rate|SpO2|Temperature|Blood Pressure|SOS",
  "severity": "info|warning|critical",
  "status": "WAITING_FOR_RESPONSE|RESOLVED|ESCALATED",
  "value": Number,                    // The abnormal reading
  "message": String,                  // "🚨 High Heart Rate: 120 bpm"
  "isRead": Boolean,
  "timestamp": Date
}
```

---

## 🎯 Next Steps / Future Enhancements

1. **Persistence:** Store unread alerts and display in Notifications center
2. **Alert History:** Show past alerts with user response history
3. **Custom Thresholds:** Allow patients to set personal alert thresholds
4. **Noise Reduction:** Implement ML to detect false positives
5. **Multi-Language:** Translate alerts to user's preferred language
6. **Smart Thresholds:** Adjust thresholds based on patient profile/activity

---

## 📞 Support

For issues or questions:
1. Check backend logs: `Backend console output`
2. Check frontend console: `Browser DevTools → Console`
3. Verify socket connection: `Check "CONNECTED" badge on MyStats`
4. Test API endpoint: Use Postman to test `/alert-response`

---

**System Status:** ✅ Fully Implemented and Ready for Testing
