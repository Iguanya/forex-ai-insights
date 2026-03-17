import "reflect-metadata";
import { DataSource } from "typeorm";
import {
  User,
  UserProfile,
  TraderProfile,
  Deposit,
  AdminPermission,
  BinanceAccount,
  AuditLog,
} from "./entities";

const env = import.meta.env;

export const AppDataSource = new DataSource({
  type: "mysql",
  host: env.VITE_DB_HOST || "144.172.93.6",
  port: parseInt(env.VITE_DB_PORT || "3306"),
  username: env.VITE_DB_USER || "root",
  password: env.VITE_DB_PASSWORD || "",
  database: env.VITE_DB_NAME || "trading",
  entities: [User, UserProfile, TraderProfile, Deposit, AdminPermission, BinanceAccount, AuditLog],
  synchronize: false, // Never auto-sync schema in production
  logging: env.MODE === "development",
  ssl: {
    rejectUnauthorized: false,
  },
});

let isInitialized = false;

export async function initializeDatabase() {
  if (isInitialized) return AppDataSource;

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("✅ Database connection established");
    }
    isInitialized = true;
    return AppDataSource;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}

export async function getDatabase() {
  if (!AppDataSource.isInitialized) {
    await initializeDatabase();
  }
  return AppDataSource;
}
