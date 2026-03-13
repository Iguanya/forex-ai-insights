import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { mockUsers } from "@/data/mockData";
import { useState } from "react";

const statusColor = {
  active: "bg-success/10 text-profit border-success/20",
  inactive: "bg-muted text-muted-foreground border-border",
  suspended: "bg-destructive/10 text-loss border-destructive/20",
};

const riskColor = {
  low: "text-profit",
  medium: "text-warning",
  high: "text-loss",
  critical: "text-loss font-bold",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const filtered = mockUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{mockUsers.length} registered traders</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
      </div>

      <Card className="gradient-card border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-[11px] uppercase tracking-wider">
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-right p-3 font-medium">Balance</th>
                  <th className="text-right p-3 font-medium">Equity</th>
                  <th className="text-right p-3 font-medium">P&L</th>
                  <th className="text-center p-3 font-medium">Trades</th>
                  <th className="text-center p-3 font-medium">Risk</th>
                  <th className="text-center p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="p-3 text-right font-mono">${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono">${user.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className={`p-3 text-right font-mono ${user.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                      {user.pnl >= 0 ? "+" : ""}${user.pnl.toFixed(2)}
                    </td>
                    <td className="p-3 text-center font-mono">{user.openTrades}</td>
                    <td className={`p-3 text-center text-xs font-medium uppercase ${riskColor[user.riskLevel]}`}>
                      {user.riskLevel}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={`text-[10px] ${statusColor[user.status]}`}>
                        {user.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
