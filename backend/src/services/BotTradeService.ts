import { Pool } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

export interface IBotTrade {
  id: string;
  trader_id: string;
  pair: string;
  type: "BUY" | "SELL";
  entry_price: number;
  exit_price?: number;
  stop_loss: number;
  take_profit: number;
  quantity: number;
  entry_time: Date;
  exit_time?: Date;
  status: "open" | "closed" | "expired";
  pnl?: number;
  pnl_percent?: number;
}

export interface IBotSession {
  id: string;
  trader_id: string;
  status: "running" | "paused" | "stopped";
  pairs: string[];
  trade_interval: number;
  initial_balance: number;
  current_balance: number;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
}

export class BotTradeService {
  constructor(private pool: Pool) {}

  /**
   * Start a new bot session
   */
  async startBotSession(
    traderId: string,
    pairs: string[],
    tradeInterval: number
  ): Promise<string> {
    const connection = await this.pool.getConnection();
    try {
      const sessionId = uuidv4();

      // Get current balance
      const [balanceRows]: any = await connection.execute(
        "SELECT account_balance FROM traders_profiles WHERE id = ?",
        [traderId]
      );

      const balance = balanceRows[0]?.account_balance || 10000;

      // Create session
      await connection.execute(
        `INSERT INTO bot_sessions 
        (id, trader_id, status, pairs, trade_interval, initial_balance, current_balance, started_at)
        VALUES (?, ?, 'running', ?, ?, ?, ?, NOW())`,
        [sessionId, traderId, JSON.stringify(pairs), tradeInterval, balance, balance]
      );

      // Update active session in trader profile
      await connection.execute(
        "UPDATE traders_profiles SET active_bot_session_id = ? WHERE id = ?",
        [sessionId, traderId]
      );

      return sessionId;
    } finally {
      connection.release();
    }
  }

