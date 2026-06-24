import { toArray } from '@joktec/utils';
import { SelectQueryBuilder } from 'typeorm';

/**
 * Renders a parameterized SQL query into a copyable debug statement.
 */
export function printSql(query: string, parameters: any[] = []): string {
  let sql: string = query;
  toArray(parameters).forEach((param: any, index: number) => {
    const value = formatSqlValue(param);
    const postgresToken = new RegExp(`\\$${index + 1}(?!\\d)`, 'g');
    if (postgresToken.test(sql)) {
      sql = sql.replace(postgresToken, value);
      return;
    }
    sql = sql.replace('?', value);
  });
  return sql;
}

/**
 * Extracts SQL and bound parameters from a TypeORM QueryBuilder for debugging.
 */
export function exportSql(builder: SelectQueryBuilder<any>) {
  const [query, params] = builder.getQueryAndParameters();
  return printSql(query, params);
}

function formatSqlValue(param: any): string {
  if (param === null || param === undefined) return 'NULL';
  if (param instanceof Date) return `'${param.toISOString()}'`;
  if (Buffer.isBuffer(param)) return `X'${param.toString('hex')}'`;
  if (Array.isArray(param)) return `(${param.map(item => formatSqlValue(item)).join(', ')})`;
  if (typeof param === 'boolean') return param ? 'TRUE' : 'FALSE';
  if (typeof param === 'number' || typeof param === 'bigint') return param.toString();
  if (typeof param === 'object') return `'${escapeSqlString(JSON.stringify(param))}'`;
  return `'${escapeSqlString(String(param))}'`;
}

function escapeSqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}
