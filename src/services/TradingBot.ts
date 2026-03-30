import { LiveForexRate } from "@/lib/forexApi";

export interface BotTrade {
  id: string;
  pair: string;
  type: "BUY" | "SELL";
  entry: number;
  exit?: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  entryTime: Date;
  exitTime?: Date;
  status: "open" | "closed" | "expired";
  pnl?: number;
  pnlPercent?: number;
}

export interface BotSignal {
  id: string;
  pair: string;
  type: "BUY" | "SELL";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  strategy: string;
  timestamp: Date;
  active: boolean;
}

export interface BotMetrics {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  winningTrades: number;
  totalPnL: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
}

export interface BotLog {
  id: string;
  timestamp: Date;
  level: "INFO" | "SIGNAL" | "TRADE" | "CLOSE" | "ERROR";
  message: string;
  details?: Record<string, any>;
}

export class TradingBot {
  private name: string;
  private pairs: string[];
  private balance: number;
  private riskPerTrade: number; // percentage
  private trades: BotTrade[] = [];
  private signals: BotSignal[] = [];
  private priceHistory: Map<string, number[]> = new Map();
  private openPrice: Map<string, number> = new Map();
  private logs: BotLog[] = [];
  private logIdCounter = 0;

  constructor(
    name: string,
    pairs: string[],
    initialBalance: number,
    riskPerTrade: number = 1
  ) {
    this.name = name;
    this.pairs = pairs;
    this.balance = initialBalance;
    this.riskPerTrade = riskPerTrade;
    
    this.addLog("INFO", `🤖 Bot initialized: ${name}`, {
      pairs: pairs.join(", "),
      initialBalance: initialBalance,
      riskPerTrade: `${riskPerTrade}%`,
    });
  }

  /**
   * Update trading pairs dynamically
   */
  setPairs(newPairs: string[]) {
    this.pairs = newPairs;
    this.priceHistory.clear();
    this.openPrice.clear();
    
    this.addLog("INFO", `⚙️ Trading pairs updated`, {
      pairs: newPairs.join(", "),
    });
  }

  /**
   * Analyzes live forex rates and generates trading signals
   */
  analyzeLiveRates(rates: LiveForexRate[]): BotSignal[] {
    const newSignals: BotSignal[] = [];

    this.addLog("INFO", `📊 Checking market data for ${rates.length} currency pairs`, {
      pairs: rates.map(r => `${r.symbol} (${r.bid.toFixed(5)})`),
      source: rates[0]?.source || "Unknown",
    });

    for (const rate of rates) {
      if (!this.pairs.includes(rate.symbol)) continue;

      // Store price history
      if (!this.priceHistory.has(rate.symbol)) {
        this.priceHistory.set(rate.symbol, []);
      }
      const history = this.priceHistory.get(rate.symbol)!;
      const midPrice = (rate.bid + rate.ask) / 2;
      history.push(midPrice);

      // Keep last 50 prices for analysis
      if (history.length > 50) {
        history.shift();
      }

      // Store opening price for the day
      if (!this.openPrice.has(rate.symbol)) {
        this.openPrice.set(rate.symbol, midPrice);
      }

      // Generate signals using multiple strategies
      const maCrossSignal = this.analyzeMovingAverageCross(rate, history);
      const rsiSignal = this.analyzeRSI(rate, history);
      const breakoutSignal = this.analyzeBreakout(rate, history);

      // Combine signals
      const combinedSignal = this.combineSignals(
        rate,
        maCrossSignal,
        rsiSignal,
        breakoutSignal
      );

      if (combinedSignal) {
        // Check if we don't already have a signal for this pair
        const existingSignal = this.signals.find(
          (s) => s.pair === rate.symbol && s.active
        );
        if (!existingSignal) {
          newSignals.push(combinedSignal);
          this.addLog("SIGNAL", `🎯 ${combinedSignal.type} signal generated for ${combinedSignal.pair}`, {
            pair: combinedSignal.pair,
            type: combinedSignal.type,
            confidence: combinedSignal.confidence,
            entry: combinedSignal.entry,
            stopLoss: combinedSignal.stopLoss,
            takeProfit: combinedSignal.takeProfit,
          });
        }
      }
    }

    // Remove expired signals
    this.signals = this.signals.filter((s) => {
      const ageMinutes = (Date.now() - s.timestamp.getTime()) / (1000 * 60);
      return ageMinutes < 60; // Signal valid for 60 minutes
    });

    this.signals.push(...newSignals);
    return newSignals;
  }

