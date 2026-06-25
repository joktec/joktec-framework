import { Prop, Schema } from '@joktec/mongo';
import { BaseSubSchema } from '../common';
import { ArticleType } from '../constants';

@Schema({ kind: 'subdocument' })
export class UserKeyword extends BaseSubSchema {
  @Prop({ required: true, trim: true })
  value!: string;

  @Prop({ required: true, enum: ArticleType, default: ArticleType.DEFAULT })
  type!: ArticleType;

  @Prop({ required: true, default: false })
  hidden!: boolean;

  @Prop({ required: true, default: 1 })
  count!: number;

  @Prop({ type: Date, required: true, default: () => new Date() })
  lastSearchAt!: Date;
}
