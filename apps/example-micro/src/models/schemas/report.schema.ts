import { ObjectId, Prop, RefId, PopulatedRef, Schema } from '@joktec/mongo';
import { EXAMPLE_MONGO_ID } from '../../app.constant';
import { BaseSchema } from '../common';
import { ReportStatus } from '../constants';
import { Article } from './article.schema';
import { Comment } from './comment.schema';
import { Setting } from './setting.schema';
import { User } from './user.schema';

@Schema({ collection: 'reports', index: ['targetId', 'reasonIds', 'authorId'], paranoid: true })
export class Report extends BaseSchema {
  @Prop({ required: true, enum: [Article.name, Comment.name, User.name] })
  target!: string;

  @Prop({ type: ObjectId, refPath: 'target', example: EXAMPLE_MONGO_ID })
  targetId?: RefId<Article | Comment | User>;

  @Prop({ type: [ObjectId], ref: () => Setting, required: true, minSize: 1 })
  reasonIds!: RefId<Setting>[];

  @Prop({ default: null })
  reasonText?: string;

  @Prop({ default: null })
  sentAt?: Date;

  @Prop({ default: null })
  feedback?: string;

  @Prop({ default: null })
  respondedAt?: Date;

  @Prop({ required: true, enum: ReportStatus, default: ReportStatus.RECEIVED })
  status!: ReportStatus;

  @Prop({ type: ObjectId, ref: () => User, required: true })
  authorId!: RefId<User>;

  // Virtual
  @Prop({ ref: () => User, foreignField: '_id', localField: 'authorId' })
  author?: PopulatedRef<User>;

  @Prop({ type: () => [Setting], ref: () => Setting, foreignField: '_id', localField: 'reasonIds' })
  reason?: PopulatedRef<Setting>[];

  @Prop({ ref: () => Article, foreignField: '_id', localField: 'targetId' })
  article?: PopulatedRef<Article>;

  @Prop({ ref: () => Comment, foreignField: '_id', localField: 'targetId' })
  comment?: PopulatedRef<Comment>;

  @Prop({ ref: () => User, foreignField: '_id', localField: 'targetId' })
  user?: PopulatedRef<User>;
}
