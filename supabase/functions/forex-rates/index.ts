import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD",
  "USD/CHF", "USD/CAD", "NZD/USD", "EUR/GBP",
];

interface ForexRate {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  exchangeRate: number;
  lastRefreshed: string;
  timezone?: string;
  source?: string;
}

// Alpha Vantage implementation
async function fetchFromAlphaVantage(pair: string, apiKey: string): Promise<ForexRate | null> {
  try {
    const [from, to] = pair.split("/");
    const apiUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${apiKey}`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (data["Realtime Currency Exchange Rate"]) {
      const rate = data["Realtime Currency Exchange Rate"];
      const bid = parseFloat(rate["8. Bid Price"]);
      const ask = parseFloat(rate["9. Ask Price"]);
      const exchangeRate = parseFloat(rate["5. Exchange Rate"]);
      
      return {
        symbol: pair,
        bid: bid || exchangeRate,
        ask: ask || exchangeRate + 0.00014,
        spread: parseFloat(((ask || exchangeRate + 0.00014) - (bid || exchangeRate)).toFixed(5)) * (exchangeRate > 100 ? 1000 : 100000),
        exchangeRate,
        lastRefreshed: rate["6. Last Refreshed"],
        timezone: rate["7. Time Zone"],
        source: "Alpha Vantage",
      };
    }
    return null;
  } catch (error) {
    console.error(`Alpha Vantage error for ${pair}:`, error);
    return null;
  }
}

// Twelve Data implementation
async function fetchFromTwelveData(pair: string, apiKey: string): Promise<ForexRate | null> {
  try {
    const symbol = pair.replace("/", "");
    const apiUrl = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (data.bid && data.ask) {
      const bid = parseFloat(data.bid);
      const ask = parseFloat(data.ask);
      const exchangeRate = (bid + ask) / 2;
      const spread = ask - bid;
      
      return {
        symbol: pair,
        bid,
        ask,
        spread,
        exchangeRate,
        lastRefreshed: data.updated,
        source: "Twelve Data",
      };
    }
    return null;
  } catch (error) {
    console.error(`Twelve Data error for ${pair}:`, error);
    return null;
  }
}

// ExchangeRate-API implementation (fallback)
async function fetchFromExchangeRateAPI(pair: string, apiKey: string): Promise<ForexRate | null> {
  try {
    const [from, to] = pair.split("/");
    const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${from}`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (data.conversion_rates && data.conversion_rates[to]) {
      const exchangeRate = data.conversion_rates[to];
      const bid = exchangeRate * 0.999;
      const ask = exchangeRate * 1.001;
      const spread = ask - bid;
      
      return {
        symbol: pair,
        bid,
        ask,
        spread,
        exchangeRate,
        lastRefreshed: new Date().toISOString(),
        source: "ExchangeRate-API",
      };
    }
    return null;
  } catch (error) {
    console.error(`ExchangeRate-API error for ${pair}:`, error);
    return null;
  }
}

// Main function with fallback strategy
async function fetchForexRate(pair: string): Promise<ForexRate | null> {
  const alphaVantageKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  const twelveDataKey = Deno.env.get("TWELVE_DATA_API_KEY");
  const exchangeRateKey = Deno.env.get("EXCHANGE_RATE_API_KEY");

  // Try Alpha Vantage first (primary)
  if (alphaVantageKey) {
    const result = await fetchFromAlphaVantage(pair, alphaVantageKey);
    if (result) return result;
  }

  // Try Twelve Data (secondary)
  if (twelveDataKey) {
    const result = await fetchFromTwelveData(pair, twelveDataKey);
    if (result) return result;
  }

  // Try ExchangeRate-API (tertiary)
  if (exchangeRateKey) {
    const result = await fetchFromExchangeRateAPI(pair, exchangeRateKey);
    if (result) return result;
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if at least one API key is configured
    const hasAnyKey = 
      Deno.env.get("ALPHA_VANTAGE_API_KEY") ||
      Deno.env.get("TWELVE_DATA_API_KEY") ||
      Deno.env.get("EXCHANGE_RATE_API_KEY");

    if (!hasAnyKey) {
      throw new Error("No API keys configured. Please set ALPHA_VANTAGE_API_KEY, TWELVE_DATA_API_KEY, or EXCHANGE_RATE_API_KEY");
    }

    const url = new URL(req.url);
    const pairsParam = url.searchParams.get("pairs");
    const pairs = pairsParam ? pairsParam.split(",") : PAIRS;

    // Fetch all pairs in parallel with fallback strategy
    const results = await Promise.all(
      pairs.map((pair) => fetchForexRate(pair))
    );

    const validResults = results.filter((r): r is ForexRate => r !== null);

    if (validResults.length === 0) {
      throw new Error("Failed to fetch forex rates from all sources");
    }

    return new Response(JSON.stringify({ 
      data: validResults, 
      timestamp: new Date().toISOString(),
      sources: [...new Set(validResults.map(r => r.source))]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Forex rates error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
