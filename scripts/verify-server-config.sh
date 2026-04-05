#!/bin/bash

# Server Configuration Verification Script
# Tests if frontend and backend can communicate properly

SERVER_IP="144.172.112.31"
FRONTEND_PORT=8080
BACKEND_PORT=3000
DB_PORT=3306

echo "🔍 Checking Server Configuration"
echo "================================="
echo ""

# Check 1: Environment files
echo "1️⃣  Environment Configuration Files:"
echo "   Frontend (.env.local):"
if grep -q "144.172.112.31:3000" /home/iguanya/Projects/forex-ai-insights/.env.local; then
    echo "   ✅ API_BASE_URL uses server IP"
else
    echo "   ❌ API_BASE_URL not using server IP"
fi

echo ""
echo "   Backend (.env):"
if grep -q "144.172.112.31:8080" /home/iguanya/Projects/forex-ai-insights/.env; then
    echo "   ✅ ALLOWED_ORIGINS includes frontend IP"
else
    echo "   ❌ ALLOWED_ORIGINS missing frontend IP"
fi

echo ""

# Check 2: Ports in use
echo "2️⃣  Checking Open Ports:"

for PORT in $FRONTEND_PORT $BACKEND_PORT $DB_PORT; do
    if netstat -tlnp 2>/dev/null | grep -q ":$PORT "; then
        echo "   ✅ Port $PORT is listening"
    else
        case $PORT in
            $FRONTEND_PORT) echo "   ❌ Port $PORT (Frontend) - NOT listening" ;;
            $BACKEND_PORT) echo "   ❌ Port $PORT (Backend) - NOT listening" ;;
            $DB_PORT) echo "   ❌ Port $PORT (MySQL) - NOT listening" ;;
        esac
    fi
done

echo ""

# Check 3: Test API connectivity
echo "3️⃣  Testing API Connectivity:"

BACKEND_URL="http://$SERVER_IP:$BACKEND_PORT"
HEALTH_CHECK="$BACKEND_URL/api/health"

if timeout 3 curl -s "$HEALTH_CHECK" > /dev/null 2>&1; then
    echo "   ✅ Backend is responding"
else
    echo "   ⚠️  Backend health check failed (may not have /health endpoint)"
fi

echo ""

# Check 4: Database connectivity
echo "4️⃣  Testing Database Connectivity:"

if timeout 3 mysql -h $SERVER_IP -u root -p'root_root' --skip-ssl -e "SELECT 1" > /dev/null 2>&1; then
    echo "   ✅ MySQL database is accessible"
    
    # Check tables
    TABLE_COUNT=$(mysql -h $SERVER_IP -u root -p'root_root' --skip-ssl trading -e "SHOW TABLES;" 2>/dev/null | wc -l)
    if [ $TABLE_COUNT -gt 1 ]; then
        echo "   ✅ Database has $((TABLE_COUNT - 1)) tables"
    else
        echo "   ❌ No tables found in database"
    fi
else
    echo "   ❌ Cannot connect to MySQL database"
fi

echo ""

# Check 5: File permissions
echo "5️⃣  Checking File Permissions:"

if [ -r /home/iguanya/Projects/forex-ai-insights/.env.local ]; then
    echo "   ✅ .env.local is readable"
else
    echo "   ❌ Cannot read .env.local"
fi

echo ""

# Check 6: Dependencies
echo "6️⃣  Checking Dependencies:"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js installed: $NODE_VERSION"
else
    echo "   ❌ Node.js not found"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "   ✅ npm installed: $NPM_VERSION"
else
    echo "   ❌ npm not found"
fi

if command -v mysql &> /dev/null; then
    MYSQL_VERSION=$(mysql --version)
    echo "   ✅ MySQL client installed"
else
    echo "   ⚠️  MySQL client not installed (optional)"
fi

echo ""
echo "================================="
echo "✨ Configuration Check Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Start backend:  cd backend && npm run dev"
echo "   2. Start frontend: npm run dev:frontend"
echo "   3. Visit: http://$SERVER_IP:$FRONTEND_PORT"
echo "   4. Test login with admin@example.com / admin123"
echo ""
