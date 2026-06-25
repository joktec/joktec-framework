import { ObjectId, Prop, RefId, PopulatedRef, Schema } from '@joktec/mongo';
import { EXAMPLE_MONGO_ID } from '../../app.constant';
import { BaseSchema } from '../common';
import { EmotionStatus, EmotionType } from '../constants';
import { Article } from './article.schema';
import { Comment } from './comment.schema';
import { User } from './user.schema';

@Schema({ collection: 'emotions', index: ['targetId', 'authorId'], paranoid: true })
export class Emotion extends BaseSchema {
  @Prop({ required: true, enum: EmotionType })
  type!: EmotionType;

  @Prop({ required: true, enum: EmotionStatus, default: EmotionStatus.ACTIVATED })
  status!: EmotionStatus;

  @Prop({ required: true, enum: [Article.name, Comment.name, User.name] })
  target!: string;

  @Prop({ type: ObjectId, refPath: 'target', example: EXAMPLE_MONGO_ID })
  targetId?: RefId<Article | Comment>;

  @Prop({})
  deepLink?: string;

  @Prop({ kind: 'map', type: Object, default: () => Object.create(null) })
  payload?: Record<string, any>;

  @Prop({ required: true, default: () => new Date() })
  actionAt!: Date;

  @Prop({ type: ObjectId, ref: () => User, required: true })
  authorId!: RefId<User>;

  // Virtual
  @Prop({ ref: () => User, foreignField: '_id', localField: 'authorId' })
  author?: PopulatedRef<User>;

  @Prop({ ref: () => Article, foreignField: '_id', localField: 'targetId' })
  article?: PopulatedRef<Article>;

  @Prop({ ref: () => Comment, foreignField: '_id', localField: 'targetId' })
  comment?: PopulatedRef<Comment>;

  @Prop({ ref: () => User, foreignField: '_id', localField: 'targetId' })
  user?: PopulatedRef<User>;
}
