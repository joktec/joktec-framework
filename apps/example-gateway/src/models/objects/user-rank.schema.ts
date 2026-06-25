import { Prop, Schema } from '@joktec/mongo';

@Schema({ kind: 'embedded' })
export class UserRank {
  @Prop({ required: true, default: 0 })
  score!: number;

  @Prop({ required: true, default: 0 })
  arrangeTop!: number;

  @Prop({ required: true, default: 0 })
  arrangeRank!: number;
}
