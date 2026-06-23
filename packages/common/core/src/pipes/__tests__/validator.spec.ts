import { describe, expect, it } from '@jest/globals';
import { buildError } from '../../utils';

describe('buildError function', () => {
  it('should build validation property list for flat errors array', () => {
    const errors = [
      {
        property: 'username',
        value: 'long-name',
        constraints: { maxLength: 'Username must be no more than 20 characters' },
      },
      {
        property: 'email',
        value: 'invalid',
        constraints: { isEmail: 'Email must be a valid email address' },
      },
    ];

    const result = buildError(errors);

    expect(result).toEqual([
      {
        path: 'username',
        value: 'long-name',
        message: ['Username must be no more than 20 characters'],
      },
      {
        path: 'email',
        value: 'invalid',
        message: ['Email must be a valid email address'],
      },
    ]);
  });

  it('should build validation property list for nested errors array', () => {
    const errors = [
      {
        property: 'address',
        children: [
          {
            property: 'street',
            value: 'too-long',
            constraints: { maxLength: 'Street must be no more than 50 characters' },
          },
          {
            property: 'city',
            value: 'too-long',
            constraints: { maxLength: 'City must be no more than 30 characters' },
          },
        ],
      },
      {
        property: 'email',
        value: 'invalid',
        constraints: { isEmail: 'Email must be a valid email address' },
      },
    ];

    const result = buildError(errors);

    expect(result).toEqual([
      {
        path: 'address.street',
        value: 'too-long',
        message: ['Street must be no more than 50 characters'],
      },
      {
        path: 'address.city',
        value: 'too-long',
        message: ['City must be no more than 30 characters'],
      },
      {
        path: 'email',
        value: 'invalid',
        message: ['Email must be a valid email address'],
      },
    ]);
  });

  it('should skip errors with no constraints and no children', () => {
    const errors = [
      { property: 'username', constraints: null },
      {
        property: 'email',
        value: 'invalid',
        constraints: { isEmail: 'Email must be a valid email address' },
      },
    ];

    const result = buildError(errors);

    expect(result).toEqual([
      {
        path: 'email',
        value: 'invalid',
        message: ['Email must be a valid email address'],
      },
    ]);
  });

  it('should skip nested errors with no constraints', () => {
    const errors = [
      {
        property: 'address',
        children: [
          { property: 'street', constraints: null },
          {
            property: 'city',
            value: 'too-long',
            constraints: { maxLength: 'City must be no more than 30 characters' },
          },
        ],
      },
      {
        property: 'email',
        value: 'invalid',
        constraints: { isEmail: 'Email must be a valid email address' },
      },
    ];

    const result = buildError(errors);

    expect(result).toEqual([
      {
        path: 'address.city',
        value: 'too-long',
        message: ['City must be no more than 30 characters'],
      },
      {
        path: 'email',
        value: 'invalid',
        message: ['Email must be a valid email address'],
      },
    ]);
  });
});
