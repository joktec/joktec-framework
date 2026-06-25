import { Column, PrimaryColumn, Tables } from '@joktec/mysql';
import { BaseEntity } from '../common';
import { CreatorInsight } from './creator-insight.entity';

@Tables<CreatorMilestone>({
  name: 'creator_milestones',
  unique: ['insightId', 'code', 'deletedAt'],
  customIndexes: [
    { name: 'IDX_creator_milestone_status_due', fields: ['status', 'dueAt'] },
    { name: 'IDX_creator_milestone_completed', fields: ['completedAt'] },
  ],
  checks: [
    { name: 'CHK_creator_milestone_target_count', expression: 'target_count >= 0' },
    { name: 'CHK_creator_milestone_progress_count', expression: 'progress_count >= 0' },
  ],
})
export class CreatorMilestone extends BaseEntity {
  @PrimaryColumn('uuidv7', { name: 'id' })
  id?: string;

  @Column('varchar', { name: 'insight_id', length: 36, nullable: false, isUUID: true })
  insightId!: string;

  @Column({
    kind: 'relation',
    relation: 'many-to-one',
    type: () => CreatorInsight,
    relationOptions: { nullable: false, onDelete: 'CASCADE' },
    joinColumn: { name: 'insight_id', referencedColumnName: 'id' },
    comment: 'Creator insight that owns this milestone',
  })
  insight?: CreatorInsight;

  @Column({
    kind: 'relation-id',
    relationId: (milestone: CreatorMilestone) => milestone.insight,
    optional: true,
    immutable: true,
  })
  resolvedInsightId?: string;

  @Column('varchar', { length: 80, nullable: false })
  code!: string;

  @Column('varchar', { length: 160, nullable: false })
  title!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('int', { name: 'target_count', default: 0 })
  targetCount?: number;

  @Column('int', { name: 'progress_count', default: 0 })
  progressCount?: number;

  @Column('varchar', { length: 24, default: 'draft' })
  status?: 'draft' | 'active' | 'completed' | 'archived';

  @Column('datetime', { name: 'due_at', nullable: true })
  dueAt?: Date;

  @Column('datetime', { name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ kind: 'version', default: 1, immutable: true })
  version?: number;

  @Column({ kind: 'virtual', optional: true, comment: 'Whether the milestone is completed', example: false })
  get completed(): boolean {
    return this.status === 'completed' || !!this.completedAt;
  }
}
