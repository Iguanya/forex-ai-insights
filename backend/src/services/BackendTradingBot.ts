import { Pool } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import type { LiveForexRate } from "../lib/minimal-forex";
import { fetchLiveRates } from "../lib/minimal-forex";
import { BotTradeService } from "./BotTradeService";

export interface BotSignal {
  pair: string;
  type: "BUY" | "SELL";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
}

export interface BotTrade {
  id: string;
  pair: string;
  type: "BUY" | "SELL";
  quantity: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
}

/**
 * Backend Trading Bot Service
 * Runs in the background and manages trades with real account balance
 */
export class BackendTradingBot {
  private sessionId: string;
  private traderId: string;
  private pairs: string[];
  private interval: number;
  private isRunning: boolean = false;
  private intervalHandle: NodeJS.Timeout | null = null;
  private balance: number = 10000;
  private signals: Map<string, BotSignal> = new Map();
  private openTrades: Map<string, BotTrade> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private riskPerTrade: number = 0.01; // 1%

  constructor(
    private pool: Pool,
    private botTradeService: BotTradeService,
    sessionId: string,
    traderId: string,
    pairs: string[],
    interval: number,
    initialBalance: number
  ) {
    this.sessionId = sessionId;
    this.traderId = traderId;
    this.pairs = pairs;
    this.interval = interval;
    this.balance = initialBalance;
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    await this.botTradeService.addLog(
      this.traderId,
      this.sessionId,
      "INFO",
      `🤖 Backend bot started for pairs: ${this.pairs.join(", ")}`
    );

    // Run immediately, then set interval
    await this.runCycle();
    this.intervalHandle = setInterval(() => this.runCycle(), this.interval);
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    // Close all open trades at market price
    for (const [, trade] of this.openTrades) {
      await this.closeTrade(trade.id, trade.entry, "Bot stopped");
    }

    await this.botTradeService.addLog(
      this.traderId,
      this.sessionId,
      "INFO",
      `🛑 Backend bot stopped`
    );
  }

  /**
   * Main bot cycle
   */
  private async runCycle(): Promise<void> {
    try {
      // Fetch live rates
      const rates = await fetchLiveRates(this.pairs);

      if (rates.length === 0) {
        await this.botTradeService.addLog(
          this.traderId,
          this.sessionId,
          "ERROR",
          "Failed to fetch forex rates"
        );
        return;
      }

      // Log market check
      await this.botTradeService.addLog(
        this.traderId,
        this.sessionId,
        "INFO",
        `📊 Market check: ${rates.map((r) => `${r.symbol}=${r.exchangeRate.toFixed(5)}`).join(", ")}`
      );

      // Analyze rates for signals
      await this.analyzeRates(rates);

      // Execute trades based on signals
      await this.executeTrades(rates);

      // Update open trades
      await this.updateTrades(rates);

      // Update session balance
      await this.botTradeService.updateSessionBalance(this.sessionId, this.balance);
    } catch (error: any) {
      await this.botTradeService.addLog(
        this.traderId,
        this.sessionId,
        "ERROR",
        `Error in bot cycle: ${error.message}`
      );
    }
  }

  /**
   * Analyze rates for trading signals
   */
  private async analyzeRates(rates: LiveForexRate[]): Promise<void> {
    for (const rate of rates) {
      if (!this.pairs.includes(rate.symbol)) continue;

      // Build price history
      if (!this.priceHistory.has(rate.symbol)) {
        this.priceHistory.set(rate.symbol, []);
      }

      const history = this.priceHistory.get(rate.symbol)!;
      history.push(rate.exchangeRate);

      if (history.length > 50) {
        history.shift();
      }

      // Check for signals
      const signal = this.analyzePrice(rate, history);

      if (signal) {
        this.signals.set(rate.symbol, signal);

        await this.botTradeService.addLog(
          this.traderId,
          this.sessionId,
          "SIGNAL",
          `🎯 ${signal.type} signal for ${signal.pair} (Confidence: ${signal.confidence}%)`,
          {
            pair: signal.pair,
            type: signal.type,
            entry: signal.entry,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
          }
        );
      }
    }
  }

