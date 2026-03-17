import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";

export type AccountStatus = "active" | "suspended" | "closed";
export type VerificationStatus = "pending" | "verified" | "rejected";

@Entity("traders_profiles")
@Index(["account_status"])
@Index(["verification_status"])
export class TraderProfile {
  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Column("decimal", { precision: 15, scale: 2, default: 0 })
  account_balance: number;

  @Column("decimal", { precision: 15, scale: 2, default: 0 })
  total_deposits: number;

  @Column("decimal", { precision: 15, scale: 2, default: 0 })
  total_confirmed: number;

  @Column("enum", {
    enum: ["active", "suspended", "closed"],
    default: "active",
  })
  account_status: AccountStatus;

  @Column("enum", {
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  })
  verification_status: VerificationStatus;

  @Column("timestamp", { nullable: true })
  verified_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => User, (user) => user.traderProfile)
  @JoinColumn({ name: "id", referencedColumnName: "id" })
  user: User;
}
