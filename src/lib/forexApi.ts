const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forex-rates`;

export interface LiveForexRate {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  exchangeRate: number;
  lastRefreshed: string;
  timezone: string;
}

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

  const result = await response.json();
  return result.data;
}
