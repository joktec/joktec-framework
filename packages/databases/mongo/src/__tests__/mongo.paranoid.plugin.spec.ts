import { describe, expect, it } from '@jest/globals';
import { IMongoPipeline } from '../models';
import { injectFilter, injectMatchPipeline } from '../plugins';

describe('ParanoidPlugin helpers', () => {
  it('should not override explicit deletedAt conditions', () => {
    const filter = { deletedAt: { $ne: null }, title: 'archived' };

    expect(injectFilter(filter, 'deletedAt')).toEqual({ deletedAt: { $ne: null }, title: 'archived' });
  });

  it('should inject deletedAt into $geoNear query without moving the first stage', () => {
    const pipelines: IMongoPipeline[] = [
      { $geoNear: { near: { type: 'Point', coordinates: [0, 0] }, distanceField: 'dist' } },
    ];

    expect(injectMatchPipeline(pipelines, 'deletedAt')).toEqual([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [0, 0] },
          distanceField: 'dist',
          query: { deletedAt: null },
        },
      },
    ]);
  });

  it('should keep search-like stages first and inject deletedAt after them', () => {
    const pipelines = [{ $search: { text: { query: 'feed', path: 'title' } } }] as unknown as IMongoPipeline[];

    expect(injectMatchPipeline(pipelines, 'deletedAt')).toEqual([
      { $search: { text: { query: 'feed', path: 'title' } } },
      { $match: { deletedAt: null } },
    ]);
  });

  it('should not inject filters into unknown nested lookup pipelines', () => {
    const pipelines: IMongoPipeline[] = [
      {
        $lookup: {
          from: 'comments',
          as: 'comments',
          pipeline: [{ $match: { status: 'published' } }],
        },
      },
    ];

    expect(injectMatchPipeline(pipelines, 'deletedAt')).toEqual([
      { $match: { deletedAt: null } },
      {
        $lookup: {
          from: 'comments',
          as: 'comments',
          pipeline: [{ $match: { status: 'published' } }],
        },
      },
    ]);
  });

  it('should return a new pipeline array without mutating the original input', () => {
    const pipelines: IMongoPipeline[] = [{ $group: { _id: '$status', total: { $sum: 1 } } }];

    const result = injectMatchPipeline(pipelines, 'deletedAt');

    expect(result).not.toBe(pipelines);
    expect(pipelines).toEqual([{ $group: { _id: '$status', total: { $sum: 1 } } }]);
    expect(result).toEqual([{ $match: { deletedAt: null } }, { $group: { _id: '$status', total: { $sum: 1 } } }]);
  });

  it('should not empty aggregate pipelines when replacing mongoose pipeline contents', () => {
    const mongoosePipeline: IMongoPipeline[] = [{ $group: { _id: '$status', total: { $sum: 1 } } }];
    const injected = injectMatchPipeline(mongoosePipeline, 'deletedAt');

    while (mongoosePipeline.length) mongoosePipeline.shift();
    while (injected.length) mongoosePipeline.push(injected.shift());

    expect(mongoosePipeline).toEqual([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', total: { $sum: 1 } } },
    ]);
  });
});
