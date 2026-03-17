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

export type Currency = "USDT" | "USDC" | "BNB" | "ETH";

@Entity("binance_accounts")
@Index(["admin_id"])
@Index(["is_active"])
export class BinanceAccount {
  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Column("varchar", { length: 36 })
  admin_id: string;

  @Column("varchar", { length: 255 })
  wallet_address: string;

  @Column("enum", {
    enum: ["USDT", "USDC", "BNB", "ETH"],
    default: "USDT",
  })
  currency: Currency;

  @Column("boolean", { default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "admin_id", referencedColumnName: "id" })
  admin: User;
}
