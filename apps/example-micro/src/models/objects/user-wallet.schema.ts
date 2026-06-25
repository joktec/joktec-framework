import { Prop, Schema } from '@joktec/mongo';
import { sum } from 'lodash';

@Schema({ kind: 'embedded' })
export class UserWallet {
  @Prop({ required: true, default: 0 })
  charge!: number;

  @Prop({ required: true, default: 0 })
  revenue!: number;

  @Prop({ required: true, default: 0 })
  bonus!: number;

  @Prop({ required: true, default: 0 })
  event!: number;

  @Prop({
    kind: 'virtual',
    mode: 'getter',
    optional: true,
    expose: { toPlainOnly: true },
    comment: 'Available wallet balance',
    example: 9999,
  })
  public get balance(): number {
    return sum([this.charge, this.revenue, this.bonus, this.event]);
  }
}
