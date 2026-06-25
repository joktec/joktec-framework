import { ObjectId, Prop, RefId, PopulatedRef, Schema } from '@joktec/mongo';
import { BaseSchema } from '../common';
import { CommentStatus } from '../constants';
import { Article } from './article.schema';
import { User } from './user.schema';

@Schema({ collection: 'comments', textSearch: 'content', index: ['articleId', 'authorId', 'parentId'], paranoid: true })
export class Comment extends BaseSchema {
  @Prop({ required: true, trim: true })
  content!: string;

  @Prop({ default: 0, unsigned: true })
  seq?: number;

  @Prop({ default: 1, unsigned: true })
  depth?: number;

  @Prop({ required: true, enum: CommentStatus, default: CommentStatus.ACTIVATED })
  status!: CommentStatus;

  @Prop({ type: ObjectId, ref: () => Article, required: true })
  articleId!: RefId<Article>;

  @Prop({ type: ObjectId, ref: () => User, required: true })
  authorId!: RefId<User>;

  @Prop({ type: ObjectId, ref: () => Comment, default: null })
  parentId?: RefId<Comment>;

  // Virtual
  @Prop({ ref: () => Article, foreignField: '_id', localField: 'articleId' })
  article?: PopulatedRef<Article>;

  @Prop({ ref: () => User, foreignField: '_id', localField: 'authorId' })
  author?: PopulatedRef<User>;

  @Prop({ ref: () => Comment, foreignField: '_id', localField: 'parentId' })
  parent?: PopulatedRef<Comment>;

  @Prop({
    type: () => [Comment],
    ref: () => Comment,
    foreignField: 'parentId',
    localField: '_id',
    options: { sort: { seq: 1, createdAt: 1 } },
  })
  children?: PopulatedRef<Comment>[];
}
