import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, DollarSign, Activity, AlertTriangle, Bot } from "lucide-react";
import { mockAnalytics, mockPairs, mockAlerts, mockSignals, mockBots } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

function StatCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; trend?: number;
}) {
  return (
    <Card className="gradient-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold font-mono mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend !== undefined && (
              <p className={`text-xs font-mono mt-1 ${trend >= 0 ? "text-profit" : "text-loss"}`}>
                {trend >= 0 ? "+" : ""}{trend}%
              </p>
            )}
          </div>
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const activeAlerts = mockAlerts.filter(a => !a.acknowledged && a.severity === "critical");
  const runningBots = mockBots.filter(b => b.status === "running");

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold font-display">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time broker metrics & AI insights</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={mockAnalytics.totalUsers.toLocaleString()} subtitle={`${mockAnalytics.activeUsers} active`} icon={Users} trend={mockAnalytics.monthlyGrowth} />
        <StatCard title="Daily Volume" value={mockAnalytics.totalVolume} subtitle={`${mockAnalytics.dailyTrades.toLocaleString()} trades`} icon={DollarSign} />
        <StatCard title="Avg P&L" value={`$${mockAnalytics.avgPnl.toFixed(2)}`} icon={TrendingUp} trend={8.3} />
        <StatCard title="Active Bots" value={runningBots.length.toString()} subtitle={`${mockBots.length} total`} icon={Bot} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Weekly P&L Chart */}
        <Card className="gradient-card border-border/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Weekly P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockAnalytics.weeklyPnlData}>
                  <XAxis dataKey="day" tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(220 14% 18%)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]} fill="hsl(175 80% 50%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Critical Alerts
              <Badge variant="destructive" className="ml-auto text-[10px]">{activeAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAlerts.map(alert => (
              <div key={alert.id} className="p-2 rounded-md bg-destructive/5 border border-destructive/20 text-xs">
                <p className="text-foreground">{alert.message}</p>
                <p className="text-muted-foreground mt-1 font-mono text-[10px]">{alert.timestamp}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top Pairs */}
      <Card className="gradient-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Live Market
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {mockPairs.slice(0, 4).map(pair => (
              <div key={pair.symbol} className="p-3 rounded-md bg-secondary/30 border border-border/50">
                <p className="text-xs font-medium">{pair.symbol}</p>
                <p className="text-lg font-mono font-bold mt-1">{pair.bid.toFixed(pair.bid > 100 ? 3 : 5)}</p>
                <p className={`text-xs font-mono ${pair.changePercent >= 0 ? "text-profit" : "text-loss"}`}>
                  {pair.changePercent >= 0 ? "+" : ""}{pair.changePercent.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
