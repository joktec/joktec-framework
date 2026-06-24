import { ICondition, IPopulate, ISort } from '@joktec/core';
import { Brackets, EntityMetadata, SelectQueryBuilder } from 'typeorm';
import { IMysqlRequest } from '../models';
import { Dialect } from '../mysql.config';
import { MysqlException } from '../mysql.exception';
import { getMysqlDialectCapabilities } from '../services';

export interface MysqlQueryContext {
  metadata?: EntityMetadata;
  dialect?: Dialect;
}

interface MysqlConditionContext extends MysqlQueryContext {
  alias: string;
  paramIndex: number;
}

/**
 * Translates framework request contracts into safe TypeORM QueryBuilder calls.
 */
export class MysqlHelper {
  private static readonly FIELD_PATTERN = /^[a-zA-Z0-9_.]+$/;
  private static readonly LIKE_ESCAPE_SQL = "ESCAPE '\\\\'";

  static applyPagination<T>(qb: SelectQueryBuilder<T>, query: IMysqlRequest<T> = {}) {
    const limit = typeof query.limit === 'number' && query.limit > 0 ? query.limit : undefined;
    const page = typeof query.page === 'number' && query.page > 0 ? query.page : undefined;
    const offset = typeof query.offset === 'number' && query.offset >= 0 ? query.offset : undefined;

    if (limit && page) qb.take(limit).skip((page - 1) * limit);
    else if (limit) qb.take(limit).skip(offset ?? 0);
  }

  static applyCondition<T>(qb: SelectQueryBuilder<T>, condition?: ICondition<T>, context: MysqlQueryContext = {}) {
    if (!condition) return;

    const conditionContext: MysqlConditionContext = { ...context, alias: qb.alias, paramIndex: 0 };
    for (const [key, value] of Object.entries(condition || {})) {
      MysqlHelper.applyConditionEntry(qb, key, value, conditionContext);
    }
  }

  /**
   * Applies one filter entry, including nested $and/$or groups through TypeORM Brackets.
   */
  private static applyConditionEntry<T>(
    qb: SelectQueryBuilder<T>,
    key: string,
    value: any,
    context: MysqlConditionContext,
  ): void {
    if (key === '$or' || key === '$and') {
      const nested = Array.isArray(value) ? value : [];
      if (!nested.length) return;
      qb.andWhere(
        new Brackets(child => {
          nested.forEach((condition: ICondition<T>, index: number) => {
            const method = key === '$or' && index > 0 ? 'orWhere' : 'andWhere';
            child[method](
              new Brackets(grandChild => {
                Object.entries(condition || {}).forEach(([childKey, childValue]) => {
                  MysqlHelper.applyConditionEntry(grandChild as SelectQueryBuilder<T>, childKey, childValue, context);
                });
              }),
            );
          });
        }),
      );
      return;
    }

    const column = MysqlHelper.column(qb, key, context);
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      for (const [op, val] of Object.entries(value)) {
        MysqlHelper.applyOperator(qb, column, key, op, val, context);
      }
      return;
    }

