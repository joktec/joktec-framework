import { ObjectId, Prop, RefId, PopulatedRef, Schema } from '@joktec/mongo';
import { EXAMPLE_MONGO_ID } from '../../app.constant';
import { BaseSchema } from '../common';
import { BlockStatus } from '../constants';
import { Article } from './article.schema';
import { Setting } from './setting.schema';
import { User } from './user.schema';

@Schema({ collection: 'blocks', index: ['targetId'], paranoid: true })
export class Block extends BaseSchema {
  @Prop({ required: true, enum: [Article.name, User.name] })
  target!: string;

  @Prop({ type: ObjectId, refPath: 'target', required: true, example: EXAMPLE_MONGO_ID })
  targetId!: RefId<Article | User>;

  @Prop({ type: [ObjectId], ref: () => Setting, required: true, uniqItems: true, default: [] })
  reasonIds!: RefId<Setting>[];

  @Prop({ default: null })
  reasonText?: string;

  @Prop({ default: () => new Date() })
  sentAt?: Date;

  @Prop({ required: true, enum: BlockStatus, default: BlockStatus.ACTIVATED })
  status!: BlockStatus;

  @Prop({ type: ObjectId, ref: () => User, required: true })
  authorId!: RefId<User>;

  // Virtual
  @Prop({ ref: () => Article, foreignField: '_id', localField: 'targetId' })
  article?: PopulatedRef<Article>;

  @Prop({ ref: () => User, foreignField: '_id', localField: 'targetId' })
  user?: PopulatedRef<User>;

  @Prop({ ref: () => User, foreignField: '_id', localField: 'authorId' })
  author?: PopulatedRef<User>;

  @Prop({ type: () => [Setting], ref: () => Setting, foreignField: '_id', localField: 'reasonIds' })
  reasons?: PopulatedRef<Setting>[];
}
