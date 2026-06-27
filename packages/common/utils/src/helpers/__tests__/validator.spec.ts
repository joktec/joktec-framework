import { describe, expect, it } from '@jest/globals';
import { IsString, validateSync } from 'class-validator';
import { Is2DIntArray, IsTypes } from '../../validators';
import { isClass, isDateStringCastable, isJsonObjectString } from '../validator';

class MyClass {
  private constructor() {}
}

describe('isClass function', () => {
  it('should detect MyClass is class and return true', () => {
    const result = isClass(MyClass);
    expect(result).toEqual(true);
  });

  it('should detect anonymous function is not class and return false', () => {
    const myFunction = () => {};
    const result = isClass(myFunction);
    expect(result).toEqual(false);
  });

  it('should detect function is not class and return false', () => {
    const myFunction = function abc() {};
    const result = isClass(myFunction);
    expect(result).toEqual(false);
  });
});

describe('request casting validator helpers', () => {
  it('should detect JSON object and array strings only', () => {
    expect(isJsonObjectString('{"active":true}')).toEqual(true);
    expect(isJsonObjectString('[1,2,3]')).toEqual(true);
    expect(isJsonObjectString('"plain string"')).toEqual(false);
    expect(isJsonObjectString('plain string')).toEqual(false);
    expect(isJsonObjectString('{broken')).toEqual(false);
  });

  it('should detect castable date strings by operator or date-like field', () => {
    expect(isDateStringCastable('2026-06-26T00:00:00.000Z', 'operator-and-date-key', { key: '$lte' })).toEqual(true);
    expect(
      isDateStringCastable('2026-06-26T00:00:00.000Z', 'operator-and-date-key', { path: ['condition', 'createdAt'] }),
    ).toEqual(true);
    expect(
      isDateStringCastable('2026-06-26T00:00:00.000Z', 'operator-only', { path: ['condition', 'createdAt'] }),
    ).toEqual(false);
    expect(isDateStringCastable('2026-06-26', false, { key: '$lte' })).toEqual(false);
    expect(isDateStringCastable('not-a-date', true)).toEqual(false);
  });
});

describe('IsTypes decorator', () => {
  class NestedConfig {
    @IsString()
    name: string;

    constructor(props: Partial<NestedConfig>) {
      Object.assign(this, props);
    }
  }

  class SampleConfig {
    @IsTypes(['string', NestedConfig])
    value: string | NestedConfig;
  }

  it('should pass when value matches a primitive allowed type', () => {
    const config = new SampleConfig();
    config.value = 'enabled';

    expect(validateSync(config)).toHaveLength(0);
  });

  it('should pass when value matches a class allowed type', () => {
    const config = new SampleConfig();
    config.value = new NestedConfig({ name: 'nested' });

    expect(validateSync(config)).toHaveLength(0);
  });

  it('should fail when value does not match any allowed type', () => {
    const config = new SampleConfig();
    config.value = 123 as any;

    const errors = validateSync(config);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('IsTypes');
  });
});

describe('Is2DIntArray decorator', () => {
  class MatrixConfig {
    @Is2DIntArray()
    matrix: number[][];
  }

  it('should pass when value is a 2D integer array', () => {
    const config = new MatrixConfig();
    config.matrix = [
      [1, 2],
      [3, 4],
    ];

    expect(validateSync(config)).toHaveLength(0);
  });

  it('should fail when value contains non-integer numbers', () => {
    const config = new MatrixConfig();
    config.matrix = [[1, 2.5]];

    const errors = validateSync(config);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('is2DIntArray');
  });
});
