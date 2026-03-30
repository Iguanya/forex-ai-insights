import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchLiveRates, LiveForexRate } from "@/lib/forexApi";
import { TradingBot, BotSignal, BotTrade, BotMetrics, BotLog, createBot } from "@/services/TradingBot";
import { AlertTriangle, TrendingDown, TrendingUp, Play, Pause, RotateCw, Settings } from "lucide-react";

const AVAILABLE_PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "USD/CAD"];
const TRADE_INTERVALS = [
  { value: 5000, label: "5 seconds" },
  { value: 10000, label: "10 seconds" },
  { value: 30000, label: "30 seconds" },
  { value: 60000, label: "1 minute" },
];

export default function BotPage() {
  const [bot, setBot] = useState<TradingBot | null>(null);
  const [liveRates, setLiveRates] = useState<LiveForexRate[]>([]);
  const [signals, setSignals] = useState<BotSignal[]>([]);
  const [openTrades, setOpenTrades] = useState<BotTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<BotTrade[]>([]);
  const [metrics, setMetrics] = useState<BotMetrics | null>(null);
  const [logs, setLogs] = useState<BotLog[]>([]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Configuration
  const [selectedPairs, setSelectedPairs] = useState<string[]>(["EUR/USD", "GBP/USD", "USD/JPY"]);
  const [tradeInterval, setTradeInterval] = useState(5000);
  const [showConfig, setShowConfig] = useState(true);

  // Initialize bot
  useEffect(() => {
    const newBot = createBot();
    setBot(newBot);
  }, []);

  // Fetch live rates and run bot logic
  useEffect(() => {
    if (!isRunning || !bot) return;

    const runBot = async () => {
      try {
        setLoading(true);

        // Update bot pairs to match selected pairs
        bot.setPairs(selectedPairs);

        // Fetch real live rates for selected pairs
        const rates = await fetchLiveRates(selectedPairs);
        setLiveRates(rates);

        // Analyze rates for signals
        const newSignals = bot.analyzeLiveRates(rates);
        
        // Execute trades based on signals
        bot.executeTrades(rates);
        
        // Update open trades based on current prices
        bot.updateTrades(rates);

        // Update state
        setSignals(bot.getSignals());
        setOpenTrades(bot.getOpenTrades());
        setClosedTrades(bot.getClosedTrades());
        setMetrics(bot.getMetrics());
        setLogs(bot.getRecentLogs(30));
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch forex data");
      } finally {
        setLoading(false);
      }
    };

    runBot();
    const interval = setInterval(runBot, tradeInterval);

    return () => clearInterval(interval);
  }, [isRunning, bot, selectedPairs, tradeInterval]);

  const handleStart = () => {
    if (selectedPairs.length === 0) {
      setError("Please select at least one currency pair");
      return;
    }
    setShowConfig(false);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    const newBot = createBot();
    newBot.setPairs(selectedPairs);
    setBot(newBot);
    setLiveRates([]);
    setSignals([]);
    setOpenTrades([]);
    setClosedTrades([]);
    setMetrics(null);
    setLogs([]);
    setIsRunning(false);
    setError(null);
    setLastUpdate(null);
    setShowConfig(true);
  };

  const handlePairToggle = (pair: string) => {
    setSelectedPairs((prev) =>
      prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair]
    );
  };

  const getLogColor = (level: BotLog["level"]) => {
    switch (level) {
      case "INFO":
        return "text-blue-600";
      case "SIGNAL":
        return "text-yellow-600 font-semibold";
      case "TRADE":
        return "text-green-600 font-semibold";
      case "CLOSE":
        return "text-purple-600 font-semibold";
      case "ERROR":
        return "text-red-600 font-semibold";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Automated Trading Bot</h1>
          <p className="text-gray-600 mt-1">Real-time forex trading with multi-strategy analysis and detailed logs</p>
        </div>
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="gap-2">
              <Play size={16} /> Start Bot
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline" className="gap-2">
              <Pause size={16} /> Pause
            </Button>
          )}
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RotateCw size={16} /> Reset
          </Button>
          {isRunning && (
            <Button onClick={() => setShowConfig(true)} variant="outline" className="gap-2">
              <Settings size={16} /> Config
            </Button>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings size={18} /> Bot Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Currency Pair Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2">Select Currency Pairs</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AVAILABLE_PAIRS.map((pair) => (
                  <label key={pair} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-blue-100">
                    <input
                      type="checkbox"
                      checked={selectedPairs.includes(pair)}
                      onChange={() => handlePairToggle(pair)}
                      disabled={isRunning}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">{pair}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">Selected: {selectedPairs.join(", ") || "None"}</p>
            </div>

            {/* Trade Interval Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2">Market Check Interval</label>
              <div className="flex gap-2 flex-wrap">
                {TRADE_INTERVALS.map((interval) => (
                  <Button
                    key={interval.value}
                    variant={tradeInterval === interval.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTradeInterval(interval.value)}
                    disabled={isRunning}
                  >
                    {interval.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">How often the bot checks market data</p>
            </div>

            {!isRunning && (
              <Button onClick={handleStart} className="w-full gap-2 bg-green-600 hover:bg-green-700">
                <Play size={16} /> Start Bot with Selected Configuration
              </Button>
            )}
            {isRunning && (
              <Button onClick={() => setShowConfig(false)} className="w-full">
                Close Configuration
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status and Errors */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bot Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
              <span className="font-semibold">{isRunning ? "Running" : "Stopped"}</span>
            </div>
            {lastUpdate && <p className="text-xs text-gray-500 mt-1">Last update: {lastUpdate.toLocaleTimeString()}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Account Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${bot?.getBalance().toFixed(2)}</p>
            {metrics && (
              <p className={`text-sm mt-1 ${metrics.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                P&L: ${metrics.totalPnL.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{openTrades.length}</p>
            {metrics && <p className="text-xs text-gray-500 mt-1">Total: {metrics.totalTrades}</p>}
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Bot Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 Bot Activity Log
            {loading && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded animate-pulse">Updating...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <p className="text-gray-500">Bot logs will appear here...</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-gray-500 flex-shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                  <span className={`flex-shrink-0 ${getLogColor(log.level)}`}>{log.level}</span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Live Forex Rates ({liveRates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liveRates.length === 0 ? (
            <p className="text-gray-500">Start the bot to see live rates</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {liveRates.map((rate) => (
                <div key={rate.symbol} className="border rounded-lg p-3">
                  <p className="font-semibold text-lg">{rate.symbol}</p>
                  <p className="text-2xl font-bold">{rate.bid.toFixed(5)}</p>
                  <div className="grid grid-cols-2 text-xs text-gray-600 mt-1">
                    <div>Bid: {rate.bid.toFixed(5)}</div>
                    <div>Ask: {rate.ask.toFixed(5)}</div>
                    <div>Spread: {(rate.spread * 10000).toFixed(1)}pips</div>
                    <div className="text-blue-600">{rate.source}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Signals */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Active Trading Signals ({signals.filter((s) => s.active).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {signals.filter((s) => s.active).length === 0 ? (
            <p className="text-gray-500">No active signals at the moment</p>
          ) : (
            <div className="space-y-3">
              {signals
                .filter((s) => s.active)
                .map((signal) => (
                  <div key={signal.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{signal.pair}</p>
                        <p className="text-sm text-gray-600">{signal.strategy}</p>
                      </div>
                      <Badge variant={signal.type === "BUY" ? "default" : "destructive"}>{signal.type}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-gray-600">Entry</p>
                        <p className="font-semibold">{signal.entry.toFixed(5)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">SL</p>
                        <p className="font-semibold">{signal.stopLoss.toFixed(5)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">TP</p>
                        <p className="font-semibold">{signal.takeProfit.toFixed(5)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Confidence</p>
                        <p className="font-semibold">{signal.confidence}%</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Trades */}
      <Card>
        <CardHeader>
          <CardTitle>📈 Open Trades ({openTrades.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {openTrades.length === 0 ? (
            <p className="text-gray-500">No open trades</p>
          ) : (
            <div className="space-y-3">
              {openTrades.map((trade) => (
                <div key={trade.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{trade.pair}</p>
                      <p className="text-sm text-gray-600">Entry: {trade.entry.toFixed(5)}</p>
                    </div>
                    <Badge variant={trade.type === "BUY" ? "default" : "destructive"}>{trade.type}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Qty</p>
                      <p className="font-semibold">{trade.quantity.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">SL</p>
                      <p className="font-semibold">{trade.stopLoss.toFixed(5)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">TP</p>
                      <p className="font-semibold">{trade.takeProfit.toFixed(5)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-3">
                <p className="text-gray-600 text-sm">Total Trades</p>
                <p className="text-2xl font-bold">{metrics.totalTrades}</p>
                <p className="text-xs text-gray-500 mt-1">Open: {metrics.openTrades} | Closed: {metrics.closedTrades}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-gray-600 text-sm">Win Rate</p>
                <p className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">Wins: {metrics.winningTrades}</p>
              </div>
              <div className={`border rounded-lg p-3 ${metrics.totalPnL >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <p className="text-gray-600 text-sm">Total P&L</p>
                <p className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ${metrics.totalPnL.toFixed(2)}
                </p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-gray-600 text-sm">Profit Factor</p>
                <p className="text-2xl font-bold">{metrics.profitFactor.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Avg Win: ${metrics.averageWin.toFixed(2)}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-gray-600 text-sm">Max Drawdown</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.maxDrawdown.toFixed(2)}%</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-gray-600 text-sm">Avg Loss</p>
                <p className="text-lg font-bold text-red-600">${metrics.averageLoss.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Closed Trades History */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Closed Trades History ({closedTrades.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {closedTrades.length === 0 ? (
            <p className="text-gray-500">No closed trades yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Pair</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Entry</th>
                    <th className="text-left py-2">Exit</th>
                    <th className="text-left py-2">Qty</th>
                    <th className="text-left py-2">P&L</th>
                    <th className="text-left py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.slice(-10).reverse().map((trade) => (
                    <tr key={trade.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-semibold">{trade.pair}</td>
                      <td className="py-2">
                        <Badge variant={trade.type === "BUY" ? "default" : "destructive"}>{trade.type}</Badge>
                      </td>
                      <td className="py-2">{trade.entry.toFixed(5)}</td>
                      <td className="py-2">{trade.exit?.toFixed(5)}</td>
                      <td className="py-2">{trade.quantity.toFixed(2)}</td>
                      <td className={`py-2 font-semibold ${(trade.pnl || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ${trade.pnl?.toFixed(2)}
                      </td>
                      <td className={`py-2 ${(trade.pnlPercent || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {(trade.pnlPercent || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Panel */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Bot Features:</strong> Select currency pairs and check interval, then start the bot. The bot uses real market data with multi-strategy analysis (Moving Average, RSI, Breakout). All activities are logged in real-time. Bot requires at least 2 confirmed signals to execute trades.
        </AlertDescription>
      </Alert>
    </div>
  );
}
