import {
  IMysqlTimestampColumnOptions,
  applyPropertyDecorators,
  buildCreateDateColumnDecorators,
  buildDeleteDateColumnDecorators,
  buildUpdateDateColumnDecorators,
  cloneColumnOptions,
} from './columns';

export type TimestampColumnMode = 'create' | 'update' | 'delete';

/**
 * Business timestamp wrapper for createdAt, updatedAt, and deletedAt columns.
 *
 * - `TimestampColumn('create')`: TypeORM create-date column.
 * - `TimestampColumn('update')`: TypeORM update-date column.
 * - `TimestampColumn('delete')`: TypeORM soft-delete date column.
 *
 * The wrapper also adds date validation, class-transformer type metadata,
 * Swagger metadata, and GraphQL field metadata through the shared column
 * decorator pipeline.
 */
export function TimestampColumn(
  mode: TimestampColumnMode,
  options: IMysqlTimestampColumnOptions = {},
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const timestampOptions = cloneColumnOptions(options);
    if (mode === 'create') {
      applyPropertyDecorators(target, propertyKey, buildCreateDateColumnDecorators(timestampOptions));
      return;
    }

    if (mode === 'update') {
      applyPropertyDecorators(target, propertyKey, buildUpdateDateColumnDecorators(timestampOptions));
      return;
    }

    applyPropertyDecorators(target, propertyKey, buildDeleteDateColumnDecorators(timestampOptions));
  };
}
