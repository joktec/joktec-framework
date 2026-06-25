import { TimestampColumn } from '../decorators/timestamp.decorator';

export interface IMysqlModel {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

/**
 * Base relational entity fields shared by repositories and pagination contracts.
 */
export class MysqlModel implements IMysqlModel {
  @TimestampColumn('create')
  createdAt?: Date;

  @TimestampColumn('update')
  updatedAt?: Date;

  @TimestampColumn('delete')
  deletedAt?: Date;
}
