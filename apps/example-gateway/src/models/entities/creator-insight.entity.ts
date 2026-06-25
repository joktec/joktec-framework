import { Column, PrimaryColumn, Tables } from '@joktec/mysql';
import { IsBoolean, IsInt, IsString } from '@joktec/utils';
import { BaseEntity } from '../common';

export class CreatorInsightPreference {
  @IsString()
  theme!: string;

  @IsBoolean()
  publicProfile!: boolean;
}

export class CreatorInsightMetric {
  @IsString()
  key!: string;

  @IsInt()
  value!: number;
}

@Tables<CreatorInsight>({ name: 'creator_insights', unique: ['userId'], index: ['score', 'active'] })
export class CreatorInsight extends BaseEntity {
  @PrimaryColumn('uuidv7', { name: 'id' })
  id?: string;

  @Column('varchar', { length: 36, nullable: false, isUUID: true })
  userId!: string;

  @Column('varchar', { length: 64, nullable: true })
  sourceProfileRef?: string;

  @Column('json', { nullable: true })
  rawSnapshot?: Record<string, any> | object;

  @Column('json', { nullable: true })
  preference?: CreatorInsightPreference;

  @Column('json', {
    nested: CreatorInsightMetric,
    nullable: true,
  })
  metrics?: CreatorInsightMetric[];

  @Column({ type: 'int', default: 0 })
  score?: number;

  @Column({ type: 'boolean', default: true })
  active?: boolean;

  @Column({
    kind: 'virtual',
    mode: 'getter',
    optional: true,
    comment: 'Total value across creator insight metrics',
    example: 120,
  })
  get totalMetricValue(): number {
    return (this.metrics || []).reduce((total, metric) => total + metric.value, 0);
  }
}
