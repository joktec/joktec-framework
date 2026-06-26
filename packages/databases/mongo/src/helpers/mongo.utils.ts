import { isPlainObject } from 'lodash';
import { ObjectId } from '../models';

const quoteString = (value: string): string => {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
};

const renderShellValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (ObjectId.isObjectId(value)) return `ObjectId('${String(value)}')`;
  if (value instanceof Date) return `ISODate('${value.toISOString()}')`;
  if (value instanceof RegExp) return value.toString();
  if (typeof value === 'string') return quoteString(value);
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  if (Buffer.isBuffer(value)) return `BinData(0, '${value.toString('base64')}')`;
  if (Array.isArray(value)) return `[${value.map(renderShellValue).join(', ')}]`;
  if (value instanceof Map) return renderShellValue(Object.fromEntries(value.entries()));

  if (isPlainObject(value)) {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const shellKey = /^[A-Za-z_$][\w$]*$/.test(key) || key.startsWith('$') ? key : quoteString(key);
      return `${shellKey}: ${renderShellValue(item)}`;
    });
    return `{ ${entries.join(', ')} }`;
  }

  const jsonValue = JSON.stringify(value);
  if (jsonValue) return renderShellValue(JSON.parse(jsonValue));
  return quoteString(String(value));
};

const renderArgs = (...methodArgs: unknown[]): string => methodArgs.map(renderShellValue).join(', ');

/**
 * Renders Mongoose debug callbacks as copyable Mongo shell commands.
 */
export const mongoDebug = (collectionName: string, methodName: string, ...methodArgs: any[]): string => {
  if (methodName === 'find' || methodName === 'findOne') {
    const [filter = {}, projection, options = {}] = methodArgs;
    const args = projection ? renderArgs(filter, projection) : renderArgs(filter);
    let mongoShell = `db.${collectionName}.${methodName}(${args})`;

    if (options.sort) mongoShell += `.sort(${renderShellValue(options.sort)})`;
    if (options.skip) mongoShell += `.skip(${options.skip})`;
    if (options.limit) mongoShell += `.limit(${options.limit})`;
    if (options.maxTimeMS) mongoShell += `.maxTimeMS(${options.maxTimeMS})`;
    return mongoShell;
  }

  return `db.${collectionName}.${methodName}(${renderArgs(...methodArgs)})`;
};
