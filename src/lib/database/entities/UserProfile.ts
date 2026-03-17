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

export type KYCStatus = "not_started" | "pending" | "verified" | "rejected";

@Entity("user_profiles")
@Index(["kyc_status"])
export class UserProfile {
  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Column("varchar", { length: 255, nullable: true })
  display_name: string | null;

  @Column("varchar", { length: 100, nullable: true })
  first_name: string | null;

  @Column("varchar", { length: 100, nullable: true })
  last_name: string | null;

  @Column("varchar", { length: 20, nullable: true })
  phone_number: string | null;

  @Column("varchar", { length: 2, nullable: true })
  country: string | null;

  @Column("varchar", { length: 500, nullable: true })
  avatar_url: string | null;

  @Column("enum", {
    enum: ["not_started", "pending", "verified", "rejected"],
    default: "not_started",
  })
  kyc_status: KYCStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: "id", referencedColumnName: "id" })
  user: User;
}
