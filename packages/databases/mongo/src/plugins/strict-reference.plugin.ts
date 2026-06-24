import { BadRequestException } from '@joktec/core';
import { toArray } from '@joktec/utils';
import { difference, get, isEmpty, pickBy, uniq } from 'lodash';
import mongoose, { Error, Schema } from 'mongoose';

type IRefPath = { path: string; ref: string };

/**
 * Finds paths marked with strictRef so writes can verify referenced documents exist.
 */
function getRefPath(schema: Schema): IRefPath[] {
  const refPath: IRefPath[] = [];
  (Object.values(schema.paths) as any[]).map(schemaType => {
    const schemaTypeAny = schemaType as any;
    const caster = schemaTypeAny.caster;
    const isRefObject =
      schemaTypeAny instanceof mongoose.Schema.Types.ObjectId &&
      schemaTypeAny.options.ref &&
      schemaTypeAny.options.strictRef === true;
    if (isRefObject) {
      refPath.push({ path: schemaTypeAny.path, ref: schemaTypeAny.options.ref });
    }

    const isArrayRef =
      schemaTypeAny instanceof mongoose.Schema.Types.Array &&
      caster &&
      caster?.options?.ref &&
      schemaTypeAny.options.strictRef === true;
    if (isArrayRef) {
      refPath.push({ path: schemaTypeAny.path, ref: caster?.options?.ref });
    }
  });
  return refPath;
}

function getVirtualPath(schema: Schema) {
  return pickBy(schema.virtuals, (virtual: any) => {
    const strictRef = get(virtual, 'options.strictRef', false);
    const isForeign = get(virtual, 'options.foreignField', '_id') !== '_id';
    return strictRef && isForeign;
  });
}

/**
 * Resolves models from the active connection before falling back to the global registry.
 */
export function getConnectionModel(context: any, modelName: string) {
  const connection = context?.model?.db || context?.constructor?.db;
  if (connection?.models?.[modelName]) return connection.model(modelName);
  return mongoose.model(modelName);
}

function readPathValue(source: any, path: string): any {
  if (!source) return undefined;
  if (Object.prototype.hasOwnProperty.call(source, path)) return source[path];
  return get(source, path);
}

function readNestedOperatorValues(source: any, path: string): any[] {
  if (!source) return [];

  const segments = path.split('.');
  for (let index = segments.length - 1; index > 0; index--) {
    const parentPath = segments.slice(0, index).join('.');
    const childPath = segments.slice(index).join('.');
    const parentValue = readPathValue(source, parentPath);
    if (!parentValue) continue;

    const items =
      parentValue && typeof parentValue === 'object' && '$each' in parentValue ? parentValue.$each : parentValue;
    return toArray(items)
      .map(item => (childPath ? get(item, childPath) : item))
      .filter(value => value !== undefined);
  }

  return [];
}

/**
 * Extracts referenced ids from direct values and update operators such as $set, $push, and $addToSet.
 */
export function getUpdateValues(update: any, path: string): any[] {
  const values = [
    readPathValue(update, path),
    readPathValue(update?.$set, path),
    readPathValue(update?.$setOnInsert, path),
    readPathValue(update?.$push, path),
    ...readNestedOperatorValues(update?.$push, path),
    readPathValue(update?.$addToSet, path),
    ...readNestedOperatorValues(update?.$addToSet, path),
  ];

  return uniq(
    values.flatMap(value => {
      if (value && typeof value === 'object' && '$each' in value) return toArray(value.$each);
      return toArray(value);
    }),
  );
}

async function validateReferenceValues(context: any, refPaths: IRefPath[], valuesByPath: Record<string, any[]>) {
  const validation = new Error.ValidationError();

  for (const refPath of refPaths) {
    const insertIds = uniq(toArray(valuesByPath[refPath.path]).map(String)).filter(Boolean);
    if (!insertIds.length) continue;

    const items = await getConnectionModel(context, refPath.ref).find().in('_id', insertIds).exec();
    const storeIds = items.map(item => String(item._id));
    const notExistIds = difference(insertIds, storeIds);
    if (notExistIds.length) {
      const validator = new Error.ValidatorError({
        type: 'strictRef',
        message: `Not found dependent documents in '${refPath.ref}' with path '${refPath.path}'.`,
        path: refPath.path,
        value: notExistIds,
        reason: new BadRequestException('MONGO_REF_EXCEPTION'),
      });
      validation.addError(refPath.path, validator);
    }
  }

  if (!isEmpty(validation.errors)) throw validation;
}

/**
 * Mongoose plugin that approximates relational integrity checks for configured refs.
 */
export const StrictReferencePlugin = (schema: Schema, opts?: { paranoidKey?: string }) => {
  const schemaAny = schema as any;

  schemaAny.pre('save', async function () {
    const refPaths = getRefPath(schema);
    if (!refPaths.length) return;

    await validateReferenceValues(
      this,
      refPaths,
      refPaths.reduce((acc, refPath) => {
        acc[refPath.path] = toArray(this.get(refPath.path));
        return acc;
      }, {}),
    );
  });

  schemaAny.pre(['findOneAndUpdate', 'findOneAndReplace', 'updateOne', 'updateMany'], async function () {
    const paranoidKey = opts?.paranoidKey;
    if (paranoidKey && this.get(paranoidKey)) {
      return;
    }

    const refPaths = getRefPath(schema);
    if (!refPaths.length) return;

    const update = this.getUpdate();
    await validateReferenceValues(
      this,
      refPaths,
      refPaths.reduce((acc, refPath) => {
        acc[refPath.path] = getUpdateValues(update, refPath.path);
        return acc;
      }, {}),
    );
  });

  schemaAny.pre(
    ['findOneAndUpdate', 'updateMany', 'updateOne', 'findOneAndDelete', 'deleteMany', 'deleteOne'],
    async function () {
      const paranoidKey = opts?.paranoidKey;
      if (paranoidKey && this.get(paranoidKey)) {
        return;
      }

      const virtualPath = getVirtualPath(schema);
      if (isEmpty(virtualPath)) return;

      const items = await getConnectionModel(this, this.model.modelName)
        .find(this.getFilter(), '_id', this.getOptions())
        .exec();
      if (!items.length) return;

      const validation = new Error.ValidationError();
      for (const [path, virtual] of Object.entries(virtualPath)) {
        const { ref, foreignField } = get(virtual as any, 'options', {});
        const query = { [foreignField]: { $in: items.map(item => item._id) } };
        const dependentDocuments = await getConnectionModel(this, ref).findOne(query, '_id', this.getOptions()).exec();
        if (dependentDocuments) {
          const validator = new Error.ValidatorError({
            type: 'strictRef',
            message: `Cannot delete: dependent documents exist in '${ref}' with path '${path}'.`,
            path: path,
            value: dependentDocuments._id,
            reason: new BadRequestException('MONGO_REF_EXCEPTION'),
          });
          validation.addError(path, validator);
        }
      }

      if (!isEmpty(validation.errors)) throw validation;
    },
  );
};