  /**
   * End bot session
   */
  async endBotSession(sessionId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(
        `UPDATE bot_sessions 
        SET status = 'stopped', ended_at = NOW()
        WHERE id = ?`,
        [sessionId]
      );

      // Clear active session
      const [sessionRows]: any = await connection.execute(
        "SELECT trader_id FROM bot_sessions WHERE id = ?",
        [sessionId]
      );

      if (sessionRows.length > 0) {
        await connection.execute(
          "UPDATE traders_profiles SET active_bot_session_id = NULL WHERE id = ?",
          [sessionRows[0].trader_id]
        );
      }
    } finally {
      connection.release();
    }
  }

  /**
   * Record a trade execution
   */
  async recordTrade(
    traderId: string,
    sessionId: string,
    trade: {
      pair: string;
      type: "BUY" | "SELL";
      entry_price: number;
      stop_loss: number;
      take_profit: number;
      quantity: number;
    }
  ): Promise<string> {
    const connection = await this.pool.getConnection();
    try {
      const tradeId = uuidv4();

      await connection.execute(
        `INSERT INTO bot_trades 
        (id, trader_id, pair, type, entry_price, stop_loss, take_profit, quantity, entry_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'open')`,
        [
          tradeId,
          traderId,
          trade.pair,
          trade.type,
          trade.entry_price,
          trade.stop_loss,
          trade.take_profit,
          trade.quantity,
        ]
      );

      // Update session trade count
      await connection.execute(
        `UPDATE bot_sessions 
        SET total_trades = total_trades + 1
        WHERE id = ?`,
        [sessionId]
      );

      return tradeId;
    } finally {
      connection.release();
    }
  }

  /**
   * Close a trade and update balance
   */
  async closeTrade(
    tradeId: string,
    traderId: string,
    sessionId: string,
    exitPrice: number,
    reason: string
  ): Promise<void> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get trade details
      const [tradeRows]: any = await connection.execute(
        "SELECT * FROM bot_trades WHERE id = ? AND trader_id = ?",
        [tradeId, traderId]
      );

      if (tradeRows.length === 0) {
        throw new Error("Trade not found");
      }

      const trade = tradeRows[0];

      // Calculate P&L
      let pnl: number;
      if (trade.type === "BUY") {
        pnl = (exitPrice - trade.entry_price) * trade.quantity;
      } else {
        pnl = (trade.entry_price - exitPrice) * trade.quantity;
      }

      const pnlPercent = (pnl / (trade.entry_price * trade.quantity)) * 100;

      // Update trade
      await connection.execute(
        `UPDATE bot_trades 
        SET exit_price = ?, exit_time = NOW(), status = 'closed', pnl = ?, pnl_percent = ?
        WHERE id = ?`,
        [exitPrice, pnl, pnlPercent, tradeId]
      );

      // Update session
      const isWin = pnl > 0;
      await connection.execute(
        `UPDATE bot_sessions 
        SET 
          current_balance = current_balance + ?,
          total_pnl = total_pnl + ?,
          winning_trades = winning_trades + ?,
          losing_trades = losing_trades + ?
        WHERE id = ?`,
        [pnl, pnl, isWin ? 1 : 0, isWin ? 0 : 1, sessionId]
      );

      // Update trader account balance
      await connection.execute(
        `UPDATE traders_profiles 
        SET account_balance = account_balance + ?
        WHERE id = ?`,
        [pnl, traderId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Add bot log entry
   */
  async addLog(
    traderId: string,
    sessionId: string,
    level: "INFO" | "SIGNAL" | "TRADE" | "CLOSE" | "ERROR",
    message: string,
    details?: Record<string, any>
  ): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      const logId = uuidv4();

      await connection.execute(
        `INSERT INTO bot_logs 
        (id, session_id, trader_id, level, message, details)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [logId, sessionId, traderId, level, message, details ? JSON.stringify(details) : null]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Get active session for trader
   */
  async getActiveSession(traderId: string): Promise<IBotSession | null> {
    const connection = await this.pool.getConnection();
    try {
      const [rows]: any = await connection.execute(
        `SELECT * FROM bot_sessions 
        WHERE trader_id = ? AND status = 'running' 
        ORDER BY started_at DESC LIMIT 1`,
        [traderId]
      );

      if (rows.length === 0) return null;

      const session = rows[0];
      return {
        id: session.id,
        trader_id: session.trader_id,
        status: session.status,
        pairs: JSON.parse(session.pairs),
        trade_interval: session.trade_interval,
        initial_balance: session.initial_balance,
        current_balance: session.current_balance,
        total_trades: session.total_trades,
        winning_trades: session.winning_trades,
        total_pnl: session.total_pnl,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get open trades for session
   */
  async getOpenTrades(sessionId: string): Promise<IBotTrade[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows]: any = await connection.execute(
        `SELECT * FROM bot_trades 
        WHERE (SELECT trader_id FROM bot_sessions WHERE id = ? LIMIT 1) = trader_id
        AND status = 'open'`,
        [sessionId]
      );

      return rows.map((row: any) => ({
        ...row,
        entry_time: new Date(row.entry_time),
        exit_time: row.exit_time ? new Date(row.exit_time) : undefined,
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * Get trader's account balance
   */
  async getTraderBalance(traderId: string): Promise<number> {
    const connection = await this.pool.getConnection();
    try {
      const [rows]: any = await connection.execute(
        "SELECT account_balance FROM traders_profiles WHERE id = ?",
        [traderId]
      );

      return rows[0]?.account_balance || 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get recent logs
   */
  async getRecentLogs(sessionId: string, limit: number = 30): Promise<any[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows]: any = await connection.execute(
        `SELECT * FROM bot_logs 
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
        [sessionId, limit]
      );

      return rows.reverse().map((row: any) => ({
        ...row,
        details: row.details ? JSON.parse(row.details) : undefined,
        created_at: new Date(row.created_at),
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * Update session balance
   */
  async updateSessionBalance(sessionId: string, newBalance: number): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(
        `UPDATE bot_sessions 
        SET current_balance = ?
        WHERE id = ?`,
        [newBalance, sessionId]
      );
    } finally {
      connection.release();
    }
  }
}
