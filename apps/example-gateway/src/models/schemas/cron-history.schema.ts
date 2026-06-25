import { CrontabHistoryStatus, CrontabHistoryType, ICrontabHistoryModel } from '@joktec/cron';
import { ObjectId, Prop, RefId, PopulatedRef, Schema } from '@joktec/mongo';
import { BaseSchema } from '../common';
import { CronSchema } from './cron.schema';

@Schema({ collection: 'cron_histories', index: ['cronId'], paranoid: true })
export class CronHistory extends BaseSchema implements ICrontabHistoryModel {
  @Prop({ type: ObjectId, ref: () => CronSchema, required: true, comment: 'Reference ID to the cron job' })
  cronRefId!: RefId<CronSchema>;

  @Prop({
    required: true,
    enum: CrontabHistoryType,
    default: CrontabHistoryType.AUTOMATIC,
    comment: 'Type of cron history record',
  })
  type!: CrontabHistoryType;

  @Prop({ kind: 'map', type: Object, default: null, comment: 'Snapshot data at the time of execution' })
  snapshot?: Record<string, any>;

  @Prop({ required: true, comment: 'Execution start time' })
  executedAt!: Date;

  @Prop({ default: () => new Date(), comment: 'Execution end time' })
  finishedAt?: Date;

  @Prop({ default: null, comment: 'Duration of execution' })
  duration?: string;

  @Prop({
    required: true,
    enum: CrontabHistoryStatus,
    default: CrontabHistoryStatus.COMPLETED,
    comment: 'Status of the cron execution',
  })
  status!: CrontabHistoryStatus;

  @Prop({ kind: 'map', type: Object, default: null, comment: 'Result data of the cron execution' })
  res?: Record<string, any>;

  @Prop({ kind: 'map', type: Object, default: null, comment: 'Error details if the cron execution failed' })
  error?: Record<string, any>;

  // Virtual
  @Prop({
    ref: () => CronSchema,
    foreignField: '_id',
    localField: 'cronRefId',
    comment: 'Reference to the related cron job',
  })
  cron?: PopulatedRef<CronSchema>;

  get id(): string {
    return this._id?.toString();
  }

  set id(value: string) {
    this._id = value;
  }

  get cronId(): string {
    return this.cronRefId?.toString();
  }

  set cronId(value: string) {
    this.cronRefId = new ObjectId(value).toString();
  }
}
