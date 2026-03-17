import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "./User";

@Entity("admin_permissions")
@Index(["permission"])
@Unique(["admin_id", "permission"])
export class AdminPermission {
  @PrimaryColumn("varchar", { length: 36 })
  id: string;

  @Column("varchar", { length: 36 })
  admin_id: string;

  @Column("varchar", { length: 100 })
  permission: string;

  @CreateDateColumn()
  granted_at: Date;

  @ManyToOne(() => User, (user) => user.permissions)
  @JoinColumn({ name: "admin_id", referencedColumnName: "id" })
  admin: User;
}
