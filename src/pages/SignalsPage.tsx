import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockSignals } from "@/data/mockData";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function SignalsPage() {
  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold font-display">AI Trading Signals</h1>
        <p className="text-sm text-muted-foreground mt-1">Machine learning powered entry/exit signals</p>
      </div>

      <div className="grid gap-4">
        {mockSignals.map(signal => (
          <Card key={signal.id} className="gradient-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className={`p-2 rounded-md ${signal.type === "BUY" ? "bg-success/10" : "bg-destructive/10"}`}>
                  {signal.type === "BUY"
                    ? <TrendingUp className="h-5 w-5 text-profit" />
                    : <TrendingDown className="h-5 w-5 text-loss" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold">{signal.pair}</span>
                    <Badge className={`text-[10px] ${signal.type === "BUY" ? "bg-success/20 text-profit" : "bg-destructive/20 text-loss"} border-0`}>
                      {signal.type}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{signal.timeframe}</Badge>
                    <Badge variant="outline" className={`text-[10px] ml-auto ${signal.status === "active" ? "border-primary/30 text-primary" : "border-muted-foreground/30"}`}>
                      {signal.status}
                    </Badge>
                  </div>
                  <div className="flex gap-6 mt-2 text-xs text-muted-foreground font-mono">
                    <span>Entry: {signal.entry}</span>
                    <span className="text-loss">SL: {signal.stopLoss}</span>
                    <span className="text-profit">TP: {signal.takeProfit}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${signal.confidence}%` }} />
                    </div>
                    <span className="text-xs font-mono text-primary">{signal.confidence}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">{signal.timestamp}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