    const param = MysqlHelper.nextParam(key, context);
    qb.andWhere(`${column} = :${param}`, { [param]: value });
  }

  private static applyOperator<T>(
    qb: SelectQueryBuilder<T>,
    column: string,
    key: string,
    op: string,
    val: any,
    context: MysqlConditionContext,
  ): void {
    const capabilities = getMysqlDialectCapabilities(context.dialect);
    const param = MysqlHelper.nextParam(key, context);
    switch (op) {
      case '$eq':
        qb.andWhere(`${column} = :${param}`, { [param]: val });
        return;
      case '$gt':
        qb.andWhere(`${column} > :${param}`, { [param]: val });
        return;
      case '$gte':
        qb.andWhere(`${column} >= :${param}`, { [param]: val });
        return;
      case '$lt':
        qb.andWhere(`${column} < :${param}`, { [param]: val });
        return;
      case '$lte':
        qb.andWhere(`${column} <= :${param}`, { [param]: val });
        return;
      case '$ne':
        qb.andWhere(`${column} != :${param}`, { [param]: val });
        return;
      case '$in':
        MysqlHelper.assertNonEmptyArray(op, key, val);
        qb.andWhere(`${column} IN (:...${param})`, { [param]: val });
        return;
      case '$nin':
        MysqlHelper.assertNonEmptyArray(op, key, val);
        qb.andWhere(`${column} NOT IN (:...${param})`, { [param]: val });
        return;
      case '$like':
        qb.andWhere(`${column} ${capabilities.caseInsensitiveLike} :${param} ${MysqlHelper.LIKE_ESCAPE_SQL}`, {
          [param]: `%${MysqlHelper.escapeLikePattern(val)}%`,
        });
        return;
      case '$begin':
        qb.andWhere(`${column} ${capabilities.caseInsensitiveLike} :${param} ${MysqlHelper.LIKE_ESCAPE_SQL}`, {
          [param]: `${MysqlHelper.escapeLikePattern(val)}%`,
        });
        return;
      case '$end':
        qb.andWhere(`${column} ${capabilities.caseInsensitiveLike} :${param} ${MysqlHelper.LIKE_ESCAPE_SQL}`, {
          [param]: `%${MysqlHelper.escapeLikePattern(val)}`,
        });
        return;
      case '$nil':
        qb.andWhere(`${column} IS ${val === false ? 'NOT ' : ''}NULL`);
        return;
      case '$exists':
        qb.andWhere(`${column} IS ${val === false ? '' : 'NOT '}NULL`);
        return;
      case '$empty':
        qb.andWhere(`${column} = ''`);
        return;
      case '$not':
        qb.andWhere(`${column} != :${param}`, { [param]: val });
        return;
      case '$all':
      case '$size':
        if (!capabilities.arrayOperators) {
          throw new MysqlException('MYSQL_OPERATOR_UNSUPPORTED_BY_DIALECT', { op, dialect: capabilities.dialect });
        }
        if (op === '$all') qb.andWhere(`${column} @> ARRAY[:...${param}]`, { [param]: val });
        else qb.andWhere(`array_length(${column}, 1) = :${param}`, { [param]: val });
        return;
      default:
        throw new MysqlException('MYSQL_OPERATOR_UNSUPPORTED', { op, key });
    }
  }

  static applyProjection<T>(qb: SelectQueryBuilder<T>, select?: string | string[], context: MysqlQueryContext = {}) {
    if (!select) return;
    const fields = Array.isArray(select) ? select : select.split(',');
    qb.select(fields.map(field => MysqlHelper.column(qb, field.trim(), context)));
  }

  static applyOrder<T>(qb: SelectQueryBuilder<T>, sort?: ISort<T>, context: MysqlQueryContext = {}) {
    if (!sort) return;
    for (const [key, value] of Object.entries(sort)) {
      qb.addOrderBy(MysqlHelper.column(qb, key, context), value === 'asc' ? 'ASC' : 'DESC');
    }
  }

  static applyRelations<T>(qb: SelectQueryBuilder<T>, populate?: IPopulate<T>, context: MysqlQueryContext = {}) {
    if (!populate) return;
    for (const [relation, value] of Object.entries(populate)) {
      MysqlHelper.assertRelation(relation, context);
      if (value === '*') {
        qb.leftJoinAndSelect(`${qb.alias}.${relation}`, relation);
      } else if (typeof value === 'object') {
        qb.leftJoinAndSelect(`${qb.alias}.${relation}`, relation);
      }
    }
  }

  /**
   * Validates a field path against TypeORM metadata before it is used as an SQL identifier.
   */
  static assertColumn(path: string, context: MysqlQueryContext = {}): void {
    MysqlHelper.assertSafePath(path);
    if (!context.metadata) return;

    const exists = context.metadata.columns.some(column => {
      return column.propertyPath === path || column.propertyName === path || column.databasePath === path;
    });
    if (!exists) throw new MysqlException('MYSQL_UNKNOWN_COLUMN', { path, entity: context.metadata.name });
  }

  static assertRelation(path: string, context: MysqlQueryContext = {}): void {
    MysqlHelper.assertSafePath(path);
    if (!context.metadata) return;

    const exists = context.metadata.relations?.some(relation => {
      return relation.propertyPath === path || relation.propertyName === path;
    });
    if (!exists) throw new MysqlException('MYSQL_UNKNOWN_RELATION', { path, entity: context.metadata.name });
  }

  static column<T>(qb: SelectQueryBuilder<T>, path: string, context: MysqlQueryContext): string {
    MysqlHelper.assertColumn(path, context);
    const alias = (context as MysqlConditionContext).alias || qb.alias;
    return `${alias}.${path}`;
  }

  static escapeLikePattern(value: unknown): string {
    return String(value).replace(/[\\%_]/g, '\\$&');
  }

  private static assertSafePath(path: string): void {
    if (!MysqlHelper.FIELD_PATTERN.test(path)) throw new MysqlException('MYSQL_UNSAFE_FIELD_PATH', { path });
  }

  private static nextParam(key: string, context: MysqlConditionContext): string {
    const safeKey = key.replace(/\./g, '_');
    const param = `${safeKey}_${context.paramIndex}`;
    context.paramIndex += 1;
    return param;
  }

  private static assertNonEmptyArray(op: string, key: string, val: unknown): void {
    if (!Array.isArray(val) || val.length === 0) {
      throw new MysqlException('MYSQL_INVALID_OPERATOR_VALUE', { op, key, expected: 'non-empty array' });
    }
  }
}