  /**
   * Moving Average Cross Strategy
   */
  private analyzeMovingAverageCross(
    rate: LiveForexRate,
    history: number[]
  ): { type: "BUY" | "SELL"; confidence: number } | null {
    if (history.length < 10) return null;

    const fast = this.calculateMA(history.slice(-5)); // 5 period MA
    const slow = this.calculateMA(history.slice(-Math.min(10, history.length))); // Adaptive slow MA

    if (fast > slow * 1.001) {
      // Bullish crossover with 0.1% threshold to avoid false signals
      return { type: "BUY", confidence: 70 };
    } else if (fast < slow * 0.999) {
      // Bearish crossover
      return { type: "SELL", confidence: 70 };
    }

    return null;
  }

  /**
   * RSI Strategy (Relative Strength Index)
   */
  private analyzeRSI(
    rate: LiveForexRate,
    history: number[]
  ): { type: "BUY" | "SELL"; confidence: number } | null {
    if (history.length < 10) return null;

    const rsi = this.calculateRSI(history.slice(-Math.min(14, history.length)));

    if (rsi < 30) {
      return { type: "BUY", confidence: 75 }; // Oversold
    } else if (rsi > 70) {
      return { type: "SELL", confidence: 75 }; // Overbought
    }

    return null;
  }

  /**
   * Support/Resistance Breakout Strategy
   */
  private analyzeBreakout(
    rate: LiveForexRate,
    history: number[]
  ): { type: "BUY" | "SELL"; confidence: number } | null {
    if (history.length < 15) return null;

    const support = Math.min(...history.slice(-Math.min(30, history.length)));
    const resistance = Math.max(...history.slice(-Math.min(30, history.length)));
    const midPrice = (rate.bid + rate.ask) / 2;

    if (midPrice > resistance * 1.005) {
      return { type: "BUY", confidence: 65 }; // Breakout above resistance
    } else if (midPrice < support * 0.995) {
      return { type: "SELL", confidence: 65 }; // Breakout below support
    }

    return null;
  }

  /**
   * Combines multiple signals for stronger confirmation
   * Simplified: use signals when:
   * - 2+ strategies agree, OR
   * - 1 strategy with confidence > 65%
   */
  private combineSignals(
    rate: LiveForexRate,
    ...signals: (
      | { type: "BUY" | "SELL"; confidence: number }
      | null
    )[]
  ): BotSignal | null {
    const validSignals = signals.filter((s) => s !== null) as Array<{
      type: "BUY" | "SELL";
      confidence: number;
    }>;

    if (validSignals.length === 0) return null;

    // If we have 2+ signals that agree on direction that's ideal
    const buySignals = validSignals.filter((s) => s.type === "BUY");
    const sellSignals = validSignals.filter((s) => s.type === "SELL");

    let signalType: "BUY" | "SELL" | null = null;
    let selectedSignals: typeof validSignals = [];

    // Case 1: Multiple strategies agree
    if (buySignals.length >= 2) {
      signalType = "BUY";
      selectedSignals = buySignals;
    } else if (sellSignals.length >= 2) {
      signalType = "SELL";
      selectedSignals = sellSignals;
    }
    // Case 2: Single strong signal (confidence >= 70)
    else if (validSignals.length === 1 && validSignals[0].confidence >= 70) {
      signalType = validSignals[0].type;
      selectedSignals = validSignals;
    }
    // Case 3: Majority vote with good average confidence
    else if (buySignals.length > sellSignals.length) {
      const avgConf = buySignals.reduce((s, v) => s + v.confidence, 0) / buySignals.length;
      if (avgConf >= 70) {
        signalType = "BUY";
        selectedSignals = buySignals;
      }
    } else if (sellSignals.length > buySignals.length) {
      const avgConf = sellSignals.reduce((s, v) => s + v.confidence, 0) / sellSignals.length;
      if (avgConf >= 70) {
        signalType = "SELL";
        selectedSignals = sellSignals;
      }
    }

    if (!signalType || selectedSignals.length === 0) return null;

    const avgConfidence = Math.round(
      selectedSignals.reduce((sum, s) => sum + s.confidence, 0) / selectedSignals.length
    );

    const midPrice = (rate.bid + rate.ask) / 2;
    const stopLossDistance = midPrice * 0.01; // 1% stop loss
    const takeProfitDistance = midPrice * 0.02; // 2% take profit

    const signal: BotSignal = {
      id: `${rate.symbol}-${Date.now()}`,
      pair: rate.symbol,
      type: signalType,
      confidence: avgConfidence,
      entry: midPrice,
      stopLoss:
        signalType === "BUY"
          ? midPrice - stopLossDistance
          : midPrice + stopLossDistance,
      takeProfit:
        signalType === "BUY"
          ? midPrice + takeProfitDistance
          : midPrice - takeProfitDistance,
      strategy: "Multi-Strategy Confirmation",
      timestamp: new Date(),
      active: true,
    };

    return signal;
  }

