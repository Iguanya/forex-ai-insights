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
} from "../entities/index.js";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.MYSQL_HOST || "144.172.93.6",
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  username: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "trading",
  entities: [User, UserProfile, TraderProfile, Deposit, AdminPermission, BinanceAccount, AuditLog],
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
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
