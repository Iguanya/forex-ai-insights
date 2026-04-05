import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Play, Pause, RotateCw, Settings, TrendingUp, TrendingDown } from "lucide-react";
import { fetchLiveRates } from "@/lib/forexApi";
import { TradingBot, BotTrade, BotSignal, BotMetrics } from "@/services/TradingBot";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://144.172.112.31:3000/api";
const AVAILABLE_PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "USD/CAD"];
const TRADE_INTERVALS = [
  { value: 5000, label: "5 seconds" },
  { value: 10000, label: "10 seconds" },
  { value: 30000, label: "30 seconds" },
  { value: 60000, label: "1 minute" },
];

interface BotLog {
  id: string;
  timestamp: Date;
  level: "INFO" | "SIGNAL" | "TRADE" | "CLOSE" | "ERROR";
  message: string;
  details?: Record<string, any>;
}

export default function BotPage() {
  const botInstance = useRef<TradingBot | null>(null);
  const cycleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logIdRef = useRef(0);
  const warmupStartRef = useRef<Date | null>(null);
  const priceHistoryRef = useRef<Map<string, number[]>>(new Map());

  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [selectedPairs, setSelectedPairs] = useState<string[]>(["EUR/USD", "GBP/USD", "USD/JPY"]);
  const [tradeInterval, setTradeInterval] = useState(5000);
  const [showConfig, setShowConfig] = useState(true);

  // User balance
  const [userBalance, setUserBalance] = useState<number>(10000);

  // Bot state
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [metrics, setMetrics] = useState<BotMetrics | null>(null);
  const [openTrades, setOpenTrades] = useState<BotTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<BotTrade[]>([]);
  const [signals, setSignals] = useState<BotSignal[]>([]);

  // Warmup state
  const [warmupTime, setWarmupTime] = useState(0);
  const isWarmingUp = warmupTime < 30;

  // Rewards system
  const [totalRewards, setTotalRewards] = useState(0);
  const [rewardStreak, setRewardStreak] = useState(0);
  const [rewardLog, setRewardLog] = useState<{ trade: string; reward: number; timestamp: Date }[]>([]);

  // Fetch user balance from profile
  useEffect(() => {
    const fetchUserBalance = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/bot/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUserBalance(data.balance || 10000);
        }
      } catch (err) {
        console.error("Failed to fetch user balance:", err);
        setUserBalance(10000);
      }
    };

    fetchUserBalance();
  }, []);

  // Initialize bot with user's balance
  useEffect(() => {
    botInstance.current = new TradingBot(
      "Automated Trading Bot",
      selectedPairs,
      userBalance, // Use user's actual balance
      1 // Risk per trade %
    );
  }, [userBalance]);

  const addLog = (level: BotLog["level"], message: string, details?: Record<string, any>) => {
    const log: BotLog = {
      id: `log-${++logIdRef.current}`,
      timestamp: new Date(),
      level,
      message,
      details,
    };
    setLogs((prev) => [log, ...prev.slice(0, 49)]);
  };

  const addReward = (tradeInfo: string, amount: number) => {
    if (amount > 0) {
      const newReward = { trade: tradeInfo, reward: amount, timestamp: new Date() };
      setRewardLog((prev) => [newReward, ...prev.slice(0, 9)]);
      setTotalRewards((prev) => prev + amount);
      setRewardStreak((prev) => prev + 1);

      addLog("INFO", `🏆 REWARD EARNED: +${amount.toFixed(2)} points (Streak: ${rewardStreak + 1})`);
    } else if (amount < 0) {
      setRewardStreak(0);
    }
  };

  const forceTradeAfterWarmup = (rates: any[]) => {
    if (!botInstance.current || rates.length === 0) return;

    // Pick a pair from available rates
    const pair = rates[0].symbol;
    const rate = rates[0];
    const midPrice = (rate.bid + rate.ask) / 2;

    // Randomly decide BUY or SELL (50/50)
    const type = Math.random() > 0.5 ? "BUY" : "SELL" as "BUY" | "SELL";

    // Calculate position size (1% risk)
    const riskAmount = userBalance * 0.01;
    const stopLossDistance = midPrice * 0.01; // 1% stop loss
    const quantity = riskAmount / stopLossDistance;

    const trade: BotTrade = {
      id: `trade-${Date.now()}`,
      pair,
      type,
      entry: midPrice,
      stopLoss: type === "BUY" ? midPrice - stopLossDistance : midPrice + stopLossDistance,
      takeProfit: type === "BUY" ? midPrice + stopLossDistance * 2 : midPrice - stopLossDistance * 2,
      quantity,
      entryTime: new Date(),
      status: "open",
    };

    // Manually set the trade (since we're forcing it)
    addLog(
      "TRADE",
      `📈 FORCED TRADE: ${type} ${pair} @ ${midPrice.toFixed(5)} (after 30s warmup)`,
      {
        pair,
        type,
        entry: midPrice,
        quantity: quantity.toFixed(2),
        stopLoss: trade.stopLoss.toFixed(5),
        takeProfit: trade.takeProfit.toFixed(5),
      }
    );

    return trade;
  };

  const runTradingCycle = async () => {
    if (!botInstance.current) return;

    try {
      // Fetch live rates
      const rates = await fetchLiveRates(selectedPairs);

      if (rates.length === 0) {
        addLog("ERROR", "Failed to fetch forex rates");
        return;
      }

      // Log market check
      const rateInfo = rates
        .map((r) => `${r.symbol}=${((r.bid + r.ask) / 2).toFixed(5)}`)
        .join(", ");
      addLog("INFO", `📊 Market check: ${rateInfo}`);

      // Update warmup timer
      if (isWarmingUp && warmupStartRef.current) {
        const elapsed = Math.floor((Date.now() - warmupStartRef.current.getTime()) / 1000);
        setWarmupTime(elapsed);

        if (elapsed < 30) {
          // During warmup: collect data, no trading
          addLog("INFO", `⏳ Warmup phase: ${30 - elapsed}s remaining (collecting market data...)`);

          // Store price history for analysis
          rates.forEach((rate) => {
            if (!priceHistoryRef.current.has(rate.symbol)) {
              priceHistoryRef.current.set(rate.symbol, []);
            }
            const history = priceHistoryRef.current.get(rate.symbol)!;
            history.push((rate.bid + rate.ask) / 2);
            if (history.length > 50) history.shift();
          });

          setLastUpdate(new Date());
          return; // Skip trading during warmup
        } else if (elapsed === 30) {
          // Force trade after warmup
          addLog("INFO", `⏰ Warmup complete! Forcing first trade...`);
          const forcedTrade = forceTradeAfterWarmup(rates);
          if (forcedTrade) {
            setOpenTrades([forcedTrade]);
          }
          setWarmupTime(31); // Mark warmup as complete
        }
      }

      // Regular trading (after warmup)
      if (!isWarmingUp) {
        // Analyze for signals
        const newSignals = botInstance.current.analyzeLiveRates(rates);
        setSignals(newSignals.filter((s) => s && s.active));

        // Log signals
        newSignals.forEach((signal) => {
          if (signal && signal.active) {
            addLog(
              "SIGNAL",
              `🎯 ${signal.type} signal for ${signal.pair} (${signal.confidence}%)`,
              {
                pair: signal.pair,
                type: signal.type,
                entry: signal.entry,
                confidence: signal.confidence,
              }
            );
          }
        });

        // Execute trades
        const executedTrades = botInstance.current.executeTrades(rates);
        if (executedTrades.length > 0) {
          executedTrades.forEach((trade) => {
            addLog(
              "TRADE",
              `📈 TRADE OPENED: ${trade.type} ${trade.pair} @ ${trade.entry.toFixed(5)}`,
              {
                pair: trade.pair,
                type: trade.type,
                entry: trade.entry,
                quantity: trade.quantity,
              }
            );
          });
        }

        // Update open trades and check for closures
        const closedInThisCycle = botInstance.current.updateTrades(rates);
        closedInThisCycle.forEach((trade) => {
          const emoji = (trade.pnl || 0) >= 0 ? "💰" : "📉";
          const pnlPercent = trade.pnlPercent || 0;

          addLog(
            "CLOSE",
            `${emoji} TRADE CLOSED: ${trade.pair} (${pnlPercent.toFixed(2)}%)`,
            {
              pair: trade.pair,
              pnl: trade.pnl,
              pnlPercent: pnlPercent,
            }
          );

          // Award points based on profit/loss
          const rewardAmount = Math.round((trade.pnl || 0) * 10); // 10 points per dollar
          addReward(`${trade.pair} (${pnlPercent.toFixed(2)}%)`, rewardAmount);
        });

        // Get current state
        const trades = botInstance.current.getTrades();
        setOpenTrades(trades.filter((t) => t.status === "open"));
        setClosedTrades(trades.filter((t) => t.status === "closed"));

        // Update metrics
        const newMetrics = botInstance.current.getMetrics();
        setMetrics(newMetrics);
      }

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errMsg);
      addLog("ERROR", `Bot cycle error: ${errMsg}`);
    }
  };

  const handleStart = async () => {
    if (selectedPairs.length === 0) {
      setError("Please select at least one currency pair");
      return;
    }

    try {
      setLoading(true);

      // Initialize bot with user's balance
      botInstance.current = new TradingBot(
        "Automated Trading Bot",
        selectedPairs,
        userBalance,
        1
      );

      // Reset warmup
      warmupStartRef.current = new Date();
      setWarmupTime(0);
      priceHistoryRef.current.clear();

      addLog("INFO", `🤖 Bot starting with balance: $${userBalance.toFixed(2)}`);
      addLog("INFO", `⏳ Entering 30-second warmup phase (collecting market data)...`);

      // Run first cycle immediately
      await runTradingCycle();

      // Set interval for subsequent cycles
      cycleIntervalRef.current = setInterval(() => {
        runTradingCycle();
      }, tradeInterval);

      setIsRunning(true);
      setShowConfig(false);
      setError(null);
      setTotalRewards(0);
      setRewardStreak(0);
      setRewardLog([]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to start bot";
      setError(errMsg);
      addLog("ERROR", errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (cycleIntervalRef.current) {
      clearInterval(cycleIntervalRef.current);
      cycleIntervalRef.current = null;
    }

    warmupStartRef.current = null;
    setWarmupTime(0);
    priceHistoryRef.current.clear();

    setIsRunning(false);
    addLog("INFO", "🛑 Bot stopped");
  };

  const handleReset = () => {
    if (isRunning) {
      handleStop();
    }
    setLogs([]);
    setMetrics(null);
    setOpenTrades([]);
    setClosedTrades([]);
    setSignals([]);
    setError(null);
    setShowConfig(true);
    logIdRef.current = 0;
    setWarmupTime(0);
    warmupStartRef.current = null;
    priceHistoryRef.current.clear();
  };

  const handlePairToggle = (pair: string) => {
    setSelectedPairs((prev) =>
      prev.includes(pair)
        ? prev.filter((p) => p !== pair)
        : [...prev, pair]
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
          <p className="text-gray-600 mt-1">
            Real-time trading bot with live forex data and trade simulation
          </p>
        </div>
        <div className="flex gap-2">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              className="gap-2"
              disabled={loading}
            >
              <Play size={16} /> Start Bot
            </Button>
          ) : (
            <>
              <Button
                onClick={handleStop}
                variant="outline"
                className="gap-2"
                disabled={loading}
              >
                <Pause size={16} /> Stop
              </Button>
              <Button
                onClick={() => setShowConfig(true)}
                variant="outline"
                className="gap-2"
              >
                <Settings size={16} /> Config
              </Button>
            </>
          )}
          <Button
            onClick={handleReset}
            variant="outline"
            className="gap-2"
            disabled={loading}
          >
            <RotateCw size={16} /> Reset
          </Button>
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
              <label className="block text-sm font-semibold mb-2">
                Select Currency Pairs
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AVAILABLE_PAIRS.map((pair) => (
                  <label
                    key={pair}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-blue-100"
                  >
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
              <p className="text-xs text-gray-600 mt-2">
                Selected: {selectedPairs.join(", ") || "None"}
              </p>
            </div>

            {/* Trade Interval Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Market Check Interval
              </label>
              <div className="flex gap-2 flex-wrap">
                {TRADE_INTERVALS.map((interval) => (
                  <Button
                    key={interval.value}
                    variant={
                      tradeInterval === interval.value
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => setTradeInterval(interval.value)}
                    disabled={isRunning}
                  >
                    {interval.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                How often the bot checks market data and executes trades
              </p>
            </div>

            {!isRunning && (
              <Button
                onClick={handleStart}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
                disabled={loading || selectedPairs.length === 0}
              >
                <Play size={16} /> Start Bot with Real Data
              </Button>
            )}
            {isRunning && (
              <Button
                onClick={() => setShowConfig(false)}
                className="w-full"
              >
                Close Configuration
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bot Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRunning
                    ? "bg-green-500 animate-pulse"
                    : "bg-gray-400"
                }`}
              ></div>
              <span className="font-semibold">
                {isRunning ? "Running" : "Stopped"}
              </span>
            </div>
            {lastUpdate && (
              <p className="text-xs text-gray-500 mt-1">
                Last: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {metrics?.totalTrades || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(metrics?.winRate || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                (metrics?.totalPnL || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              ${(metrics?.totalPnL || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Open Trades */}
      {openTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={18} /> Open Trades ({openTrades.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {openTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex justify-between items-center p-2 border rounded"
                >
                  <div>
                    <p className="font-semibold">{trade.pair}</p>
                    <p className="text-xs text-gray-600">
                      {trade.type} @ {trade.entry.toFixed(5)} | SL:{" "}
                      {trade.stopLoss.toFixed(5)} | TP:{" "}
                      {trade.takeProfit.toFixed(5)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">
                      {trade.quantity.toFixed(2)} lots
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Signals */}
      {signals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Recent Signals ({signals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {signals.slice(0, 5).map((signal) => (
                <div
                  key={signal.id}
                  className="flex justify-between items-center p-2 bg-yellow-50 border border-yellow-200 rounded"
                >
                  <div>
                    <p className="font-semibold">{signal.pair}</p>
                    <p className="text-xs text-gray-600">
                      {signal.type} at {signal.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-yellow-700">
                      {signal.confidence}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bot Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 Bot Activity Log
            {isRunning && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded animate-pulse">
                Live
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <p className="text-gray-500">
                Bot logs will appear here when running...
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-gray-500 flex-shrink-0">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={`flex-shrink-0 ${getLogColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Real Data Trading Bot:</strong> This bot fetches live forex rates
          from exchangerate.host and simulates trades based on technical
          analysis signals (Moving Average Cross, RSI, Breakout). All trades are
          simulated with realistic entry, stop-loss, and take-profit levels.
          Check the logs to see trading activity.
        </AlertDescription>
      </Alert>
    </div>
  );
}
