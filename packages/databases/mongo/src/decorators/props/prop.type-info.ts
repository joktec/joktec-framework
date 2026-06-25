import { isArray, isUndefined } from 'lodash';
import { ObjectId } from '../../models/object-id';
import { MongoPropRuntimeOptions, PropTypeInfo } from './prop.types';

const KNOWN_TYPE_CONSTRUCTORS = new Set<any>([String, Number, Boolean, Date, Object, Array, ObjectId]);

export function resolvePropTypeInfo(opts: MongoPropRuntimeOptions, designType: any): PropTypeInfo {
  const hasExplicitType = !isUndefined(opts.type);
  const resolvedType = hasExplicitType ? resolveTypeFactory(opts.type) : resolveFallbackType(opts, designType);
  const isArrayType = isArray(resolvedType) || designType === Array;
  const itemType = isArray(resolvedType) ? resolvedType[0] : resolvedType;
  const isObjectId = isObjectIdType(itemType);
  const hasRuntimeType = hasExplicitType || resolvedType !== designType;

  return {
    designType: hasRuntimeType ? itemType : designType,
    swaggerType: isObjectId ? String : itemType,
    transformType: () => {
      const targetType = hasExplicitType ? resolveTransformType(opts.type) : itemType;
      return isObjectIdType(targetType) ? String : targetType;
    },
    isArray: isArrayType,
    isObjectId,
    hasExplicitType: hasRuntimeType,
  };
}

function resolveFallbackType(opts: MongoPropRuntimeOptions, designType: any): any {
  if (designType === Array) return designType;
  if (!isVirtualPopulate(opts) || !opts.ref) return designType;
  return resolveTypeFactory(opts.ref);
}

function isObjectIdType(designType: any): boolean {
  return designType === ObjectId || designType === ObjectId.prototype.constructor;
}

function isClassConstructor(type: any): boolean {
  return typeof type === 'function' && /^class\s/.test(Function.prototype.toString.call(type));
}

function resolveTypeFactory(type: any): any {
  if (isArray(type)) return type;
  if (typeof type !== 'function') return type;
  if (KNOWN_TYPE_CONSTRUCTORS.has(type) || isClassConstructor(type)) return type;

  try {
    return type();
  } catch {
    return type;
  }
}

function resolveTransformType(type: any): any {
  const resolvedType = resolveTypeFactory(type);
  return isArray(resolvedType) ? resolvedType[0] : resolvedType;
}

function isVirtualPopulate(opts: MongoPropRuntimeOptions): boolean {
  return Boolean(opts.ref && opts.localField && opts.foreignField);
}
