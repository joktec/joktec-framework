import { Prop, Schema } from '@joktec/mongo';

@Schema({ kind: 'embedded' })
export class SessionDevice {
  @Prop({})
  deviceId?: string;

  @Prop({})
  deviceModel?: string;

  @Prop({})
  deviceOs?: string;

  @Prop({})
  osVersion?: string;
}
