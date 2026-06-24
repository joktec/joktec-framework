import { Dialect } from '../mysql.config';
import { MysqlException } from '../mysql.exception';

export interface MysqlDialectCapabilities {
  dialect: Dialect;
  firstClass: boolean;
  caseInsensitiveLike: 'LIKE' | 'ILIKE';
  arrayOperators: boolean;
  fullTextIndex: boolean;
  generatedMapsReliable: boolean;
}

export const FIRST_CLASS_DIALECTS: Dialect[] = [Dialect.MYSQL, Dialect.MARIADB, Dialect.POSTGRES];

/**
 * Checks whether the adapter treats the dialect as supported and tested.
 */
export function isFirstClassDialect(dialect: Dialect): boolean {
  return FIRST_CLASS_DIALECTS.includes(dialect);
}

/**
 * Centralizes dialect differences used by query helpers and decorators.
 */
export function getMysqlDialectCapabilities(dialect: Dialect = Dialect.MYSQL): MysqlDialectCapabilities {
  switch (dialect) {
    case Dialect.POSTGRES:
      return {
        dialect,
        firstClass: true,
        caseInsensitiveLike: 'ILIKE',
        arrayOperators: true,
        fullTextIndex: false,
        generatedMapsReliable: true,
      };
    case Dialect.MARIADB:
    case Dialect.MYSQL:
      return {
        dialect,
        firstClass: true,
        caseInsensitiveLike: 'LIKE',
        arrayOperators: false,
        fullTextIndex: true,
        generatedMapsReliable: false,
      };
    default:
      return {
        dialect,
        firstClass: false,
        caseInsensitiveLike: 'LIKE',
        arrayOperators: false,
        fullTextIndex: false,
        generatedMapsReliable: false,
      };
  }
}

export function assertFirstClassDialect(dialect: Dialect): void {
  if (!isFirstClassDialect(dialect)) {
    throw new MysqlException('MYSQL_UNSUPPORTED_DIALECT', { dialect, supported: FIRST_CLASS_DIALECTS });
  }
}
