#!/bin/bash

echo "================================"
echo "Forex Data Integration Test"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0

run_test() {
  local test_name=$1
  local command=$2
  test_count=$((test_count + 1))
  
  echo -n "Test $test_count: $test_name... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}✗ FAIL${NC}"
  fi
}

# Test 1: Check Supabase CLI
run_test "Supabase CLI installed" "command -v supabase"

# Test 2: Check if connected to Supabase
run_test "Supabase project configured" "supabase projects list | grep -q 'default'"

# Test 3: Check if function exists
run_test "forex-rates function exists" "supabase functions list | grep -q 'forex-rates'"

# Test 4: Check secrets are configured
echo ""
echo "Checking API Keys configured:"
echo ""

if supabase secrets list | grep -q "ALPHA_VANTAGE_API_KEY"; then
  echo -e "${GREEN}✓ Alpha Vantage API key configured${NC}"
  pass_count=$((pass_count + 1))
else
  echo -e "${YELLOW}○ Alpha Vantage API key NOT configured${NC}"
fi
test_count=$((test_count + 1))

if supabase secrets list | grep -q "TWELVE_DATA_API_KEY"; then
  echo -e "${GREEN}✓ Twelve Data API key configured${NC}"
  pass_count=$((pass_count + 1))
else
  echo -e "${YELLOW}○ Twelve Data API key NOT configured${NC}"
fi
test_count=$((test_count + 1))

if supabase secrets list | grep -q "EXCHANGE_RATE_API_KEY"; then
  echo -e "${GREEN}✓ ExchangeRate-API key configured${NC}"
  pass_count=$((pass_count + 1))
else
  echo -e "${YELLOW}○ ExchangeRate-API key NOT configured${NC}"
fi
test_count=$((test_count + 1))

# Test 5: Check environment files
echo ""
echo "Checking environment files:"
echo ""

if [ -f ".env.local" ]; then
  echo -e "${GREEN}✓ .env.local exists${NC}"
  pass_count=$((pass_count + 1))
  
  if grep -q "VITE_SUPABASE_URL" .env.local; then
    echo -e "  ${GREEN}✓ VITE_SUPABASE_URL configured${NC}"
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${RED}✗ VITE_SUPABASE_URL NOT configured${NC}"
  fi
  test_count=$((test_count + 1))
  
  if grep -q "VITE_SUPABASE_PUBLISHABLE_KEY" .env.local; then
    echo -e "  ${GREEN}✓ VITE_SUPABASE_PUBLISHABLE_KEY configured${NC}"
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${RED}✗ VITE_SUPABASE_PUBLISHABLE_KEY NOT configured${NC}"
  fi
  test_count=$((test_count + 1))
else
  echo -e "${YELLOW}○ .env.local not found${NC}"
  echo "  Run: cp .env.local.example .env.local"
fi

# Test 6: Test API endpoints
echo ""
echo "Testing API Endpoints:"
echo ""

# Get keys for testing
alpha_key=$(supabase secrets list 2>/dev/null | grep ALPHA_VANTAGE | awk '{print $NF}' 2>/dev/null)
twelve_key=$(supabase secrets list 2>/dev/null | grep TWELVE_DATA | awk '{print $NF}' 2>/dev/null)
exchange_key=$(supabase secrets list 2>/dev/null | grep EXCHANGE_RATE | awk '{print $NF}' 2>/dev/null)

# Test Alpha Vantage
echo -n "Testing Alpha Vantage API... "
if [ ! -z "$alpha_key" ]; then
  response=$(curl -s "https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=EUR&to_currency=USD&apikey=${alpha_key}" 2>/dev/null)
  if echo "$response" | grep -q "Realtime Currency Exchange Rate"; then
    echo -e "${GREEN}✓ Working${NC}"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}✗ Failed${NC}"
    if echo "$response" | grep -q "Invalid API call"; then
      echo "  Error: Invalid API key or rate limited"
    fi
  fi
else
  echo -e "${YELLOW}○ Skipped (API key not set)${NC}"
fi
test_count=$((test_count + 1))

# Test Twelve Data
echo -n "Testing Twelve Data API... "
if [ ! -z "$twelve_key" ]; then
  response=$(curl -s "https://api.twelvedata.com/quote?symbol=EURUSD&apikey=${twelve_key}" 2>/dev/null)
  if echo "$response" | grep -q "bid"; then
    echo -e "${GREEN}✓ Working${NC}"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}✗ Failed${NC}"
  fi
else
  echo -e "${YELLOW}○ Skipped (API key not set)${NC}"
fi
test_count=$((test_count + 1))

# Test ExchangeRate-API
echo -n "Testing ExchangeRate-API... "
if [ ! -z "$exchange_key" ]; then
  response=$(curl -s "https://v6.exchangerate-api.com/v6/${exchange_key}/latest/EUR" 2>/dev/null)
  if echo "$response" | grep -q "conversion_rates"; then
    echo -e "${GREEN}✓ Working${NC}"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}✗ Failed${NC}"
  fi
else
  echo -e "${YELLOW}○ Skipped (API key not set)${NC}"
fi
test_count=$((test_count + 1))

# Summary
echo ""
echo "================================"
echo "Test Summary"
echo "================================"
echo "Passed: $pass_count / $test_count"
echo ""

if [ $pass_count -eq $test_count ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Deploy function: supabase functions deploy forex-rates"
  echo "2. Start dev: npm run dev"
  echo "3. Visit Market page and check for LIVE status"
  exit 0
elif [ $pass_count -gt 0 ]; then
  echo -e "${YELLOW}Some tests passed. Check errors above.${NC}"
  exit 1
else
  echo -e "${RED}All tests failed. Check setup:${NC}"
  echo ""
  echo "1. Run: ./setup-forex-data.sh"
  echo "2. Set environment: cp .env.local.example .env.local"
  echo "3. Edit .env.local with your Supabase credentials"
  echo "4. Run tests again"
  exit 1
fi
