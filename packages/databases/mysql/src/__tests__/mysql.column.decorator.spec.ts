import { describe, expect, it } from '@jest/globals';
import { validateSync } from '@joktec/utils';
import { getMetadataArgsStorage } from 'typeorm';
import { Column, PrimaryColumn } from '../decorators';

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('MySQL column decorators', () => {
  it('applies TypeORM column metadata and validation decorators', () => {
    class ProductColumnFixture {
      @Column({ length: 10, nullable: false })
      name?: string;
    }

    const metadata = getMetadataArgsStorage().columns.find(
      item => item.target === ProductColumnFixture && item.propertyName === 'name',
    );

    expect(metadata).toBeDefined();
    expect(metadata.options.length).toEqual(10);

    const invalid = new ProductColumnFixture();
    expect(validateSync(invalid).map(error => error.property)).toContain('name');

    const valid = new ProductColumnFixture();
    valid.name = 'product';
    expect(validateSync(valid)).toHaveLength(0);
  });

  it('treats nullable columns as optional validation fields', () => {
    class OptionalColumnFixture {
      @Column({ length: 10, nullable: true })
      code?: string;
    }

    expect(validateSync(new OptionalColumnFixture())).toHaveLength(0);
  });

  it('generates uuidv7 values before insert for primary columns', () => {
    class UuidPrimaryFixture {
      @PrimaryColumn('uuidv7')
      id?: string;
    }

    const fixture = new UuidPrimaryFixture();
    const hookName = Object.getOwnPropertyNames(UuidPrimaryFixture.prototype).find(name =>
      name.includes('__joktecBeforeInsertUuidV7_id'),
    );

    expect(hookName).toBeDefined();
    fixture[hookName]();

    expect(fixture.id).toMatch(UUID_V7_REGEX);

    const metadata = getMetadataArgsStorage().columns.find(
      item => item.target === UuidPrimaryFixture && item.propertyName === 'id',
    );
    expect(metadata).toBeDefined();
    expect(metadata.options.primary).toEqual(true);
  });
});
