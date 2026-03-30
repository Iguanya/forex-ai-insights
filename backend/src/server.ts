import express from "express";
import cors from "cors";
import { createPool } from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";
import { BotTradeService } from "./services/BotTradeService";
import { BotSessionsManager } from "./services/BackendTradingBot";

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-min-32-characters";

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:8081", "http://localhost:8082", "http://192.168.100.2:5173", "http://192.168.100.2:8081", "http://192.168.100.2:8082"],
  credentials: true,
}));
app.use(express.json());

// MySQL Connection Pool
const pool = createPool({
  host: process.env.MYSQL_HOST || "144.172.93.6",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "trading",
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  ssl: false,
});

// Initialize bot services
const botTradeService = new BotTradeService(pool);
const botSessionsManager = new BotSessionsManager(pool, botTradeService);

interface AuthResponse {
  token: string;
  user: { id: string; email: string; role: string };
}

// Auth Endpoints
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const userId = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      await connection.execute(
        "INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [userId, email, password_hash, role || "trader"]
      );

      // Create user profile
      await connection.execute(
        "INSERT INTO user_profiles (id, display_name) VALUES (?, ?)",
        [userId, email.split("@")[0]]
      );

      // Create trader profile if trader
      if (role === "trader") {
        await connection.execute(
          "INSERT INTO traders_profiles (id, account_balance) VALUES (?, ?)",
          [userId, 0]
        );
      }

      await connection.commit();

      const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: "7d" });
      const response: AuthResponse = { token, user: { id: userId, email, role } };

      res.json(response);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const connection = await pool.getConnection();

    const [rows]: any = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    connection.release();

    if (!rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    const response: AuthResponse = { token, user: { id: user.id, email: user.email, role: user.role } };

    res.json(response);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/auth/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ valid: false });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

