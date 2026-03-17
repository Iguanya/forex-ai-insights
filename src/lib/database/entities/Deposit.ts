import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";

export type DepositCurrency = "USDT" | "USDC" | "BNB" | "ETH";
export type DepositStatus = "pending" | "confirmed" | "failed" | "cancelled";

@Entity("deposits")
@Index(["trader_id"])
@Index(["status"])
@Index(["submitted_at"])
@Index(["confirmed_at"])
export class Deposit {
  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Column("varchar", { length: 36 })
  trader_id: string;

  @Column("decimal", { precision: 15, scale: 2 })
  amount: number;

  @Column("enum", {
    enum: ["USDT", "USDC", "BNB", "ETH"],
    default: "USDT",
  })
  currency: DepositCurrency;

  @Column("varchar", { length: 50, unique: true })
  reference_number: string;

  @Column("varchar", { length: 255, nullable: true })
  transaction_hash: string | null;

  @Column("varchar", { length: 500, nullable: true })
  proof_file_url: string | null;

  @Column("enum", {
    enum: ["pending", "confirmed", "failed", "cancelled"],
    default: "pending",
  })
  status: DepositStatus;

  @Column("text", { nullable: true })
  notes: string | null;

  @CreateDateColumn()
  submitted_at: Date;

  @Column("timestamp", { nullable: true })
  confirmed_at: Date | null;

  @Column("varchar", { length: 36, nullable: true })
  confirmed_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.deposits)
  @JoinColumn({ name: "trader_id", referencedColumnName: "id" })
  trader: User;
}
