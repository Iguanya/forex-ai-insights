import express from "express";
import cors from "cors";
import { createPool } from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-min-32-characters";

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:8081", "http://192.168.100.2:5173", "http://192.168.100.2:8081"],
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

    await connection.execute(
      "INSERT INTO deposits (id, trader_id, amount, currency, reference_number, status, notes) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
      [depositId, decoded.id, amount, currency, referenceNumber, notes || null]
    );

    // Update trader total_deposits
    await connection.execute(
      "UPDATE traders_profiles SET total_deposits = total_deposits + ? WHERE id = ?",
      [amount, decoded.id]
    );

    connection.release();

    res.json({ id: depositId, reference_number: referenceNumber, status: "pending" });
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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`✅ Backend server running on http://localhost:${port}`);
  console.log(`📡 CORS enabled for localhost and 192.168.100.2`);
});
