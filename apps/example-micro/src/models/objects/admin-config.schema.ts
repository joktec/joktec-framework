import { Prop, Schema } from '@joktec/mongo';
import { IsTimeZone } from '@joktec/utils';
import { DEFAULT_LOCALE, LOCALE } from '../../app.constant';

@Schema({ kind: 'embedded' })
export class AdminConfig {
  @Prop({ required: true, enum: LOCALE, default: DEFAULT_LOCALE })
  language!: LOCALE;

  @Prop({ default: 'Asia/Seoul' })
  @IsTimeZone()
  timezone?: string;
}
