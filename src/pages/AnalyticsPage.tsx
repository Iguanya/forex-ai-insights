import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockAnalytics } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

const COLORS = [
  "hsl(175, 80%, 50%)",
  "hsl(145, 70%, 45%)",
  "hsl(38, 92%, 55%)",
  "hsl(0, 72%, 55%)",
  "hsl(260, 60%, 55%)",
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold font-display">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered trading performance insights</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Weekly P&L Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockAnalytics.weeklyPnlData}>
                  <XAxis dataKey="day" tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(220 14% 18%)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {mockAnalytics.weeklyPnlData.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? "hsl(145, 70%, 45%)" : "hsl(0, 72%, 55%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Trading Volume by Pair</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mockAnalytics.pairDistribution} dataKey="percentage" nameKey="pair" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} label={({ pair, percentage }) => `${pair} ${percentage}%`} fontSize={10}>
                    {mockAnalytics.pairDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(220 14% 18%)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: mockAnalytics.totalUsers.toLocaleString() },
          { label: "Active Users", value: mockAnalytics.activeUsers.toLocaleString() },
          { label: "Daily Trades", value: mockAnalytics.dailyTrades.toLocaleString() },
          { label: "Monthly Growth", value: `+${mockAnalytics.monthlyGrowth}%` },
        ].map(stat => (
          <Card key={stat.label} className="gradient-card border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-mono font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
