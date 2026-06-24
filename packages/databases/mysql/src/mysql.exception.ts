import { BaseMethodDecorator, CallbackMethodOptions, InternalServerException } from '@joktec/core';
import { QueryFailedError } from 'typeorm';

export class MysqlException extends InternalServerException {
  constructor(msg: string = 'MYSQL_EXCEPTION', error?: any) {
    super(msg, error);
  }
}

/**
 * Converts TypeORM driver errors into stable framework-level MySQL error codes.
 */
export const MysqlCatch = BaseMethodDecorator(async (options: CallbackMethodOptions): Promise<any> => {
  const { method, args } = options;
  try {
    return await method(...args);
  } catch (err) {
    if (err instanceof QueryFailedError) {
      throw new MysqlException(normalizeMysqlErrorCode(err), err);
    }
    if (err instanceof MysqlException) throw err;
    throw new MysqlException('MYSQL_EXCEPTION', err);
  }
});

function normalizeMysqlErrorCode(err: QueryFailedError): string {
  const driverError = (err as any).driverError || {};
  const code = driverError.code || driverError.errno || driverError.sqlState;

  switch (code) {
    case 'ER_DUP_ENTRY':
    case 1062:
    case '23505':
      return 'MYSQL_DUPLICATE_KEY';
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
    case 1216:
    case 1217:
    case 1451:
    case 1452:
    case '23503':
      return 'MYSQL_FOREIGN_KEY_VIOLATION';
    case 'ER_BAD_NULL_ERROR':
    case 1048:
    case '23502':
      return 'MYSQL_NOT_NULL_VIOLATION';
    case 'ER_BAD_FIELD_ERROR':
    case 1054:
    case '42703':
      return 'MYSQL_UNKNOWN_COLUMN';
    case 'ER_LOCK_DEADLOCK':
    case 1213:
    case '40P01':
      return 'MYSQL_DEADLOCK';
    case 'ER_LOCK_WAIT_TIMEOUT':
    case 1205:
    case '55P03':
      return 'MYSQL_LOCK_TIMEOUT';
    case 'ECONNREFUSED':
    case 'ETIMEDOUT':
    case 'ENOTFOUND':
      return 'MYSQL_CONNECTION_FAILED';
    case '40001':
      return 'MYSQL_TRANSACTION_CONFLICT';
    default:
      return 'MYSQL_QUERY_FAILED';
  }
}
