#!/bin/bash

echo "======================================"
echo "🏥 HealthConnect Real-Time Verification"
echo "======================================"
echo ""

# Check if backend is running
echo "1️⃣  Checking Backend Server..."
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Backend API is running on http://localhost:5000"
else
    echo "❌ Backend NOT running on http://localhost:5000"
    echo "   Run: cd backend && npm run dev"
fi

echo ""
echo "2️⃣  Checking MongoDB Connection..."
if curl -s http://localhost:5000/api/health | grep -q "HealthConnect API"; then
    echo "✅ MongoDB appears to be connected (API responds OK)"
else
    echo "❌ MongoDB connection issue"
fi

echo ""
echo "3️⃣  Checking Serial Bridge Status..."
if grep -q "serialBridge" ../backend/package.json 2>/dev/null; then
    echo "ℹ️  Serial Bridge script available"
    echo "   Run: cd backend && npm run serial-bridge -- --test"
    echo "   (Use --test flag to simulate hardware data)"
else
    echo "⚠️  Serial Bridge not found"
fi

echo ""
echo "4️⃣  Frontend Environment Configuration..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    if grep -q "VITE_SOCKET_URL" .env.local; then
        SOCKET_URL=$(grep "VITE_SOCKET_URL" .env.local | cut -d'=' -f2)
        echo "   VITE_SOCKET_URL=$SOCKET_URL"
    else
        echo "❌ VITE_SOCKET_URL not configured"
    fi
else
    echo "❌ .env.local NOT found in frontend directory"
    echo "   Create it with:"
    echo "   VITE_API_URL=http://localhost:5000/api"
    echo "   VITE_SOCKET_URL=http://localhost:5000"
fi

echo ""
echo "======================================"
echo "📋 Next Steps:"
echo "======================================"
echo ""
echo "1. Start Backend:"
echo "   cd backend && npm run dev"
echo ""
echo "2. In another terminal, test Serial Bridge:"
echo "   cd backend && npm run serial-bridge -- --test"
echo ""
echo "3. In third terminal, start Frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Open browser DevTools (F12) and go to http://localhost:5173"
echo ""
echo "5. Monitor console for:"
echo "   ✅ Socket.io Connected"
echo "   ✅ RECEIVED global_stream_data"
echo "   📊 REAL-TIME DATA getting updated"
echo ""
echo "======================================"