  /**
   * Analyze price for signals
   */
  private analyzePrice(rate: LiveForexRate, history: number[]): BotSignal | null {
    if (history.length < 5) return null;

    const current = rate.exchangeRate;
    const prev5Avg =
      history.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, history.length);
    const prev20Avg =
      history.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, history.length);

    let signalType: "BUY" | "SELL" | null = null;

    // Simple moving average crossover
    if (current > prev5Avg && prev5Avg > prev20Avg) {
      signalType = "BUY";
    } else if (current < prev5Avg && prev5Avg < prev20Avg) {
      signalType = "SELL";
    }

    if (!signalType) return null;

    const stopLossDistance = current * 0.01; // 1% SL
    const takeProfitDistance = current * 0.02; // 2% TP

    return {
      pair: rate.symbol,
      type: signalType,
      confidence: 75,
      entry: current,
      stopLoss:
        signalType === "BUY"
          ? current - stopLossDistance
          : current + stopLossDistance,
      takeProfit:
        signalType === "BUY"
          ? current + takeProfitDistance
          : current - takeProfitDistance,
    };
  }

  /**
   * Execute trades based on signals
   */
  private async executeTrades(rates: LiveForexRate[]): Promise<void> {
    for (const [pair, signal] of this.signals) {
      // Only execute one trade per pair
      if (this.openTrades.has(pair)) {
        continue;
      }

      // Check if we have enough balance
      const riskAmount = this.balance * this.riskPerTrade;
      const stopLossDistance = Math.abs(signal.entry - signal.stopLoss);
      const quantity = riskAmount / stopLossDistance;

      if (quantity <= 0) {
        continue;
      }

      // Record trade in database
      const tradeId = await this.botTradeService.recordTrade(
        this.traderId,
        this.sessionId,
        {
          pair: signal.pair,
          type: signal.type,
          entry_price: signal.entry,
          stop_loss: signal.stopLoss,
          take_profit: signal.takeProfit,
          quantity,
        }
      );

      // Store locally
      const trade: BotTrade = {
        id: tradeId,
        pair: signal.pair,
        type: signal.type,
        quantity,
        entry: signal.entry,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
      };

      this.openTrades.set(pair, trade);

      await this.botTradeService.addLog(
        this.traderId,
        this.sessionId,
        "TRADE",
        `📈 TRADE OPENED: ${signal.type} ${signal.pair}`,
        {
          pair: signal.pair,
          type: signal.type,
          entry: signal.entry,
          quantity: quantity.toFixed(2),
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
        }
      );

      // Remove signal after execution
      this.signals.delete(pair);
    }
  }

  /**
   * Update open trades based on current prices
   */
  private async updateTrades(rates: LiveForexRate[]): Promise<void> {
    for (const [pair, trade] of this.openTrades) {
      const rate = rates.find((r) => r.symbol === pair);
      if (!rate) continue;

      const currentPrice = rate.exchangeRate;

      // Check stop loss
      if (
        (trade.type === "BUY" && currentPrice <= trade.stopLoss) ||
        (trade.type === "SELL" && currentPrice >= trade.stopLoss)
      ) {
        await this.closeTrade(trade.id, trade.stopLoss, "Stop Loss");
        this.openTrades.delete(pair);
      }
      // Check take profit
      else if (
        (trade.type === "BUY" && currentPrice >= trade.takeProfit) ||
        (trade.type === "SELL" && currentPrice <= trade.takeProfit)
      ) {
        await this.closeTrade(trade.id, trade.takeProfit, "Take Profit");
        this.openTrades.delete(pair);
      }
    }
  }

  /**
   * Close a trade
   */
  private async closeTrade(
    tradeId: string,
    exitPrice: number,
    reason: string
  ): Promise<void> {
    const trade = Array.from(this.openTrades.values()).find((t) => t.id === tradeId);
    if (!trade) return;

    // Calculate P&L
    let pnl: number;
    if (trade.type === "BUY") {
      pnl = (exitPrice - trade.entry) * trade.quantity;
    } else {
      pnl = (trade.entry - exitPrice) * trade.quantity;
    }

    this.balance += pnl;

    // Record trade close in database
    await this.botTradeService.closeTrade(tradeId, this.traderId, this.sessionId, exitPrice, reason);

    const emoji = pnl >= 0 ? "💰" : "📉";
    await this.botTradeService.addLog(
      this.traderId,
      this.sessionId,
      "CLOSE",
      `${emoji} TRADE CLOSED: ${trade.pair} (${reason})`,
      {
        pair: trade.pair,
        pnl: pnl.toFixed(2),
        pnlPercent: ((pnl / (trade.entry * trade.quantity)) * 100).toFixed(2),
        reason,
      }
    );
  }

  /**
   * Get bot status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      balance: this.balance,
      openTradeCount: this.openTrades.size,
      signalCount: this.signals.size,
    };
  }
}

/**
 * Global bot sessions manager
 */
export class BotSessionsManager {
  private sessions: Map<string, BackendTradingBot> = new Map();

  constructor(private pool: Pool, private botTradeService: BotTradeService) {}

  /**
   * Start a new bot instance
   */
  async createBot(
    sessionId: string,
    traderId: string,
    pairs: string[],
    interval: number,
    initialBalance: number
  ): Promise<BackendTradingBot> {
    const bot = new BackendTradingBot(
      this.pool,
      this.botTradeService,
      sessionId,
      traderId,
      pairs,
      interval,
      initialBalance
    );

    this.sessions.set(sessionId, bot);
    await bot.start();

    return bot;
  }

  /**
   * Stop a bot instance
   */
  async stopBot(sessionId: string): Promise<void> {
    const bot = this.sessions.get(sessionId);
    if (bot) {
      await bot.stop();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get bot instance
   */
  getBot(sessionId: string): BackendTradingBot | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active bots
   */
  getActiveBots(): BackendTradingBot[] {
    return Array.from(this.sessions.values());
  }
}

// Export mock for testing
export { LiveForexRate };
