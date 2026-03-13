// Mock data for the forex broker dashboard

export interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
  equity: number;
  margin: number;
  pnl: number;
  openTrades: number;
  status: "active" | "inactive" | "suspended";
  joinDate: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface ForexPair {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: string;
}

export interface Signal {
  id: string;
  pair: string;
  type: "BUY" | "SELL";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  timestamp: string;
  status: "active" | "closed" | "expired";
}

export interface Bot {
  id: string;
  name: string;
  strategy: string;
  status: "running" | "stopped" | "error";
  pairs: string[];
  pnl: number;
  winRate: number;
  totalTrades: number;
  uptime: string;
}

export interface Alert {
  id: string;
  type: "margin_call" | "drawdown" | "volatility" | "exposure";
  severity: "warning" | "critical";
  message: string;
  user?: string;
  timestamp: string;
  acknowledged: boolean;
}

export const mockUsers: User[] = [
  { id: "1", name: "James Mitchell", email: "james@trading.com", balance: 52340.50, equity: 54120.80, margin: 12500, pnl: 1780.30, openTrades: 5, status: "active", joinDate: "2024-01-15", riskLevel: "medium" },
  { id: "2", name: "Sarah Chen", email: "sarah@fx.io", balance: 128900.00, equity: 131200.45, margin: 35000, pnl: 2300.45, openTrades: 8, status: "active", joinDate: "2023-11-20", riskLevel: "low" },
  { id: "3", name: "Alex Petrov", email: "alex@trade.net", balance: 8750.25, equity: 7200.10, margin: 6500, pnl: -1550.15, openTrades: 3, status: "active", joinDate: "2024-03-01", riskLevel: "critical" },
  { id: "4", name: "Maria Santos", email: "maria@fx.com", balance: 45600.00, equity: 46800.20, margin: 15000, pnl: 1200.20, openTrades: 4, status: "active", joinDate: "2024-02-10", riskLevel: "low" },
  { id: "5", name: "Tom Williams", email: "tom@broker.io", balance: 15200.00, equity: 14800.50, margin: 8000, pnl: -399.50, openTrades: 2, status: "inactive", joinDate: "2023-09-05", riskLevel: "medium" },
  { id: "6", name: "Yuki Tanaka", email: "yuki@trade.jp", balance: 92100.00, equity: 95400.30, margin: 28000, pnl: 3300.30, openTrades: 6, status: "active", joinDate: "2023-12-01", riskLevel: "low" },
  { id: "7", name: "David Kim", email: "david@fx.kr", balance: 3200.00, equity: 2100.50, margin: 2800, pnl: -1099.50, openTrades: 2, status: "suspended", joinDate: "2024-01-25", riskLevel: "critical" },
  { id: "8", name: "Emma Roberts", email: "emma@trade.uk", balance: 67800.00, equity: 69200.10, margin: 20000, pnl: 1400.10, openTrades: 7, status: "active", joinDate: "2023-10-15", riskLevel: "medium" },
];

export const mockPairs: ForexPair[] = [
  { symbol: "EUR/USD", bid: 1.08542, ask: 1.08556, spread: 1.4, change: 0.00032, changePercent: 0.03, high: 1.08890, low: 1.08210, volume: "1.2B" },
  { symbol: "GBP/USD", bid: 1.26340, ask: 1.26358, spread: 1.8, change: -0.00145, changePercent: -0.11, high: 1.26780, low: 1.26100, volume: "890M" },
  { symbol: "USD/JPY", bid: 154.250, ask: 154.268, spread: 1.8, change: 0.342, changePercent: 0.22, high: 154.680, low: 153.850, volume: "1.5B" },
  { symbol: "AUD/USD", bid: 0.65120, ask: 0.65138, spread: 1.8, change: -0.00089, changePercent: -0.14, high: 0.65450, low: 0.64980, volume: "420M" },
  { symbol: "USD/CHF", bid: 0.88450, ask: 0.88472, spread: 2.2, change: 0.00115, changePercent: 0.13, high: 0.88690, low: 0.88210, volume: "380M" },
  { symbol: "USD/CAD", bid: 1.36280, ask: 1.36302, spread: 2.2, change: -0.00078, changePercent: -0.06, high: 1.36580, low: 1.36050, volume: "450M" },
  { symbol: "NZD/USD", bid: 0.59840, ask: 0.59862, spread: 2.2, change: 0.00042, changePercent: 0.07, high: 0.60120, low: 0.59650, volume: "210M" },
  { symbol: "EUR/GBP", bid: 0.85910, ask: 0.85932, spread: 2.2, change: 0.00098, changePercent: 0.11, high: 0.86150, low: 0.85720, volume: "320M" },
];

