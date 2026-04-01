#!/bin/bash

# Real-Time Data Flow Health Check
# Run this after making changes to verify everything is set up correctly

echo "🏥 HEALTHCONNECT REAL-TIME DATA DIAGNOSTIC"
echo "==========================================="
echo ""

PASS=0
FAIL=0

# Check 1: Frontend .env.local
echo "1️⃣  Frontend Environment Config"
if [ -f "frontend/.env.local" ]; then
    echo "   ✅ .env.local exists"
    if grep -q "VITE_SOCKET_URL=http://localhost:5000" frontend/.env.local; then
        echo "   ✅ VITE_SOCKET_URL correctly configured"
        ((PASS++))
    else
        echo "   ❌ VITE_SOCKET_URL incorrect or missing"
        ((FAIL++))
    fi
else
    echo "   ❌ .env.local NOT found"
    ((FAIL++))
fi

echo ""

# Check 2: MyStats.jsx has Socket.io improvements
echo "2️⃣  MyStats.jsx Socket.io Configuration"
if grep -q "transports: \['websocket', 'polling'\]" frontend/src/components/MyStats.jsx; then
    echo "   ✅ Reconnection options configured"
    ((PASS++))
else
    echo "   ⚠️  May need reconnection options"
fi

if grep -q "VITE_SOCKET_URL" frontend/src/components/MyStats.jsx; then
    echo "   ✅ Uses environment variable for Socket URL"
    ((PASS++))
else
    echo "   ❌ Still using hardcoded Socket URL"
    ((FAIL++))
fi

if grep -q "console.log.*RECEIVED global_stream_data" frontend/src/components/MyStats.jsx; then
    echo "   ✅ Has diagnostic logging"
    ((PASS++))
else
    echo "   ⚠️  Missing detailed logging"
fi

echo ""

# Check 3: Backend broadcast logging
echo "3️⃣  Backend Broadcasting Configuration"
if grep -q "📡 \[BROADCAST\]" backend/routes/deviceData.js; then
    echo "   ✅ Backend has broadcast logging"
    ((PASS++))
else
    echo "   ❌ Backend missing broadcast logging"
    ((FAIL++))
fi

echo ""

# Check 4: Key files exist
echo "4️⃣  Documentation Files"
for file in "REALTIME_SETUP.md" "REAL_TIME_DEBUG_GUIDE.md"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
        ((PASS++))
    else
        echo "   ⚠️  $file missing"
    fi
done

echo ""

# Summary
echo "==========================================="
echo "📊 DIAGNOSTIC SUMMARY"
echo "==========================================="
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 All checks passed! You're ready to go:"
    echo ""
    echo "  1. cd backend && npm run dev"
    echo "  2. (new terminal) cd backend && npm run serial-bridge -- --test"
    echo "  3. (new terminal) cd frontend && npm run dev"
    echo "  4. Open http://localhost:5173 and check browser console"
else
    echo "⚠️  There are $FAIL issues to fix. See above."
fi

echo ""
