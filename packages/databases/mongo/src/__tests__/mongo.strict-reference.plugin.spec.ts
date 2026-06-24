import { describe, expect, it } from '@jest/globals';
import { getUpdateValues } from '../plugins';

describe('StrictReferencePlugin helpers', () => {
  it('should extract direct replacement and operator reference values', () => {
    expect(
      getUpdateValues(
        {
          parentId: 'direct',
          $set: { parentId: 'set' },
          $setOnInsert: { parentId: 'insert' },
          $push: { parentIds: { $each: ['push-one', 'push-two'] } },
          $addToSet: { parentIds: 'add' },
        },
        'parentIds',
      ),
    ).toEqual(['push-one', 'push-two', 'add']);

    expect(getUpdateValues({ parentId: 'direct' }, 'parentId')).toEqual(['direct']);
    expect(getUpdateValues({ $set: { parentId: 'set' } }, 'parentId')).toEqual(['set']);
    expect(getUpdateValues({ $setOnInsert: { parentId: 'insert' } }, 'parentId')).toEqual(['insert']);
  });

  it('should extract nested reference values from pushed subdocuments', () => {
    expect(
      getUpdateValues(
        {
          $push: { items: { refId: 'push-one' } },
          $addToSet: { items: { $each: [{ refId: 'add-one' }, { refId: 'add-two' }] } },
        },
        'items.refId',
      ),
    ).toEqual(['push-one', 'add-one', 'add-two']);
  });

  it('should ignore unset and pull operations because they remove references', () => {
    expect(
      getUpdateValues(
        {
          $unset: { parentId: '' },
          $pull: { parentIds: 'removed' },
        },
        'parentIds',
      ),
    ).toEqual([]);
  });
});
