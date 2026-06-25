import { Prop, Schema } from '@joktec/mongo';

@Schema({ kind: 'embedded' })
export class DataLogRequest {
  @Prop({ required: true, example: '00000000-0000-0000-0000-000000000000' })
  id!: string;

  @Prop({ required: true, example: 'GET' })
  method!: string;

  @Prop({ required: true, example: '/users' })
  url!: string;

  @Prop({ kind: 'map', type: Object })
  query?: Record<string, any>;

  @Prop({ kind: 'map', type: Object })
  params?: Record<string, any>;

  @Prop({ kind: 'map', type: Object })
  body?: Record<string, any>;

  @Prop({ kind: 'map', type: Object })
  headers?: Record<string, any>;

  @Prop({ required: true, example: '::ffff:10.0.75.217' })
  remoteAddress!: string;

  @Prop({ required: true, example: 41190 })
  remotePort!: number;
}
