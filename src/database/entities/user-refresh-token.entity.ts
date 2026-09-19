import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_refresh_tokens')
export class UserRefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ unique: true })
  jti: string;

  @Column()
  tokenHash: string;

  @Column({ type: 'datetime2' })
  expiresAt: Date;

  @Column({ type: 'datetime2', nullable: true })
  revokedAt?: Date;

  @Column({ nullable: true })
  replacedByJti?: string;

  @Column({ type: 'datetime2', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}
