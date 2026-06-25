import { ObjectId, Prop, RefId, Schema } from '@joktec/mongo';
import { BaseSchema, I18nText, I18nTransform } from '../common';
import { NotificationStatus, NotificationType } from '../constants';
import { User } from './user.schema';

@Schema({
  collection: 'notifications',
  textSearch: 'title.en,title.ko',
  index: ['userIds', 'readById'],
  paranoid: true,
})
export class Notification extends BaseSchema {
  @Prop({ required: true, trim: true, uppercase: true, immutable: true })
  code!: string;

  @Prop({ required: true })
  @I18nTransform()
  title!: I18nText;

  @Prop({ required: true })
  @I18nTransform()
  subhead!: I18nText;

  @Prop({ default: null })
  @I18nTransform()
  description?: I18nText;

  @Prop({ required: true, enum: NotificationType, default: NotificationType.DEFAULT })
  type!: NotificationType;

  @Prop({ type: [String], default: [] })
  topics?: string[];

  @Prop({ type: [ObjectId], ref: () => User, default: [], uniqItems: true })
  userIds?: RefId<User>[];

  @Prop({ kind: 'map', type: Object, default: Object.create(null) })
  payload?: Record<string, any>;

  @Prop({ type: [ObjectId], ref: () => User, default: [], uniqItems: true })
  readById?: RefId<User>[];

  @Prop({ default: null })
  sentAt?: Date;

  @Prop({ required: true, enum: NotificationStatus, default: NotificationStatus.UNPUBLISHED })
  status!: NotificationStatus;

  @Prop({ kind: 'map', type: [Object], default: [], exclude: true })
  results!: Record<string, any>[];
}
