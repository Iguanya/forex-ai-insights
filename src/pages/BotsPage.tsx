import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockBots } from "@/data/mockData";
import { Play, Square, AlertCircle } from "lucide-react";

const statusConfig = {
  running: { color: "bg-success/10 text-profit border-success/20", icon: Play, label: "Running" },
  stopped: { color: "bg-muted text-muted-foreground border-border", icon: Square, label: "Stopped" },
  error: { color: "bg-destructive/10 text-loss border-destructive/20", icon: AlertCircle, label: "Error" },
};

export default function BotsPage() {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Trading Bots</h1>
          <p className="text-sm text-muted-foreground mt-1">Automated trading strategies</p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          + New Bot
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {mockBots.map(bot => {
          const cfg = statusConfig[bot.status];
          const Icon = cfg.icon;
          return (
            <Card key={bot.id} className="gradient-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-semibold">{bot.name}</h3>
                    <p className="text-xs text-muted-foreground">{bot.strategy}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {bot.pairs.map(p => (
                    <Badge key={p} variant="outline" className="text-[10px] border-border">{p}</Badge>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">P&L</p>
                    <p className={`text-sm font-mono font-bold ${bot.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                      {bot.pnl >= 0 ? "+" : ""}${bot.pnl.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Win Rate</p>
                    <p className="text-sm font-mono font-bold">{bot.winRate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Trades</p>
                    <p className="text-sm font-mono font-bold">{bot.totalTrades}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Uptime</p>
                    <p className="text-sm font-mono font-bold">{bot.uptime}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
