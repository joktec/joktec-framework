import { DeepPartial, IBaseRequest } from '@joktec/core';
import { PipelineStage, UpdateQuery } from 'mongoose';
import { MongoSchema } from './mongo.schema';
export { ObjectId } from './object-id';

export type IMongoUpdate<T extends MongoSchema> = DeepPartial<T> & UpdateQuery<T>;
export type IMongoPipeline = PipelineStage;
export type IMongoLookupPipeline = Exclude<PipelineStage, PipelineStage.Merge | PipelineStage.Out>;
export type IMongoUnionWithPipeline = Exclude<PipelineStage, PipelineStage.Out | PipelineStage.Merge>;
export type IMongoFacetPipeline = Exclude<
  PipelineStage,
  | PipelineStage.CollStats
  | PipelineStage.Facet
  | PipelineStage.GeoNear
  | PipelineStage.IndexStats
  | PipelineStage.Out
  | PipelineStage.Merge
  | PipelineStage.PlanCacheStats
>;
export type IMongoMergePipeline = Extract<
  PipelineStage,
  | PipelineStage.AddFields
  | PipelineStage.Set
  | PipelineStage.Project
  | PipelineStage.Unset
  | PipelineStage.ReplaceRoot
  | PipelineStage.ReplaceWith
>;

export interface IMongoRequest<T extends MongoSchema> extends IBaseRequest<T> {
  aggregations?: IMongoPipeline[];
}
