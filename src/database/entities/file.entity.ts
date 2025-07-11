import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  //#region File metadata
  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column('bigint')
  size: number;

  @Column()
  uploadedBy: string; // Keep for backward compatibility

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedByUser?: UserEntity;

  @Column({ nullable: true })
  uploadedByUserId?: string;

  @CreateDateColumn()
  uploadedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  description?: string;
  //#endregion

  //#region Azure Blob Storage specific fields
  @Column({ nullable: true })
  tags?: string;

  @Column({ default: true })
  isActive: boolean;

  //#region Azure Blob Storage specific fields
  @Column()
  blobName: string;

  @Column()
  containerName: string; // Azure Storage container name

  @Column({ nullable: true })
  blobUrl?: string; // Full URL to blob (for direct access if needed)

  @Column({ nullable: true })
  etag?: string; // Azure blob ETag for concurrency control

  @Column({ nullable: true })
  lastModified?: Date; // When blob was last modified in Azure

  @Column({ default: false })
  isPublic: boolean; // Whether blob has public read access

  @Column({ nullable: true })
  contentType?: string; // MIME type from Azure blob metadata
  //#endregion
}
