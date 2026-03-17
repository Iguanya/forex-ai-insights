const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forex-rates`;

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

export interface ForexRatesResponse {
  data: LiveForexRate[];
  timestamp: string;
  sources?: string[];
}

/**
 * Fetches live forex rates from real data providers
 * Automatically falls back between multiple providers:
 * 1. Alpha Vantage (primary)
 * 2. Twelve Data (secondary)
 * 3. ExchangeRate-API (tertiary)
 * 
 * @param pairs - Optional array of forex pairs (e.g., ["EUR/USD", "GBP/USD"])
 * @returns Array of live forex rates with source information
 * @throws Error if all data sources fail or no API keys are configured
 */
export async function fetchLiveRates(pairs?: string[]): Promise<LiveForexRate[]> {
  const url = new URL(FUNCTION_URL);
  if (pairs?.length) {
    url.searchParams.set("pairs", pairs.join(","));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const result: ForexRatesResponse = await response.json();
  
  // Add debugging info if in development
  if (import.meta.env.DEV) {
    console.log("Forex data sources:", result.sources || ["Unknown"]);
  }
  
  return result.data;
}

/**
 * Gets information about available data sources
 */
export async function getDataSourceInfo(): Promise<string[]> {
  try {
    const url = new URL(FUNCTION_URL);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    });
    
    if (response.ok) {
      const result: ForexRatesResponse = await response.json();
      return result.sources || ["Unknown"];
    }
  } catch (error) {
    console.error("Failed to get data source info:", error);
  }
  return [];
}