export const mockSignals: Signal[] = [
  { id: "s1", pair: "EUR/USD", type: "BUY", confidence: 87, entry: 1.08540, stopLoss: 1.08320, takeProfit: 1.08920, timeframe: "H4", timestamp: "2026-03-13 14:30", status: "active" },
  { id: "s2", pair: "GBP/USD", type: "SELL", confidence: 72, entry: 1.26350, stopLoss: 1.26600, takeProfit: 1.25900, timeframe: "H1", timestamp: "2026-03-13 13:15", status: "active" },
  { id: "s3", pair: "USD/JPY", type: "BUY", confidence: 91, entry: 154.200, stopLoss: 153.800, takeProfit: 155.000, timeframe: "D1", timestamp: "2026-03-13 09:00", status: "active" },
  { id: "s4", pair: "AUD/USD", type: "SELL", confidence: 65, entry: 0.65200, stopLoss: 0.65500, takeProfit: 0.64800, timeframe: "H4", timestamp: "2026-03-13 11:45", status: "active" },
  { id: "s5", pair: "EUR/GBP", type: "BUY", confidence: 78, entry: 0.85900, stopLoss: 0.85650, takeProfit: 0.86300, timeframe: "H1", timestamp: "2026-03-12 16:00", status: "closed" },
];

export const mockBots: Bot[] = [
  { id: "b1", name: "Scalper Pro", strategy: "Mean Reversion Scalping", status: "running", pairs: ["EUR/USD", "GBP/USD"], pnl: 4520.80, winRate: 68.5, totalTrades: 342, uptime: "14d 6h" },
  { id: "b2", name: "Trend Rider", strategy: "Trend Following MA Cross", status: "running", pairs: ["USD/JPY", "EUR/USD", "AUD/USD"], pnl: 8940.20, winRate: 54.2, totalTrades: 128, uptime: "30d 12h" },
  { id: "b3", name: "Grid Master", strategy: "Grid Trading", status: "stopped", pairs: ["EUR/USD"], pnl: -1200.50, winRate: 42.1, totalTrades: 89, uptime: "0d 0h" },
  { id: "b4", name: "News Flash", strategy: "News Sentiment Analysis", status: "running", pairs: ["GBP/USD", "USD/JPY"], pnl: 2150.30, winRate: 61.8, totalTrades: 55, uptime: "7d 3h" },
  { id: "b5", name: "Breakout Hunter", strategy: "Support/Resistance Breakout", status: "error", pairs: ["USD/CHF", "NZD/USD"], pnl: 890.10, winRate: 58.3, totalTrades: 72, uptime: "0d 0h" },
];

export const mockAlerts: Alert[] = [
  { id: "a1", type: "margin_call", severity: "critical", message: "David Kim - Margin level at 75%, approaching margin call", user: "David Kim", timestamp: "2026-03-13 14:45", acknowledged: false },
  { id: "a2", type: "drawdown", severity: "critical", message: "Alex Petrov - Account drawdown exceeds 15% daily limit", user: "Alex Petrov", timestamp: "2026-03-13 14:30", acknowledged: false },
  { id: "a3", type: "volatility", severity: "warning", message: "GBP/USD volatility spike detected - 2.5x normal range", timestamp: "2026-03-13 13:20", acknowledged: true },
  { id: "a4", type: "exposure", severity: "warning", message: "Total EUR exposure exceeds broker risk threshold (45%)", timestamp: "2026-03-13 12:15", acknowledged: false },
  { id: "a5", type: "margin_call", severity: "critical", message: "Tom Williams - Equity below maintenance margin requirement", user: "Tom Williams", timestamp: "2026-03-13 11:00", acknowledged: true },
];

export const mockAnalytics = {
  totalUsers: 1247,
  activeUsers: 892,
  totalVolume: "$2.4B",
  avgPnl: 1245.80,
  monthlyGrowth: 12.5,
  dailyTrades: 4520,
  weeklyPnlData: [
    { day: "Mon", pnl: 12500 },
    { day: "Tue", pnl: -3200 },
    { day: "Wed", pnl: 8900 },
    { day: "Thu", pnl: 15400 },
    { day: "Fri", pnl: 6700 },
  ],
  pairDistribution: [
    { pair: "EUR/USD", percentage: 35 },
    { pair: "GBP/USD", percentage: 22 },
    { pair: "USD/JPY", percentage: 18 },
    { pair: "AUD/USD", percentage: 12 },
    { pair: "Others", percentage: 13 },
  ],
};
