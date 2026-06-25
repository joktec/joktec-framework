import { ObjectId, Prop, RefId, PopulatedRef, Schema } from '@joktec/mongo';
import { BaseSchema, I18nText, I18nTransform } from '../common';
import { TagStatus } from '../constants';
import { User } from './user.schema';

@Schema({
  collection: 'tags',
  textSearch: 'title,hiddenText.en,hiddenText.ko',
  index: ['authorId', 'parentId'],
  paranoid: true,
})
export class Tag extends BaseSchema {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: null })
  @I18nTransform()
  hiddenText?: I18nText;

  @Prop({ required: true, enum: TagStatus })
  status!: TagStatus;

  @Prop({ type: ObjectId, ref: () => User })
  authorId?: RefId<User>;

  @Prop({ type: ObjectId, ref: () => Tag, default: null })
  parentId?: RefId<Tag>;

  // Virtual
  @Prop({ ref: () => User, foreignField: '_id', localField: 'authorId' })
  author?: PopulatedRef<User>;

  @Prop({ ref: () => Tag, foreignField: '_id', localField: 'parentId' })
  parent?: PopulatedRef<Tag>;

  @Prop({ type: () => [Tag], ref: () => Tag, foreignField: 'parentId', localField: '_id' })
  children?: PopulatedRef<Tag>[];
}
