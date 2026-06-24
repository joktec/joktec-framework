import { Column, PrimaryColumn, Tables } from '@joktec/mysql';
import { BaseEntity } from '../common';

@Tables<ProfileBadge>({
  name: 'profile_badges',
  unique: ['code'],
  index: ['active', 'sortOrder'],
})
export class ProfileBadge extends BaseEntity {
  @PrimaryColumn('uuidv7', { name: 'id' })
  id?: string;

  @Column({ length: 80, nullable: false })
  code!: string;

  @Column({ length: 120, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 80, nullable: true })
  icon?: string;

  @Column({ length: 24, nullable: true })
  color?: string;

  @Column({ type: 'int', default: 0 })
  minFollowers?: number;

  @Column({ type: 'int', default: 0 })
  minPosts?: number;

  @Column({ type: 'int', default: 0 })
  sortOrder?: number;

  @Column({ type: 'boolean', default: true })
  active?: boolean;
}
