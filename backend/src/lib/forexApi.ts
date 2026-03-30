export interface LiveForexRate {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  exchangeRate: number;
  lastRefreshed: string;
  timezone?: string;
  source?: string;
}

// Mock data for demo purposes (with realistic market conditions)
const MOCK_RATES: Record<string, { base: number; spread: number; volatility: number }> = {
  "EUR/USD": { base: 1.08549, spread: 0.00014, volatility: 0.0008 },
  "GBP/USD": { base: 1.26350, spread: 0.00018, volatility: 0.0009 },
  "USD/JPY": { base: 154.250, spread: 0.018, volatility: 0.4 },
  "AUD/USD": { base: 0.65120, spread: 0.00018, volatility: 0.0007 },
  "USD/CHF": { base: 0.88450, spread: 0.00022, volatility: 0.0006 },
  "USD/CAD": { base: 1.36280, spread: 0.00022, volatility: 0.0007 },
};

// Generate realistic price movements
function generateRealisticPrice(
  symbol: string,
  baseData: { base: number; spread: number; volatility: number }
): { bid: number; ask: number } {
  // Add random walk for realistic price movement
  const randomWalk = (Math.random() - 0.5) * baseData.volatility;
  const bid = baseData.base + randomWalk;
  const ask = bid + baseData.spread;
  return { bid, ask };
}

/**
 * Fetches live forex rates from multiple free real data sources
 *
 * Primary: exchangerate.host (completely free, no auth)
 * Secondary: Alpha Vantage (free tier with API key)
 * Fallback: Market Simulator for testing
 *
 * @param pairs - Optional array of forex pairs (e.g., ["EUR/USD", "GBP/USD"])
 * @returns Array of live forex rates with source information
 */
export async function fetchLiveRates(pairs?: string[]): Promise<LiveForexRate[]> {
  const pairList = pairs?.length ? pairs : Object.keys(MOCK_RATES);

  // Try exchangerate.host first (completely free, no auth needed)
  try {
    const rates = await fetchFromExchangeRateHost(pairList);
    if (rates.length > 0) {
      return rates;
    }
  } catch (error) {
    // Silent fail, try next source
  }

  // Try Alpha Vantage (free tier with API key)
  try {
    const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (alphaKey) {
      const rates = await fetchFromAlphaVantage(pairList, alphaKey);
      if (rates.length > 0) {
        return rates;
      }
    }
  } catch (error) {
    // Silent fail, use simulator
  }

  // Fallback to market simulator
  return generateMarketSimulatorData(pairList);
}

/**
 * Fetches from exchangerate.host (free, no authentication)
 */
async function fetchFromExchangeRateHost(pairs: string[]): Promise<LiveForexRate[]> {
  const rates: LiveForexRate[] = [];

  for (const pair of pairs) {
    if (!MOCK_RATES[pair]) continue;

    const [from, to] = pair.split("/");
    const url = `https://api.exchangerate.host/latest?base=${from}&symbols=${to}`;

    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      if (data.rates && data.rates[to]) {
        const bid = data.rates[to] * 0.9999; // Approximate bid (slightly lower)
        const ask = data.rates[to] * 1.0001; // Approximate ask (slightly higher)
        const spread = ask - bid;

        rates.push({
          symbol: pair,
          bid: parseFloat(bid.toFixed(5)),
          ask: parseFloat(ask.toFixed(5)),
          spread: parseFloat(spread.toFixed(5)),
          exchangeRate: data.rates[to],
          lastRefreshed: new Date().toISOString(),
          source: "exchangerate.host (Real)",
        });
      }
    } catch (error) {
      // Continue to next pair
    }
  }

  return rates;
}

/**
 * Fetches from Alpha Vantage (free tier requires API key)
 * Get free key at: https://www.alphavantage.co/
 */
async function fetchFromAlphaVantage(pairs: string[], apiKey: string): Promise<LiveForexRate[]> {
  const rates: LiveForexRate[] = [];

  for (const pair of pairs) {
    if (!MOCK_RATES[pair]) continue;

    const [from, to] = pair.split("/");
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      if (data["Realtime Currency Exchange Rate"]) {
        const rate = data["Realtime Currency Exchange Rate"];
        const bid = parseFloat(rate["8. Bid Price"]);
        const ask = parseFloat(rate["9. Ask Price"]);

        rates.push({
          symbol: pair,
          bid,
          ask,
          spread: ask - bid,
          exchangeRate: parseFloat(rate["5. Exchange Rate"]),
          lastRefreshed: rate["6. Last Refreshed"],
          source: "Alpha Vantage (Real)",
        });
      }
    } catch (error) {
      // Continue to next pair
    }
  }

  return rates;
}

/**
 * Generates simulated market data for fallback
 */
function generateMarketSimulatorData(pairs: string[]): LiveForexRate[] {
  const rates: LiveForexRate[] = pairs
    .filter((pair) => MOCK_RATES[pair])
    .map((symbol) => {
      const baseData = MOCK_RATES[symbol];
      const { bid, ask } = generateRealisticPrice(symbol, baseData);

      return {
        symbol,
        bid: parseFloat(bid.toFixed(5)),
        ask: parseFloat(ask.toFixed(5)),
        spread: parseFloat((ask - bid).toFixed(5)),
        exchangeRate: (bid + ask) / 2,
        lastRefreshed: new Date().toISOString(),
        source: "Market Simulator",
      } as LiveForexRate;
    });

  return rates;
}

/**
 * Gets information about available data sources
 */
export async function getDataSourceInfo(): Promise<string[]> {
  return [
    "exchangerate.host (Free, Real-time)",
    "Alpha Vantage (Free tier)",
    "Market Simulator (Fallback)",
  ];
}
