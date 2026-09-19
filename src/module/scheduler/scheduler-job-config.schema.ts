import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'scheduler-job-config',
  timestamps: true,
})
export class SchedulerJobConfigDocument extends Document {
  @Prop({ required: true, unique: true, index: true })
  jobKey: string;

  @Prop({ required: true, index: true })
  jobName: string;

  @Prop({ required: true, default: '' })
  description: string;

  @Prop({ required: true, default: false })
  enabled: boolean;

  @Prop({ required: true, default: '' })
  cron: string;

  @Prop({ required: true, default: 'UTC' })
  timeZone: string;

  @Prop({ type: Date, default: null, index: true })
  deprecatedOn?: Date | null;

  @Prop({ required: true, default: Date.now })
  discoveredOn: Date;

  @Prop({ required: true, default: Date.now, index: true })
  lastSeenOn: Date;

  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
}

export const SchedulerJobConfigSchema = SchemaFactory.createForClass(
  SchedulerJobConfigDocument,
);

SchedulerJobConfigSchema.index({ jobKey: 1 }, { unique: true });
SchedulerJobConfigSchema.index({ jobName: 1 }, { unique: true });
