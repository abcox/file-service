import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FileEntity } from './file.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  //#region User identification
  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name?: string;
  //#endregion

  //#region Authentication & security
  @Column()
  passwordHash: string; // Required for password-based auth

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isAdmin: boolean;

  @Column('simple-array', { default: 'user' })
  roles: string[]; // ['guest', 'payor', 'admin', 'moderator', 'auditor', 'developer', 'supervisor', 'user  ']

  @Column({ nullable: true })
  lastLoginAt?: Date;

  // proposed: lastLoginDetail (ie. ip address, location, device, etc.)

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ nullable: true })
  passwordResetExpires?: Date;

  @Column({ nullable: true })
  passwordFailedAttempts?: number;

  // proposed: 2 days lockout
  // proposed: indefinite lockout value: 9999-12-31
  // proposed: lockout reason: user, system, admin
  @Column({ nullable: true })
  accountLockedUntil?: Date;
  //#endregion

  //#region Azure integration
  @Column({ nullable: true })
  azureObjectId?: string; // Azure AD Object ID

  @Column({ nullable: true })
  azureTenantId?: string; // Azure AD Tenant ID

  @Column({ nullable: true })
  azurePrincipalName?: string; // Azure AD Principal Name
  //#endregion

  //#region Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  //#endregion

  //#region Relationships
  @OneToMany(() => FileEntity, (file) => file.uploadedByUser)
  files: FileEntity[];
  //#endregion
}
