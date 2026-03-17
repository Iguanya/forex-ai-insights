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
import { UserProfile } from "./UserProfile";
import { TraderProfile } from "./TraderProfile";
import { Deposit } from "./Deposit";
import { AdminPermission } from "./AdminPermission";
import { AuditLog } from "./AuditLog";

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
