#!/bin/bash
set -e

echo "================================"
echo "Forex AI Insights - Setup Wizard"
echo "================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "This wizard will help you configure real forex data from free API providers."
echo ""

# Option 1: Alpha Vantage
read -p "Do you want to set up Alpha Vantage? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📍 Alpha Vantage Setup:"
    echo "   1. Go to https://www.alphavantage.co/"
    echo "   2. Click 'GET FREE API KEY'"
    echo "   3. Enter your email and get instant API key"
    echo ""
    read -p "Enter your Alpha Vantage API key: " alpha_key
    if [ ! -z "$alpha_key" ]; then
        supabase secrets set ALPHA_VANTAGE_API_KEY "$alpha_key"
        echo "✅ Alpha Vantage API key configured!"
    fi
fi

echo ""

# Option 2: Twelve Data
read -p "Do you want to set up Twelve Data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📍 Twelve Data Setup:"
    echo "   1. Go to https://twelvedata.com/"
    echo "   2. Sign up for free account"
    echo "   3. Find your API key in Dashboard"
    echo ""
    read -p "Enter your Twelve Data API key: " twelve_key
    if [ ! -z "$twelve_key" ]; then
        supabase secrets set TWELVE_DATA_API_KEY "$twelve_key"
        echo "✅ Twelve Data API key configured!"
    fi
fi

echo ""

# Option 3: ExchangeRate-API
read -p "Do you want to set up ExchangeRate-API? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📍 ExchangeRate-API Setup:"
    echo "   1. Go to https://www.exchangerate-api.com/"
    echo "   2. Sign up for free account"
    echo "   3. Find your API key in Dashboard"
    echo ""
    read -p "Enter your ExchangeRate-API key: " exchange_key
    if [ ! -z "$exchange_key" ]; then
        supabase secrets set EXCHANGE_RATE_API_KEY "$exchange_key"
        echo "✅ ExchangeRate-API key configured!"
    fi
fi

echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Deploy updated Supabase function:"
echo "   supabase functions deploy forex-rates"
echo ""
echo "2. Try your app:"
echo "   npm run dev"
echo ""
echo "3. Go to Market page and check for LIVE status indicator"
echo ""
echo "Need help? See FOREX_DATA_SETUP.md for detailed instructions"
