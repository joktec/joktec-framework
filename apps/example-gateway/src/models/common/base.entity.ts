import { Column, MysqlModel } from '@joktec/mysql';

export class BaseEntity extends MysqlModel {
  @Column({ type: 'varchar', length: 36, nullable: true, update: false, default: null, swagger: { readOnly: true } })
  createdBy?: string;

  @Column({ type: 'varchar', length: 36, nullable: true, update: true, default: null, swagger: { readOnly: true } })
  updatedBy?: string;
}