  /**
   * Executes trades based on signals
   */
  executeTrades(rates: LiveForexRate[]): BotTrade[] {
    const executedTrades: BotTrade[] = [];

    for (const signal of this.signals.filter((s) => s.active)) {
      const rate = rates.find((r) => r.symbol === signal.pair);
      if (!rate) continue;

      // Calculate position size based on risk
      const riskAmount = this.balance * (this.riskPerTrade / 100);
      const stopLossDistance = Math.abs(signal.entry - signal.stopLoss);
      const quantity = riskAmount / stopLossDistance;

      const trade: BotTrade = {
        id: `${signal.pair}-${Date.now()}`,
        pair: signal.pair,
        type: signal.type,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        quantity,
        entryTime: new Date(),
        status: "open",
      };

      this.trades.push(trade);
      executedTrades.push(trade);

      this.addLog("TRADE", `📈 TRADE OPENED: ${signal.type} ${signal.pair}`, {
        pair: signal.pair,
        type: signal.type,
        entry: trade.entry,
        quantity: trade.quantity.toFixed(2),
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        riskAmount: (this.balance * this.riskPerTrade / 100).toFixed(2),
      });

      // Mark signal as used
      signal.active = false;
    }

    return executedTrades;
  }

  /**
   * Updates open trades based on current prices
   */
  updateTrades(rates: LiveForexRate[]): BotTrade[] {
    const closedTrades: BotTrade[] = [];

    for (const trade of this.trades.filter((t) => t.status === "open")) {
      const rate = rates.find((r) => r.symbol === trade.pair);
      if (!rate) continue;

      const currentPrice = (rate.bid + rate.ask) / 2;

      // Check stop loss
      if (
        (trade.type === "BUY" && currentPrice <= trade.stopLoss) ||
        (trade.type === "SELL" && currentPrice >= trade.stopLoss)
      ) {
        this.closeTrade(trade, trade.stopLoss, "Stop Loss");
        closedTrades.push(trade);
      }
      // Check take profit
      else if (
        (trade.type === "BUY" && currentPrice >= trade.takeProfit) ||
        (trade.type === "SELL" && currentPrice <= trade.takeProfit)
      ) {
        this.closeTrade(trade, trade.takeProfit, "Take Profit");
        closedTrades.push(trade);
      }
    }

    return closedTrades;
  }

