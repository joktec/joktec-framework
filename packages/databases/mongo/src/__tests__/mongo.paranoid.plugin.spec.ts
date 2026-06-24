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
});
