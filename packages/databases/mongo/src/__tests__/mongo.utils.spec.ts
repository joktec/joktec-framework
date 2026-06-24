import { describe, expect, it } from '@jest/globals';
import { mongoDebug } from '../helpers';
import { ObjectId } from '../models';

describe('mongoDebug', () => {
  it('should render find commands with projection and cursor options as Mongo shell syntax', () => {
    const shell = mongoDebug(
      'articles',
      'find',
      { authorId: ObjectId.create('656c096ad77a68cf9c495e28'), title: /mongo/i },
      { title: 1, authorId: 1 },
      { sort: { createdAt: -1 }, skip: 10, limit: 5 },
    );

    expect(shell).toBe(
      "db.articles.find({ authorId: ObjectId('656c096ad77a68cf9c495e28'), title: /mongo/i }, { title: 1, authorId: 1 }).sort({ createdAt: -1 }).skip(10).limit(5)",
    );
  });

  it('should render update commands with shell-safe date and ObjectId values', () => {
    const shell = mongoDebug(
      'articles',
      'updateOne',
      { _id: ObjectId.create('656c096ad77a68cf9c495e28') },
      { $set: { publishedAt: new Date('2026-06-24T00:00:00.000Z') } },
      { upsert: true },
    );

    expect(shell).toBe(
      "db.articles.updateOne({ _id: ObjectId('656c096ad77a68cf9c495e28') }, { $set: { publishedAt: ISODate('2026-06-24T00:00:00.000Z') } }, { upsert: true })",
    );
  });

  it('should render aggregate pipelines with arrays intact', () => {
    const shell = mongoDebug('articles', 'aggregate', [{ $match: { status: 'published' } }, { $limit: 2 }]);

    expect(shell).toBe("db.articles.aggregate([{ $match: { status: 'published' } }, { $limit: 2 }])");
  });
});
