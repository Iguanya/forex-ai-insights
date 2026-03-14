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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    if (!apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY not configured");
    }

    const url = new URL(req.url);
    const pairsParam = url.searchParams.get("pairs");
    const pairs = pairsParam ? pairsParam.split(",") : PAIRS;

    // Fetch all pairs in parallel
    const results = await Promise.all(
      pairs.map(async (pair) => {
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
          };
        }

        // Rate limit or error - return null
        return null;
      })
    );

    const validResults = results.filter(Boolean);

    return new Response(JSON.stringify({ data: validResults, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
