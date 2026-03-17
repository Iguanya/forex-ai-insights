import { getDatabase } from "./index";
import { User, UserProfile, TraderProfile, Deposit, AdminPermission } from "./entities";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || "your-secret-key-min-32-characters";
const JWT_EXPIRY = "7d";

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: "admin" | "trader" | "support";
}

class DatabaseService {
  // ====== AUTH METHODS ======

  async signup(email: string, password: string, role: "trader" | "admin" = "trader") {
    const db = await getDatabase();
    const userRepository = db.getRepository(User);
    const profileRepository = db.getRepository(UserProfile);
    const traderRepository = db.getRepository(TraderProfile);

    // Check if user exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password
    const password_hash = await bcryptjs.hash(password, 10);
    const userId = uuidv4();

    const user = userRepository.create({
      id: userId,
      email,
      password_hash,
      role,
      status: "active",
    });

    await userRepository.save(user);

    // Create user profile
    const profile = profileRepository.create({
      id: userId,
      display_name: email.split("@")[0],
      kyc_status: "not_started",
    });
    await profileRepository.save(profile);

    // If trader, create trader profile
    if (role === "trader") {
      const traderProfile = traderRepository.create({
        id: userId,
        account_balance: 0,
        total_deposits: 0,
        total_confirmed: 0,
        account_status: "active",
        verification_status: "pending",
      });
      await traderRepository.save(traderProfile);
    }

    return this.createAuthToken(userId, email, role);
  }

  async login(email: string, password: string) {
    const db = await getDatabase();
    const userRepository = db.getRepository(User);

    const user = await userRepository.findOne({
      where: { email },
      relations: ["profile"],
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    user.last_login = new Date();
    await userRepository.save(user);

    return this.createAuthToken(user.id, user.email, user.role);
  }

  async verifyToken(token: string): Promise<AuthTokenPayload> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
      return decoded;
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  private createAuthToken(id: string, email: string, role: "admin" | "trader" | "support") {
    const payload: AuthTokenPayload = { id, email, role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    return { token, user: payload };
  }

  // ====== USER PROFILE METHODS ======

  async getUserProfile(userId: string) {
    const db = await getDatabase();
    const userRepository = db.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ["profile"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      display_name: user.profile?.display_name,
      first_name: user.profile?.first_name,
      last_name: user.profile?.last_name,
      kyc_status: user.profile?.kyc_status,
      avatar_url: user.profile?.avatar_url,
    };
  }

  async getTraderProfile(userId: string) {
    const db = await getDatabase();
    const userRepository = db.getRepository(User);
    const traderRepository = db.getRepository(TraderProfile);

    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ["profile"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    const trader = await traderRepository.findOne({
      where: { id: userId },
    });

    if (!trader) {
      throw new Error("Trader profile not found");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      display_name: user.profile?.display_name,
      account_balance: trader.account_balance,
      total_deposits: trader.total_deposits,
      total_confirmed: trader.total_confirmed,
      account_status: trader.account_status,
      verification_status: trader.verification_status,
    };
  }

  // ====== DEPOSIT METHODS ======

  async submitDeposit(
    traderId: string,
    amount: number,
    currency: "USDT" | "USDC" | "BNB" | "ETH",
    notes?: string
  ) {
    const db = await getDatabase();
    const depositRepository = db.getRepository(Deposit);
    const traderRepository = db.getRepository(TraderProfile);

    // Generate reference number
    const referenceNumber = `DEP-${Date.now()}-${traderId.slice(0, 8)}`;

    const deposit = depositRepository.create({
      id: uuidv4(),
      trader_id: traderId,
      amount,
      currency,
      reference_number: referenceNumber,
      status: "pending",
      notes: notes || null,
    });

    await depositRepository.save(deposit);

    // Update trader's total_deposits
    const trader = await traderRepository.findOne({ where: { id: traderId } });
    if (trader) {
      trader.total_deposits = Number(trader.total_deposits) + amount;
      await traderRepository.save(trader);
    }

    return deposit;
  }

  async getTraderDeposits(traderId: string) {
    const db = await getDatabase();
    const depositRepository = db.getRepository(Deposit);

    return depositRepository.find({
      where: { trader_id: traderId },
      order: { submitted_at: "DESC" },
    });
  }

  async getAllDeposits() {
    const db = await getDatabase();
    const depositRepository = db.getRepository(Deposit);

    return depositRepository.find({
      relations: ["trader", "trader.profile"],
      order: { submitted_at: "DESC" },
    });
  }

  async confirmDeposit(depositId: string, adminId: string) {
    const db = await getDatabase();
    const depositRepository = db.getRepository(Deposit);
    const traderRepository = db.getRepository(TraderProfile);

    const deposit = await depositRepository.findOne({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new Error("Deposit not found");
    }

    deposit.status = "confirmed";
    deposit.confirmed_at = new Date();
    deposit.confirmed_by = adminId;
    await depositRepository.save(deposit);

    // Update trader's total_confirmed
    const trader = await traderRepository.findOne({
      where: { id: deposit.trader_id },
    });
    if (trader) {
      trader.total_confirmed = Number(trader.total_confirmed) + deposit.amount;
      trader.account_balance = Number(trader.account_balance) + deposit.amount;
      await traderRepository.save(trader);
    }

    return deposit;
  }

  async rejectDeposit(depositId: string, notes?: string) {
    const db = await getDatabase();
    const depositRepository = db.getRepository(Deposit);
    const traderRepository = db.getRepository(TraderProfile);

    const deposit = await depositRepository.findOne({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new Error("Deposit not found");
    }

    deposit.status = "failed";
    deposit.notes = notes || deposit.notes;
    await depositRepository.save(deposit);

    // Revert from total_deposits
    const trader = await traderRepository.findOne({
      where: { id: deposit.trader_id },
    });
    if (trader) {
      trader.total_deposits = Math.max(0, Number(trader.total_deposits) - deposit.amount);
      await traderRepository.save(trader);
    }

    return deposit;
  }

  // ====== PERMISSION METHODS ======

  async checkAdminPermission(adminId: string, permission: string): Promise<boolean> {
    const db = await getDatabase();
    const permRepository = db.getRepository(AdminPermission);

    const perm = await permRepository.findOne({
      where: { admin_id: adminId, permission },
    });

    return !!perm;
  }
}

export const dbService = new DatabaseService();