  /**
   * Manually close a trade
   */
  private closeTrade(trade: BotTrade, exitPrice: number, reason: string) {
    trade.exit = exitPrice;
    trade.exitTime = new Date();
    trade.status = "closed";

    const pnl =
      trade.type === "BUY"
        ? (exitPrice - trade.entry) * trade.quantity
        : (trade.entry - exitPrice) * trade.quantity;

    trade.pnl = pnl;
    trade.pnlPercent = (pnl / (trade.entry * trade.quantity)) * 100;

    // Update balance
    this.balance += pnl;

    const profitLossEmoji = pnl >= 0 ? "💰" : "📉";
    this.addLog("CLOSE", `${profitLossEmoji} TRADE CLOSED: ${trade.pair} (${reason})`, {
      pair: trade.pair,
      type: trade.type,
      entry: trade.entry,
      exit: exitPrice,
      quantity: trade.quantity.toFixed(2),
      pnl: pnl.toFixed(2),
      pnlPercent: trade.pnlPercent.toFixed(2),
      reason,
      newBalance: this.balance.toFixed(2),
    });
  }

  /**
   * Gets current bot metrics
   */
  getMetrics(): BotMetrics {
    const closedTrades = this.trades.filter((t) => t.status === "closed");
    const openTrades = this.trades.filter((t) => t.status === "open");
    const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0);

    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = closedTrades
      .filter((t) => (t.pnl || 0) <= 0)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);

    const winRate =
      closedTrades.length > 0
        ? (winningTrades.length / closedTrades.length) * 100
        : 0;

    const maxDrawdown = this.calculateMaxDrawdown();

    return {
      totalTrades: this.trades.length,
      closedTrades: closedTrades.length,
      openTrades: openTrades.length,
      winningTrades: winningTrades.length,
      totalPnL,
      winRate,
      averageWin:
        winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      averageLoss:
        closedTrades.length - winningTrades.length > 0
          ? totalLosses / (closedTrades.length - winningTrades.length)
          : 0,
      profitFactor: totalLosses !== 0 ? totalWins / Math.abs(totalLosses) : 0,
      maxDrawdown,
    };
  }

  /**
   * Calculates maximum drawdown
   */
  private calculateMaxDrawdown(): number {
    if (this.trades.length === 0) return 0;

    let maxBalance = this.balance;
    let maxDrawdown = 0;
    let runningBalance = this.balance;

    // Reverse iterate through closed trades to calculate drawdown
    const closedTrades = [...this.trades.filter((t) => t.status === "closed")]
      .reverse();

    for (const trade of closedTrades) {
      runningBalance -= (trade.pnl || 0);
      if (runningBalance > maxBalance) {
        maxBalance = runningBalance;
      }
      const drawdown = ((maxBalance - runningBalance) / maxBalance) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Helper: Calculate Simple Moving Average
   */
  private calculateMA(prices: number[]): number {
    return prices.reduce((sum, p) => sum + p, 0) / prices.length;
  }

  /**
   * Helper: Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(prices: number[]): number {
    if (prices.length < 2) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / (prices.length - 1);
    const avgLoss = losses / (prices.length - 1);

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  // Getters
  getName(): string {
    return this.name;
  }

  getPairs(): string[] {
    return this.pairs;
  }

  getBalance(): number {
    return this.balance;
  }

  getTrades(): BotTrade[] {
    return this.trades;
  }

  getSignals(): BotSignal[] {
    return this.signals;
  }

  getActiveSignals(): BotSignal[] {
    return this.signals.filter((s) => s.active);
  }

  getOpenTrades(): BotTrade[] {
    return this.trades.filter((t) => t.status === "open");
  }

  getClosedTrades(): BotTrade[] {
    return this.trades.filter((t) => t.status === "closed");
  }

  /**
   * Logging utilities
   */
  private addLog(level: BotLog["level"], message: string, details?: Record<string, any>) {
    const log: BotLog = {
      id: `log-${++this.logIdCounter}`,
      timestamp: new Date(),
      level,
      message,
      details,
    };
    this.logs.push(log);
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }
  }

  getLogs(): BotLog[] {
    return [...this.logs]; // Return copy
  }

  getRecentLogs(count: number = 20): BotLog[] {
    return this.logs.slice(-count);
  }

  clearLogs() {
    this.logs = [];
  }
}

/**
 * Pre-configured trading bot with common pairs
 */
export function createBot(): TradingBot {
  return new TradingBot("Trading Bot", ["EUR/USD", "GBP/USD", "USD/JPY"], 10000, 1);
}
