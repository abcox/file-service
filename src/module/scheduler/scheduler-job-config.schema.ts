import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'scheduler-job-config',
  timestamps: true,
})
export class SchedulerJobConfigDocument extends Document {
  @Prop({ required: true, unique: true, index: true })
  jobName: string;

  @Prop({ required: true, default: false })
  enabled: boolean;

  @Prop({ required: true, default: '' })
  cron: string;

  @Prop({ required: true, default: 'UTC' })
  timeZone: string;

  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
}

export const SchedulerJobConfigSchema = SchemaFactory.createForClass(
  SchedulerJobConfigDocument,
);

SchedulerJobConfigSchema.index({ jobName: 1 }, { unique: true });
