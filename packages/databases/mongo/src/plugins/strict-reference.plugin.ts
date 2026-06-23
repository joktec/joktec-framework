import { BadRequestException } from '@joktec/core';
import { toArray } from '@joktec/utils';
import { getModelWithString } from '@typegoose/typegoose';
import { difference, get, isEmpty, pickBy } from 'lodash';
import mongoose, { Error, Schema } from 'mongoose';

type IRefPath = { path: string; ref: string };

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

export const StrictReferencePlugin = (schema: Schema, opts?: { paranoidKey?: string }) => {
  const schemaAny = schema as any;

  schemaAny.pre('save', async function () {
    const refPaths = getRefPath(schema);
    if (!refPaths.length) return;

    const validation = new Error.ValidationError();
    for (const refPath of refPaths) {
      const insertIds = toArray(this.get(refPath.path));
      if (!insertIds.length) continue;

      const items = await getModelWithString(refPath.ref).find().in('_id', insertIds).exec();
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
  });

  schemaAny.pre(['findOneAndUpdate', 'findOneAndReplace', 'updateOne', 'updateMany'], async function () {
    const paranoidKey = opts?.paranoidKey;
    if (paranoidKey && this.get(paranoidKey)) {
      return;
    }

    const refPaths = getRefPath(schema);
    if (!refPaths.length) return;

    const validation = new Error.ValidationError();
    for (const refPath of refPaths) {
      const insertIds = toArray(this.get(refPath.path));
      if (!insertIds.length) continue;

      const items = await getModelWithString(refPath.ref).find().in('_id', insertIds).exec();
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

      const items = await getModelWithString(this.model.modelName)
        .find(this.getFilter(), '_id', this.getOptions())
        .exec();
      if (!items.length) return;

      const validation = new Error.ValidationError();
      for (const [path, virtual] of Object.entries(virtualPath)) {
        const { ref, foreignField } = get(virtual as any, 'options', {});
        const query = { [foreignField]: { $in: items.map(item => item._id) } };
        const dependentDocuments = await getModelWithString(ref).find(query, '_id').exec();
        if (dependentDocuments.length > 0) {
          const validator = new Error.ValidatorError({
            type: 'strictRef',
            message: `Cannot delete: ${dependentDocuments.length} dependent documents in '${ref}' with path '${path}'.`,
            path: path,
            value: dependentDocuments.map(doc => doc._id),
            reason: new BadRequestException('MONGO_REF_EXCEPTION'),
          });
          validation.addError(path, validator);
        }
      }

      if (!isEmpty(validation.errors)) throw validation;
    },
  );
};
