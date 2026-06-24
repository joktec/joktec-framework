import { Clazz } from '@joktec/core';
import { toArray, toBool } from '@joktec/utils';
import { isEmpty } from 'lodash';
import { QueryOptions, Schema } from 'mongoose';
import { IMongoPipeline } from '../models';

export interface ParanoidOptions {
  deletedAt?: { name?: string; type?: Clazz };
  injectIndex?: boolean;
}

export interface ParanoidQueryOptions<T = any> extends QueryOptions<T> {
  paranoid?: boolean;
  force?: boolean;
}

/**
 * Adds the soft-delete condition to a query filter unless the caller opts out.
 */
export function injectFilter(filter: Record<string, any>, key: string, paranoid: boolean = true) {
  if (!paranoid) return filter;
  if (Object.prototype.hasOwnProperty.call(filter, key)) return filter;
  return Object.assign(filter, { [key]: null });
}

/**
 * Injects soft-delete filters into aggregate pipelines without breaking first-stage-only operators.
 */
export function injectMatchPipeline(
  pipelines: IMongoPipeline[],
  key: string,
  paranoid: boolean = true,
): IMongoPipeline[] {
  const newPipelines: IMongoPipeline[] = toArray(pipelines);
  if (!paranoid) return newPipelines;

  for (const pipeline of toArray(pipelines)) {
    if ('$match' in pipeline) {
      injectFilter(pipeline.$match, key, paranoid);
    }
  }

  const match = injectFilter({}, key, paranoid);
  if (newPipelines.some(p => '$match' in p) || isEmpty(match)) {
    return newPipelines;
  }

  const first = newPipelines[0];
  if (first && '$geoNear' in first) {
    first.$geoNear.query = injectFilter(Object.assign({}, first.$geoNear.query), key, paranoid);
    return newPipelines;
  }

  if (first && ('$search' in first || '$searchMeta' in first || '$vectorSearch' in first)) {
    newPipelines.splice(1, 0, { $match: match });
    return newPipelines;
  }

  newPipelines.unshift({ $match: match });
  return newPipelines;
}

/**
 * Mongoose plugin that implements deletedAt-based soft delete for queries and aggregates.
 */
export const ParanoidPlugin = (schema: Schema, opts?: ParanoidOptions) => {
  const schemaAny = schema as any;
  const deletedAtKey = opts?.deletedAt?.name || 'deletedAt';

  // Add deletedAt field
  schema.add({
    [deletedAtKey]: {
      type: opts?.deletedAt?.type || Date,
      default: null,
      deletedAt: deletedAtKey,
      select: false,
    },
  });

  schemaAny.pre(
    [
      'find',
      'findOne',
      'findOneAndUpdate',
      'countDocuments',
      'estimatedDocumentCount',
      'updateMany',
      'updateOne',
      'deleteOne',
      'findOneAndDelete',
      'deleteMany',
    ],
    function () {
      const options = this.getOptions();
      const paranoid = toBool(options?.paranoid, true);

      // Intercept filter
      const filter = this.getFilter();
      injectFilter(filter, deletedAtKey, paranoid);
      this.setQuery(filter);
    },
  );

  // Aggregate
  schemaAny.pre('aggregate', function () {
    const options = this.options as ParanoidQueryOptions;
    const paranoid = toBool(options?.paranoid, true);
    const pipelines: IMongoPipeline[] = injectMatchPipeline(this.pipeline(), deletedAtKey, paranoid);
    while (this.pipeline().length) this.pipeline().shift();
    while (pipelines.length) this.pipeline().push(pipelines.shift());
  });
};
