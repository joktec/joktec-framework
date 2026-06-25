import { Column, MysqlModel } from '@joktec/mysql';

export class BaseEntity extends MysqlModel {
  @Column({ type: 'varchar', length: 36, nullable: true, update: false, default: null, immutable: true })
  createdBy?: string;

  @Column({ type: 'varchar', length: 36, nullable: true, update: true, default: null, immutable: true })
  updatedBy?: string;
}
