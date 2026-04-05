#!/bin/bash

# Clean restart script
# Kills all processes and clears caches before restarting

echo "🧹 Cleaning up..."
echo ""

# Kill all node processes
echo "1️⃣  Killing Node.js processes..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
sleep 1

# Clear Vite cache
echo "2️⃣  Clearing Vite cache..."
rm -rf /home/iguanya/Projects/forex-ai-insights/.vite 2>/dev/null || true
rm -rf /home/iguanya/Projects/forex-ai-insights/dist 2>/dev/null || true

# Clear node cache
echo "3️⃣  Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

echo "✅ Cleanup complete!"
echo ""
echo "🚀 Starting fresh..."
echo ""

# Start fresh
cd /home/iguanya/Projects/forex-ai-insights
npm run dev:all
