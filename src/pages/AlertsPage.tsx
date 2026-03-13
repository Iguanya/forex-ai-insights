import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockAlerts } from "@/data/mockData";
import { AlertTriangle, Shield, TrendingDown, Activity } from "lucide-react";

const typeConfig = {
  margin_call: { icon: AlertTriangle, label: "Margin Call" },
  drawdown: { icon: TrendingDown, label: "Drawdown" },
  volatility: { icon: Activity, label: "Volatility" },
  exposure: { icon: Shield, label: "Exposure" },
};

export default function AlertsPage() {
  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold font-display">Risk Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered risk monitoring & notifications</p>
      </div>

      <div className="grid gap-3">
        {mockAlerts.map(alert => {
          const cfg = typeConfig[alert.type];
          const Icon = cfg.icon;
          return (
            <Card key={alert.id} className={`gradient-card border-border/50 ${!alert.acknowledged && alert.severity === "critical" ? "border-l-2 border-l-destructive" : ""}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`p-2 rounded-md ${alert.severity === "critical" ? "bg-destructive/10" : "bg-warning/10"}`}>
                  <Icon className={`h-4 w-4 ${alert.severity === "critical" ? "text-loss" : "text-warning"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[10px] ${alert.severity === "critical" ? "border-destructive/30 text-loss" : "border-warning/30 text-warning"}`}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                    {alert.acknowledged && <Badge variant="outline" className="text-[10px] border-success/20 text-profit">ACK</Badge>}
                  </div>
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">{alert.timestamp}</p>
                </div>
                {!alert.acknowledged && (
                  <Button size="sm" variant="outline" className="text-xs shrink-0">
                    Acknowledge
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
