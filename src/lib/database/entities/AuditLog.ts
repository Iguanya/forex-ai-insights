import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";

@Entity("audit_logs")
@Index(["user_id"])
@Index(["action"])
@Index(["resource_type"])
@Index(["created_at"])
export class AuditLog {
  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Column("varchar", { length: 36 })
  user_id: string;

  @Column("varchar", { length: 100 })
  action: string;

  @Column("varchar", { length: 50, nullable: true })
  resource_type: string | null;

  @Column("varchar", { length: 36, nullable: true })
  resource_id: string | null;

  @Column("simple-json", { nullable: true })
  details: any;

  @Column("varchar", { length: 45, nullable: true })
  ip_address: string | null;

  @Column("varchar", { length: 500, nullable: true })
  user_agent: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.auditLogs)
  @JoinColumn({ name: "user_id", referencedColumnName: "id" })
  user: User;
}
