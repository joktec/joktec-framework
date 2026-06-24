import { toArray } from '@joktec/utils';
import { get } from 'lodash';
import { PipelineStage, PopulateOptions, Schema } from 'mongoose';
import { MongoHelper } from '../helpers';

type IPopulateOptions = string | PopulateOptions;

export interface TransformOptions {
  stripSavePaths?: string[];
  preserveSavePaths?: string[];
}

const DEFAULT_STRIP_SAVE_PATHS = ['_id', '__v', 'createdAt', 'updatedAt', '__t'];

/**
 * Merges virtual populate match conditions into caller-provided populate options.
 */
function combinePopulateMatch(
  populates: IPopulateOptions | IPopulateOptions[],
  virtualMatch: object,
): PopulateOptions[] {
  return toArray<IPopulateOptions>(populates).map<PopulateOptions>(populate => {
    if (typeof populate === 'string') {
      populate = { path: populate, match: {} } as PopulateOptions;
    }
    populate.match = Object.assign({}, populate.match, virtualMatch);
    return populate;
  });
}

/**
 * Normalizes filters, updates, populate options, and lookup stages before Mongoose executes them.
 */
export const TransformPlugin = (schema: Schema, opts: TransformOptions = {}) => {
  const schemaAny = schema as any;
  const stripSavePaths = (opts.stripSavePaths || DEFAULT_STRIP_SAVE_PATHS).filter(
    path => !toArray(opts.preserveSavePaths).includes(path),
  );

  schemaAny.pre('save', function () {
    stripSavePaths.map(path => {
      if (this[path]) delete this[path];
    });
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
    { document: false, query: true },
    function () {
      // Intercept options
      if (this.getOptions()) {
        const options = this.getOptions();
        if (options.sort) options.sort = MongoHelper.parseSort(options.sort);
        if (options.projection) options.projection = MongoHelper.parseProjection(options.projection as any);
        this.setOptions(options);
      }

      // Intercept filter
      if (this.getFilter()) {
        const newFilter = MongoHelper.parseFilter(this.getFilter(), true, { schema: this.model.schema });
        this.setQuery(newFilter);
      }

      // Intercept update
      if (this.getUpdate()) {
        const omitKeys = ['_id', '__v', 'createdAt', 'updatedAt', '__t'];
        const newUpdate = MongoHelper.flatten(this.getUpdate(), omitKeys);
        this.setUpdate(newUpdate);
      }

      // Intercept populate
      const populatedPaths = this.getPopulatedPaths();
      if (populatedPaths.length) {
        populatedPaths.forEach(path => {
          const virtual = this.model.schema.virtuals[path];
          const virtualMatch = Object.assign({}, get(virtual, 'options.match'), get(virtual, 'options.options.match'));
          const populateOptions = this.mongooseOptions().populate[path];
          const populates = combinePopulateMatch(populateOptions, virtualMatch);
          this.populate(populates);
        });
      }
    },
  );

  schemaAny.pre('aggregate', function () {
    const version = this.options?.version;
    if (!version) return;

    const mongoVersion = version.split('.').map(Number);

    const pipelines: PipelineStage[] = [];
    while (this.pipeline().length) pipelines.push(this.pipeline().shift());
    pipelines.map(pipeline => {
      if ('$lookup' in pipeline) {
        if (mongoVersion[0] < 5) {
          const lookupStage = pipeline['$lookup'];
          if (lookupStage.localField && lookupStage.foreignField) {
            pipeline = {
              $lookup: {
                from: lookupStage.from,
                let: { localFieldVar: `$${lookupStage.localField}` },
                pipeline: [{ $match: { $expr: { $eq: [`$${lookupStage.foreignField}`, '$$localFieldVar'] } } }],
                as: lookupStage.as,
              },
            };
          }
        }

        if (!pipeline.$lookup.pipeline?.length) {
          delete pipeline.$lookup.pipeline;
        }
      }
      this.pipeline().push(pipeline);
    });
  });

  schemaAny.post(/^find/, function () {
    // const paths = Object.keys(this.model.schema.paths);
    // if (isArray(res)) res.map(doc => cleanUpDocument(doc, paths));
    // else cleanUpDocument(res, paths);
  });
};
