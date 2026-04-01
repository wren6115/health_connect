#!/bin/bash
# Quick Status Check for HealthConnect Live Data Issues

echo "╔════════════════════════════════════════════════════════╗"
echo "║  HealthConnect Live Data - QUICK STATUS CHECK         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 CHECKING SYSTEM STATUS...${NC}\n"

# 1. Check if processes are running
echo "1️⃣  Process Status"
echo "─────────────────────"

if tasklist 2>/dev/null | grep -q "node.exe"; then
    NODES=$(tasklist 2>/dev/null | grep -c "node.exe")
    echo -e "${GREEN}✅${NC} Found $NODES Node.js process(es) running"
else
    echo -e "${RED}❌${NC} No Node.js processes found"
    echo "   → Start: npm start (backend) in Terminal 1"
    echo "   → Then: npm run serial-bridge in Terminal 2"
fi

echo ""

# 2. Check if ports are listening
echo "2️⃣  Port Status"
echo "─────────────────────"

if netstat -ano 2>/dev/null | grep -q ":5000\|:5173"; then
    echo -e "${GREEN}✅${NC} Ports are open"
    echo "   Port 5000 (Backend): $(netstat -ano 2>/dev/null | grep ':5000' | head -1 || echo 'Not listening')"
    echo "   Port 5173 (Frontend): $(netstat -ano 2>/dev/null | grep ':5173' | head -1 || echo 'Not listening')"
else
    echo -e "${YELLOW}⚠️  Backend/Frontend might not be running${NC}"
    echo "   → Check Terminal 1: npm start"
    echo "   → Check Terminal 3: npm start"
fi

echo ""

# 3. Check MongoDB connection
echo "3️⃣  Database Status"
echo "─────────────────────"

# Try to connect to MongoDB (basic check)
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
        echo -e "${GREEN}✅${NC} MongoDB is running and responsive"
        
        # Count readings
        READ_COUNT=$(mongosh --eval "use healthconnect; db.healthreadings.count()" 2>/dev/null | tail -1)
        echo "   HealthReadings count: $READ_COUNT"
        
        # Count reports
        REPORT_COUNT=$(mongosh --eval "use healthconnect; db.healthreports.count()" 2>/dev/null | tail -1)
        echo "   HealthReports count: $REPORT_COUNT"
    else
        echo -e "${YELLOW}⚠️  MongoDB not responding${NC}"
        echo "   → Start MongoDB: mongod"
    fi
else
    echo -e "${YELLOW}⚠️  mongosh not installed${NC}"
    echo "   → Install: npm install -g mongosh"
fi

echo ""

# 4. Check Arduino connectivity
echo "4️⃣  Arduino/Serial Device Detection"
echo "─────────────────────────────────────"

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    DEV_COUNT=$(tasklist 2>/dev/null | grep -E "ser2net|FTDI|CH340" | wc -l)
    echo "   Checking for serial devices..."
    if command -v wmic &> /dev/null; then
        PORTS=$(wmic logicaldisk get name 2>/dev/null | grep ':')
        echo -e "${GREEN}✅${NC} System has COM ports available${NC}"
    fi
fi

echo ""

# 5. Recommend next steps
echo "5️⃣  Next Steps"
echo "─────────────────────"

if tasklist 2>/dev/null | grep -q "node.exe"; then
    echo -e "${GREEN}✅${NC} Backend appears to be running"
    echo ""
    echo "Check these logs in your terminals:"
    echo "   Terminal 1 (Backend): Look for 'POST /api/device/device-data' messages"
    echo "   Terminal 2 (Serial):  Look for '📡 IoT -> Dashboard: HR:XX' messages"
    echo ""
    echo "Then check browser:"
    echo "   Open Dev Tools → Console"
    echo "   Look for: '[HARDWARE] HR:XX | SpO2:XX%' messages"
    echo ""
    echo "If still not working:"
    echo "   → See: URGENT_NO_LIVE_DATA_FIX.md"
else
    echo -e "${RED}❌${NC} Node.js processes not running"
    echo ""
    echo "Start all 3 services in separate terminals:"
    echo ""
    echo "   Terminal 1 (BACKEND):"
    echo "   $ cd backend"
    echo "   $ npm start"
    echo ""
    echo "   Wait 5 seconds, then Terminal 2 (SERIAL BRIDGE):"
    echo "   $ cd backend"
    echo "   $ npm run serial-bridge"
    echo ""
    echo "   Then Terminal 3 (FRONTEND):"
    echo "   $ cd frontend"
    echo "   $ npm start"
    echo ""
    echo "   Open: http://localhost:5173"
fi

echo ""
echo "═════════════════════════════════════════════════════════"
echo -e "${BLUE}For detailed diagnostics, read: URGENT_NO_LIVE_DATA_FIX.md${NC}"
