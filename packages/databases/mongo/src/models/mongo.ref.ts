import { Ref as TypegooseRef } from '@typegoose/typegoose';
import { RefType } from '@typegoose/typegoose/lib/types';

/**
 * Stored reference id field.
 *
 * Use this for persisted ObjectId/string reference columns such as `authorId`
 * or `artistIds`. It keeps Typegoose's raw-id/document union semantics for
 * code paths that may still work with unpopulated values.
 */
export type RefId<T, RawId extends RefType = string> = TypegooseRef<T, RawId>;

/**
 * Populated virtual reference field returned through JokTec repositories.
 *
 * Repository reads transform populated plain objects into schema class
 * instances, so application code can access nested properties directly while
 * the decorator's lazy `type` option keeps runtime metadata explicit.
 */
export type PopulatedRef<T> = T;
