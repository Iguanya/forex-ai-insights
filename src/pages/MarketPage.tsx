import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockPairs } from "@/data/mockData";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function MarketPage() {
  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold font-display">Live Market</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time forex pair pricing</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {mockPairs.map(pair => {
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
