import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Play, Pause, RotateCw, Settings } from "lucide-react";

const AVAILABLE_PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "USD/CAD"];
const TRADE_INTERVALS = [
  { value: 5000, label: "5 seconds" },
  { value: 10000, label: "10 seconds" },
  { value: 30000, label: "30 seconds" },
  { value: 60000, label: "1 minute" },
];

interface BotSession {
  id: string;
  status: "running" | "paused" | "stopped";
  pairs: string[];
  balance: number;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
}

interface BotLog {
  id: string;
  level: "INFO" | "SIGNAL" | "TRADE" | "CLOSE" | "ERROR";
  message: string;
  created_at: string;
}

export default function BotPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<BotSession | null>(null);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [accountBalance, setAccountBalance] = useState<number>(0);

  // Configuration
  const [selectedPairs, setSelectedPairs] = useState<string[]>(["EUR/USD", "GBP/USD", "USD/JPY"]);
  const [tradeInterval, setTradeInterval] = useState(5000);
  const [showConfig, setShowConfig] = useState(true);

  // Fetch account balance on load
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("http://localhost:3000/api/bot/balance", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setAccountBalance(data.balance);
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err);
      }
    };

    fetchBalance();
  }, []);

  // Poll for session updates when bot is running
  useEffect(() => {
    if (!isRunning) return;

    const pollInterval = setInterval(async () => {
      await fetchSessionStatus();
    }, 2000); // Fetch every 2 seconds

    return () => clearInterval(pollInterval);
  }, [isRunning]);

  // Fetch session status
  const fetchSessionStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !sessionId) return;

      setLoading(true);

      // Fetch active session
      const sessionRes = await fetch("http://localhost:3000/api/bot/session/active", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (sessionRes.ok) {
        const data = await sessionRes.json();
        if (data.session) {
          setSession(data.session);
        }
      }

      // Fetch logs
      const logsRes = await fetch(
        `http://localhost:3000/api/bot/logs/${sessionId}?limit=30`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs);
      }

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bot status");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (selectedPairs.length === 0) {
      setError("Please select at least one currency pair");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const res = await fetch("http://localhost:3000/api/bot/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pairs: selectedPairs,
          tradeInterval,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId);
        setShowConfig(false);
        setIsRunning(true);
        setAccountBalance(data.balance);

        // Fetch status immediately
        setTimeout(() => fetchSessionStatus(), 500);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to start bot");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start bot");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`http://localhost:3000/api/bot/stop/${sessionId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setIsRunning(false);
        setSessionId(null);
        setSession(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to stop bot");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop bot");
    } finally {
      setLoading(false);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = async () => {
    if (isRunning && sessionId) {
      await handleStop();
    }
    setLogs([]);
    setSession(null);
    setError(null);
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
          <p className="text-gray-600 mt-1">Backend-powered bot with real account balance and persistent trades</p>
        </div>
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="gap-2" disabled={loading}>
              <Play size={16} /> Start Bot
            </Button>
          ) : (
            <>
              <Button onClick={handleStop} variant="outline" className="gap-2" disabled={loading}>
                <Pause size={16} /> Stop
              </Button>
              <Button onClick={() => setShowConfig(true)} variant="outline" className="gap-2">
                <Settings size={16} /> Config
              </Button>
            </>
          )}
          <Button onClick={handleReset} variant="outline" className="gap-2" disabled={loading}>
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
              <Button onClick={handleStart} className="w-full gap-2 bg-green-600 hover:bg-green-700" disabled={loading}>
                <Play size={16} /> Start Bot with Backend
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

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bot Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
              <span className="font-semibold">{isRunning ? "Running" : "Stopped"}</span>
            </div>
            {lastUpdate && <p className="text-xs text-gray-500 mt-1">Last: {lastUpdate.toLocaleTimeString()}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Account Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${(session?.balance || accountBalance).toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{session?.total_trades || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${(session?.total_pnl || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${(session?.total_pnl || 0).toFixed(2)}
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
              <p className="text-gray-500">Bot logs will appear here when running...</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="text-gray-500 flex-shrink-0">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <span className={`flex-shrink-0 ${getLogColor(log.level)}`}>{log.level}</span>
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
          <strong>Backend Bot Features:</strong> This bot runs on the backend server and continues trading even when you close this page. 
          Real account balance is used. All trades are saved to the database with real P&L calculations.
          Current balance: ${(session?.balance || accountBalance).toFixed(2)}
        </AlertDescription>
      </Alert>
    </div>
  );
}