// Profile Endpoints
app.get("/api/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const connection = await pool.getConnection();

    const [rows]: any = await connection.execute(
      `SELECT u.id, u.email, u.role, p.display_name, p.first_name, p.last_name, p.kyc_status, p.avatar_url 
       FROM users u LEFT JOIN user_profiles p ON u.id = p.id WHERE u.id = ?`,
      [decoded.id]
    );

    connection.release();

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/profile/trader", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const connection = await pool.getConnection();

    const [rows]: any = await connection.execute(
      `SELECT u.id, u.email, u.role, p.display_name, 
              COALESCE(t.account_balance, 0) as account_balance, 
              COALESCE(t.total_deposits, 0) as total_deposits, 
              COALESCE(t.total_confirmed, 0) as total_confirmed, 
              COALESCE(t.account_status, 'pending') as account_status, 
              COALESCE(t.verification_status, 'pending') as verification_status
       FROM users u 
       LEFT JOIN user_profiles p ON u.id = p.id
       LEFT JOIN traders_profiles t ON u.id = t.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    connection.release();

    if (!rows.length) {
      return res.status(404).json({ error: "Trader profile not found" });
    }

    res.json(rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Deposit Endpoints
app.post("/api/deposits", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { amount, currency, notes } = req.body;

    const depositId = uuidv4();
    const referenceNumber = `DEP-${Date.now()}-${decoded.id.slice(0, 8)}`;

    const connection = await pool.getConnection();

    try {
      // Get wallet address for this currency
      const [wallets]: any = await connection.execute(
        "SELECT wallet_address, network_name FROM deposit_wallets WHERE currency = ? AND is_active = true LIMIT 1",
        [currency]
      );

      const walletAddress = wallets.length > 0 ? wallets[0].wallet_address : null;

      await connection.execute(
        "INSERT INTO deposits (id, trader_id, amount, currency, wallet_address, reference_number, status, notes) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)",
        [depositId, decoded.id, amount, currency, walletAddress, referenceNumber, notes || null]
      );

      // Update trader total_deposits
      await connection.execute(
        "UPDATE traders_profiles SET total_deposits = total_deposits + ? WHERE id = ?",
        [amount, decoded.id]
      );

      connection.release();

      res.json({
        id: depositId,
        reference_number: referenceNumber,
        amount,
        currency,
        wallet_address: walletAddress,
        status: "pending"
      });
    } catch (err) {
      connection.release();
      throw err;
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/deposits", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const connection = await pool.getConnection();

    const [deposits]: any = await connection.execute(
      "SELECT * FROM deposits WHERE trader_id = ? ORDER BY created_at DESC",
      [decoded.id]
    );

    connection.release();

    res.json(deposits);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/admin/deposits", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const connection = await pool.getConnection();
    const [deposits]: any = await connection.execute(
      "SELECT * FROM deposits ORDER BY created_at DESC"
    );
    connection.release();

    res.json(deposits);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/deposits/:id/confirm", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;
    const connection = await pool.getConnection();

    const [deposits]: any = await connection.execute(
      "SELECT * FROM deposits WHERE id = ?",
      [id]
    );

    if (!deposits.length) {
      connection.release();
      return res.status(404).json({ error: "Deposit not found" });
    }

    const deposit = deposits[0];

    await connection.beginTransaction();
    try {
      await connection.execute(
        "UPDATE deposits SET status = 'confirmed', confirmed_at = NOW(), confirmed_by = ? WHERE id = ?",
        [decoded.id, id]
      );

      await connection.execute(
        "UPDATE traders_profiles SET total_confirmed = total_confirmed + ?, account_balance = account_balance + ? WHERE id = ?",
        [deposit.amount, deposit.amount, deposit.trader_id]
      );

      await connection.commit();
      connection.release();

      res.json({ success: true });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/deposits/:id/reject", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const connection = await pool.getConnection();

    const [deposits]: any = await connection.execute(
      "SELECT * FROM deposits WHERE id = ?",
      [id]
    );

    if (!deposits.length) {
      connection.release();
      return res.status(404).json({ error: "Deposit not found" });
    }

    const deposit = deposits[0];

    await connection.beginTransaction();
    try {
      await connection.execute(
        "UPDATE deposits SET status = 'failed', notes = ? WHERE id = ?",
        [reason || deposit.notes, id]
      );

      await connection.execute(
        "UPDATE traders_profiles SET total_deposits = total_deposits - ? WHERE id = ?",
        [deposit.amount, deposit.trader_id]
      );

      await connection.commit();
      connection.release();

      res.json({ success: true });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin endpoint to verify deposit with transaction hash
app.post("/api/admin/deposits/:id/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;
    const { transaction_hash, action } = req.body; // action: 'confirm' or 'reject'

    if (!action || !['confirm', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'confirm' or 'reject'" });
    }

    const connection = await pool.getConnection();

    const [deposits]: any = await connection.execute(
      "SELECT * FROM deposits WHERE id = ?",
      [id]
    );

    if (!deposits.length) {
      connection.release();
      return res.status(404).json({ error: "Deposit not found" });
    }

    const deposit = deposits[0];

    await connection.beginTransaction();
    try {
      if (action === 'confirm') {
        await connection.execute(
          "UPDATE deposits SET status = 'confirmed', transaction_hash = ?, confirmed_at = NOW(), confirmed_by = ? WHERE id = ?",
          [transaction_hash || null, decoded.id, id]
        );

        await connection.execute(
          "UPDATE traders_profiles SET total_confirmed = total_confirmed + ?, account_balance = account_balance + ? WHERE id = ?",
          [deposit.amount, deposit.amount, deposit.trader_id]
        );
      } else {
        // reject
        await connection.execute(
          "UPDATE deposits SET status = 'failed', transaction_hash = ?, confirmed_at = NOW(), confirmed_by = ? WHERE id = ?",
          [transaction_hash || null, decoded.id, id]
        );

        await connection.execute(
          "UPDATE traders_profiles SET total_deposits = total_deposits - ? WHERE id = ?",
          [deposit.amount, deposit.trader_id]
        );
      }

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: `Deposit ${action === 'confirm' ? 'confirmed' : 'rejected'} successfully`
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get deposit details by ID (for admin verification)
app.get("/api/admin/deposits/:id", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;
    const connection = await pool.getConnection();

    const [deposits]: any = await connection.execute(
      "SELECT d.*, dw.network_name, up.display_name, up.email FROM deposits d LEFT JOIN deposit_wallets dw ON d.currency = dw.currency LEFT JOIN user_profiles up ON d.trader_id = up.id WHERE d.id = ?",
      [id]
    );

    connection.release();

    if (!deposits.length) {
      return res.status(404).json({ error: "Deposit not found" });
    }

    res.json(deposits[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Three-Step Deposit Flow Endpoints

// Step 1: Create deposit with amount and currency
app.post("/api/deposits/step1/create", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({ error: "Amount and currency required" });
    }

    const depositId = uuidv4();
    const referenceNumber = `DEP-${Date.now()}-${decoded.id.slice(0, 8)}`;

    const connection = await pool.getConnection();

    try {
      // Get wallet address for this currency
      const [wallets]: any = await connection.execute(
        "SELECT wallet_address, network_name FROM deposit_wallets WHERE currency = ? AND is_active = true LIMIT 1",
        [currency]
      );

      const walletAddress = wallets.length > 0 ? wallets[0].wallet_address : null;
      const networkName = wallets.length > 0 ? wallets[0].network_name : "Unknown";

      await connection.execute(
        "INSERT INTO deposits (id, trader_id, amount, currency, wallet_address, reference_number, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
        [depositId, decoded.id, amount, currency, walletAddress, referenceNumber]
      );

      connection.release();

      res.json({
        depositId,
        referenceNumber,
        amount,
        currency,
        walletAddress,
        networkName,
        status: "pending",
        step: 1,
        nextStep: "qr_code"
      });
    } catch (err) {
      connection.release();
      throw err;
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Step 2: Get QR code data and Binance wallet
app.get("/api/deposits/:depositId/step2/qrcode", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { depositId } = req.params;

    const connection = await pool.getConnection();

    const [deposits]: any = await connection.execute(
      "SELECT d.*, dw.network_name FROM deposits d LEFT JOIN deposit_wallets dw ON d.currency = dw.currency WHERE d.id = ? AND d.trader_id = ?",
      [depositId, decoded.id]
    );

    if (!deposits.length) {
      connection.release();
      return res.status(404).json({ error: "Deposit not found" });
    }

    const deposit = deposits[0];
    connection.release();

    // Generate QR code data (payment string format)
    const paymentString = `${deposit.wallet_address}?amount=${deposit.amount}&currency=${deposit.currency}&ref=${deposit.reference_number}`;

    res.json({
      depositId,
      referenceNumber: deposit.reference_number,
      amount: deposit.amount,
      currency: deposit.currency,
      walletAddress: deposit.wallet_address,
      chainNetwork: deposit.network_name || "BNB Smart Chain",
      qrCodeData: paymentString,
      instructions: `Send exactly ${deposit.amount} ${deposit.currency} to the wallet address above. Your reference number is ${deposit.reference_number}`,
      step: 2,
      nextStep: "verification"
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Step 3: Get deposit verification status
app.get("/api/deposits/:depositId/step3/status", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { depositId } = req.params;

    const connection = await pool.getConnection();

    const [deposits]: any = await connection.execute(
      "SELECT * FROM deposits WHERE id = ? AND trader_id = ?",
      [depositId, decoded.id]
    );

    connection.release();

    if (!deposits.length) {
      return res.status(404).json({ error: "Deposit not found" });
    }

    const deposit = deposits[0];

    res.json({
      depositId,
      referenceNumber: deposit.reference_number,
      amount: deposit.amount,
      currency: deposit.currency,
      status: deposit.status, // 'pending', 'confirmed', 'failed', 'cancelled'
      createdAt: deposit.created_at,
      confirmedAt: deposit.confirmed_at || null,
      step: 3,
      message: deposit.status === "pending"
        ? "⏳ Waiting for admin verification. This usually takes 5-15 minutes."
        : deposit.status === "confirmed"
        ? "✅ Your deposit has been confirmed! Funds have been added to your account."
        : "❌ Your deposit was rejected. Please contact support."
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * BOT TRADING ENDPOINTS
 */

// Middleware to extract trader ID from JWT
const extractTraderIdFromToken = (req: any) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    const decoded: any = jwt.verify(token, JWT_SECRET);
    return decoded.id;
  } catch {
    return null;
  }
};

// Start bot session
app.post("/api/bot/start", async (req, res) => {
  try {
    const traderId = extractTraderIdFromToken(req);
    if (!traderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { pairs, tradeInterval } = req.body;

    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      return res.status(400).json({ error: "Invalid pairs provided" });
    }

    // Get trader's current balance
    const balance = await botTradeService.getTraderBalance(traderId);

    // Create bot session in database
    const sessionId = await botTradeService.startBotSession(traderId, pairs, tradeInterval);

    // Start backend bot instance (runs in background)
    try {
      await botSessionsManager.createBot(sessionId, traderId, pairs, tradeInterval, balance);
    } catch (botError) {
      console.error("Failed to start backend bot:", botError);
      // Still return session ID even if backend bot has issues
    }

    res.json({
      sessionId,
      message: "Bot session started in background",
      pairs,
      tradeInterval,
      balance,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Stop bot session
app.post("/api/bot/stop/:sessionId", async (req, res) => {
  try {
    const traderId = extractTraderIdFromToken(req);
    if (!traderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sessionId } = req.params;

    // Stop backend bot instance
    await botSessionsManager.stopBot(sessionId);

    // Stop session in database
    await botTradeService.endBotSession(sessionId);

    res.json({ message: "Bot session stopped", sessionId });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Record trade execution
app.post("/api/bot/trade/open", async (req, res) => {
  try {
    const traderId = extractTraderIdFromToken(req);
    if (!traderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sessionId, pair, type, entryPrice, stopLoss, takeProfit, quantity } = req.body;

    const tradeId = await botTradeService.recordTrade(traderId, sessionId, {
      pair,
      type,
      entry_price: entryPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      quantity,
    });

    res.json({
      tradeId,
      message: "Trade recorded",
      trade: {
        pair,
        type,
        entryPrice,
        stopLoss,
        takeProfit,
        quantity,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Close trade
app.post("/api/bot/trade/close/:tradeId", async (req, res) => {
  try {
    const traderId = extractTraderIdFromToken(req);
    if (!traderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { tradeId } = req.params;
    const { sessionId, exitPrice, reason } = req.body;

    await botTradeService.closeTrade(tradeId, traderId, sessionId, exitPrice, reason);

    res.json({
      message: "Trade closed successfully",
      tradeId,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get active session
app.get("/api/bot/session/active", async (req, res) => {
  try {
    const traderId = extractTraderIdFromToken(req);
    if (!traderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await botTradeService.getActiveSession(traderId);

    res.json({
      session: session || null,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get open trades
app.get("/api/bot/trades/open/:sessionId", async (req, res) => {
  try {
    const traderId = extractTraderIdFromToken(req);
    if (!traderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sessionId } = req.params;
    const trades = await botTradeService.getOpenTrades(sessionId);

    res.json({
      trades,
      count: trades.length,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Add bot log
app.post("/api/bot/log", async (req, res) => {
  try {
    const traderId = extractTraderIdFromToken(req);
    if (!traderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sessionId, level, message, details } = req.body;

    await botTradeService.addLog(traderId, sessionId, level, message, details);

    res.json({ message: "Log recorded" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get recent logs
app.get("/api/bot/logs/:sessionId", async (req, res) => {
  try {
    const traderId = extractTraderIdFromToken(req);
    if (!traderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;

    const logs = await botTradeService.getRecentLogs(sessionId, limit);

    res.json({
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get trader account balance
app.get("/api/bot/balance", async (req, res) => {
  try {
    const traderId = extractTraderIdFromToken(req);
    if (!traderId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const balance = await botTradeService.getTraderBalance(traderId);

    res.json({
      balance,
      traderId,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`✅ Backend server running on http://localhost:${port}`);
  console.log(`📡 CORS enabled for localhost and 192.168.100.2`);
});
