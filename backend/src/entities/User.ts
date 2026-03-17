import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { UserProfile } from "./UserProfile.js";
import { TraderProfile } from "./TraderProfile.js";
import { Deposit } from "./Deposit.js";
import { AdminPermission } from "./AdminPermission.js";
import { AuditLog } from "./AuditLog.js";

export type UserRole = "admin" | "trader" | "support";
export type UserStatus = "active" | "inactive" | "suspended";

@Entity("users")
@Index(["email"])
@Index(["role"])
@Index(["status"])
export class User {
  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Column("varchar", { length: 255, unique: true })
  email: string;

  @Column("varchar", { length: 255 })
  password_hash: string;

  @Column("enum", { enum: ["admin", "trader", "support"], default: "trader" })
  role: UserRole;

  @Column("enum", {
    enum: ["active", "inactive", "suspended"],
    default: "active",
  })
  status: UserStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column("timestamp", { nullable: true })
  last_login: Date | null;

  @OneToOne(() => UserProfile, (profile) => profile.user, {
    cascade: true,
    eager: true,
  })
  profile: UserProfile;

  @OneToOne(() => TraderProfile, (trader) => trader.user, {
    cascade: true,
    nullable: true,
  })
  traderProfile?: TraderProfile;

  @OneToMany(() => Deposit, (deposit) => deposit.trader)
  deposits?: Deposit[];

  @OneToMany(() => AdminPermission, (perm) => perm.admin)
  permissions?: AdminPermission[];

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs?: AuditLog[];
}
