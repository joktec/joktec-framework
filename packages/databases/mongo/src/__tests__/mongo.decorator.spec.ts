import { describe, expect, it } from '@jest/globals';
import { StringProps } from '../decorators/props';
import { IPropOptions } from '../decorators';

describe('Mongo decorators', () => {
  it('should build phone validators from isPhone tuple options', () => {
    const opts = { isPhone: [true, 'invalid phone'] } as IPropOptions;

    expect(() => StringProps(opts, { isArray: false })).not.toThrow();
    expect(opts.validate).toEqual(expect.any(Function));
  });

  it('should build phone validators from isPhone object options', () => {
    const opts = { isPhone: { locale: 'vi-VN', strictMode: false, message: 'invalid phone' } } as IPropOptions;

    expect(() => StringProps(opts, { isArray: false })).not.toThrow();
    expect(opts.validate).toEqual(expect.any(Function));
  });
});
