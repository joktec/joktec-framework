import crypto from 'crypto';
import {
  BeforeInsert,
  PrimaryColumn as TypeormPrimaryColumn,
  PrimaryGeneratedColumn as TypeormPrimaryGeneratedColumn,
} from 'typeorm';
import { IMysqlPrimaryColumnOptions, PrimaryColumnStrategy } from './column.type';
import { toTypeormOptions } from './column.util';

const uuidFromBytes = (bytes: Buffer): string => {
  const hex = bytes.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
};

const generateUuidV7 = (): string => {
  const bytes = crypto.randomBytes(16);
  bytes.writeUIntBE(Date.now(), 0, 6);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return uuidFromBytes(bytes);
};

/**
 * Adds a BeforeInsert hook that fills uuidv7 primary keys when the app did not provide one.
 */
const registerUuidPrimaryHook = (target: object, propertyKey: string | symbol): void => {
  const property = String(propertyKey);
  const hookName = `__joktecBeforeInsertUuidV7_${property}`;
  if (!Object.prototype.hasOwnProperty.call(target, hookName)) {
    Object.defineProperty(target, hookName, {
      value: function setUuidV7PrimaryKey() {
        if (!this[property]) this[property] = generateUuidV7();
      },
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
  BeforeInsert()(target, hookName);
};

/**
 * Selects the TypeORM primary decorator for each supported framework id strategy.
 */
export function buildPrimaryDecorator(
  strategy: PrimaryColumnStrategy,
  primaryOptions: IMysqlPrimaryColumnOptions,
  target: object,
  propertyKey: string | symbol,
): PropertyDecorator {
  if (strategy === 'uuidv7') {
    registerUuidPrimaryHook(target, propertyKey);
    return (TypeormPrimaryColumn as any)({
      type: primaryOptions.type || 'varchar',
      length: primaryOptions.length || 36,
      ...toTypeormOptions(primaryOptions),
    });
  }

  return TypeormPrimaryGeneratedColumn(strategy as any, toTypeormOptions(primaryOptions) as any);
}
