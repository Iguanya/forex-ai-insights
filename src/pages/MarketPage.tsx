import { Card, CardContent } from "@/components/ui/card";
import { mockPairs } from "@/data/mockData";
import { fetchLiveRates, LiveForexRate, ForexRatesResponse } from "@/lib/forexApi";
import { ArrowUpRight, ArrowDownRight, Wifi, WifiOff, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

export default function MarketPage() {
  const [dataSource, setDataSource] = useState<string[]>([]);
  
  const { data: liveRates, isError, isLoading } = useQuery({
    queryKey: ["forex-rates"],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forex-rates`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      
      if (!response.ok) throw new Error("Failed to fetch rates");
      
      const data: ForexRatesResponse = await response.json();
      setDataSource(data.sources || []);
      return data.data;
    },
    refetchInterval: 60000, // Adjust based on your API provider
    retry: 1,
  });

  const isLive = !!liveRates?.length;

  // Merge live data with mock fallback
  const pairs = mockPairs.map((mock) => {
    const live = liveRates?.find((r: LiveForexRate) => r.symbol === mock.symbol);
    if (live) {
      return {
        ...mock,
        bid: live.bid,
        ask: live.ask,
        spread: parseFloat(live.spread.toFixed(1)),
      };
    }
    return mock;
  });

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Live Market</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time forex pair pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-mono">
                  {isLive && dataSource.length > 0 
                    ? `Using: ${dataSource.join(", ")}`
                    : "Configure API keys for live data"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Badge variant="outline" className={`font-mono text-[10px] gap-1 ${isLive ? "border-profit text-profit" : "border-muted-foreground text-muted-foreground"}`}>
            {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isLoading ? "CONNECTING..." : isLive ? "LIVE" : "MOCK DATA"}
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {pairs.map(pair => {
          const isUp = pair.changePercent >= 0;
          return (
            <Card key={pair.symbol} className="gradient-card border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display font-semibold">{pair.symbol}</span>
                  <div className={`flex items-center gap-1 text-xs font-mono ${isUp ? "text-profit" : "text-loss"}`}>
                    {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {isUp ? "+" : ""}{pair.changePercent.toFixed(2)}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Bid</p>
                    <p className="font-mono font-bold text-lg">{pair.bid.toFixed(pair.bid > 100 ? 3 : 5)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">Ask</p>
                    <p className="font-mono font-bold text-lg">{pair.ask.toFixed(pair.ask > 100 ? 3 : 5)}</p>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Spread: {pair.spread}</span>
                  <span>Vol: {pair.volume}</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                  <span>H: {pair.high.toFixed(pair.high > 100 ? 3 : 5)}</span>
                  <span>L: {pair.low.toFixed(pair.low > 100 ? 3 : 5)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
