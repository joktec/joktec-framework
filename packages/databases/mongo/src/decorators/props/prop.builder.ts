import { ApiHideProperty, ApiProperty, ApiPropertyOptional, ApiPropertyOptions, applyDecorators } from '@joktec/core';
import {
  Exclude,
  Expose,
  ExposeOptions,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  toArray,
  Type,
  ValidateNested,
} from '@joktec/utils';
import { prop, PropType, Severity } from '@typegoose/typegoose';
import { isArray, isBoolean, isNil, isUndefined, last, merge, unset } from 'lodash';
import { PROP_DESIGN_TYPE_KEY } from '../../mongo.constant';
import { ArrayProps } from './array.prop';
import { BoolProps } from './bool.prop';
import { DateProps } from './date.prop';
import { EnumProps } from './enum.prop';
import { NumberProps } from './number.prop';
import { StringProps } from './string.prop';
import type {
  IMongoPropOptions,
  IPropOptions,
  MongoFieldDecorator,
  MongoPropKind,
  MongoPropRuntimeOptions,
  MongoVirtualMode,
  PropBuildContext,
  PropTypeInfo,
} from './prop.types';

const MONGO_ID_EXAMPLE = '00000020f51bb4362eee2a4d';
const WRAPPER_OPTION_KEYS = [
  'kind',
  'mode',
  'virtual',
  'optional',
  'expose',
  'hidden',
  'nested',
  'example',
  'comment',
  'strictRef',
  'deprecated',
  'groups',
  'decorators',
  'swagger',
  'useGQL',
];

export function clonePropOptions<T>(opts: IMongoPropOptions<T>): MongoPropRuntimeOptions<T> {
  return { ...opts, swagger: opts.swagger ? { ...opts.swagger } : undefined };
}

export function buildPropContext(options: MongoPropRuntimeOptions, typeInfo: PropTypeInfo): PropBuildContext {
  normalizeVirtualPopulateOptions(options, typeInfo);
  sanitizeTypegooseOptions(options, typeInfo);

  return {
    options,
    typeInfo,
    propKind: getPropKind(options),
    typegooseKind: getTypegooseKind(options, typeInfo),
  };
}

export function applyPropDecorators(context: PropBuildContext, target: object, propertyKey: string | symbol): void {
  if (context.propKind === 'virtual' && getVirtualMode(context.options) === 'getter') {
    applyGetterVirtualDecorators(context, target, propertyKey);
    return;
  }

  applyPersistedOrPopulateDecorators(context, target, propertyKey);
}

function applyGetterVirtualDecorators(context: PropBuildContext, target: object, propertyKey: string | symbol): void {
  const decorators = createBaseDecorators(context);
  addVirtualVisibilityDecorators(decorators, context.options);
  addSwaggerDecorator(decorators, context.options, buildSwaggerOptions(context.options, context.typeInfo));
  applyAndStoreMetadata(decorators, context, target, propertyKey);
}

function applyPersistedOrPopulateDecorators(
  context: PropBuildContext,
  target: object,
  propertyKey: string | symbol,
): void {
  const { options, propKind, typeInfo, typegooseKind } = context;
  const decorators = createBaseDecorators(context);
  const swaggerOptions = buildSwaggerOptions(options, typeInfo);

  if (propKind === 'mixed' || typegooseKind === PropType.MAP) {
    options.allowMixed = Severity.ALLOW;
  }

  if (typegooseKind === PropType.MAP) {
    if (!options.type) options.type = Object;
  }

  if (propKind === 'virtual') {
    addVirtualVisibilityDecorators(decorators, options);
    decorators.push(ValidateNested({ each: typeInfo.isArray }));
  } else {
    addRequiredDecorators(decorators, options);
    addVisibilityDecorators(decorators, options);
  }

  addTransformDecorators(decorators, options, typeInfo);
  addTypedValidationDecorators(decorators, options, swaggerOptions, typeInfo);
  addSwaggerDecorator(decorators, options, swaggerOptions);

  decorators.unshift(prop(toMongooseOptions(options), typegooseKind));
  applyAndStoreMetadata(decorators, context, target, propertyKey);
}

function createBaseDecorators(context: PropBuildContext): PropertyDecorator[] {
  return [...toArray(context.options.decorators)];
}

function applyAndStoreMetadata(
  decorators: PropertyDecorator[],
  context: PropBuildContext,
  target: object,
  propertyKey: string | symbol,
): void {
  applyDecorators(...(decorators as MongoFieldDecorator[]))(target, propertyKey);
  Reflect.defineMetadata(PROP_DESIGN_TYPE_KEY, context.typeInfo.designType, target, propertyKey);
}

function isRequired(opts: MongoPropRuntimeOptions = {}): boolean {
  if (opts.optional) return false;
  const required = opts.required;
  if (!required) return false;
  if (isBoolean(required)) return required;
  if (isArray(required)) return required[0];
  return false;
}

function sanitizeTypegooseOptions(opts: MongoPropRuntimeOptions, typeInfo: PropTypeInfo): void {
  ['unique', 'index', 'text'].forEach(key => unset(opts, key));
  if (opts.immutable && isBoolean(opts.immutable) && !opts.required) {
    opts.immutable = (v: any) => !isNil(v);
  }
  if (opts.type && typeInfo.isObjectId) {
    opts.example = typeInfo.isArray ? [MONGO_ID_EXAMPLE] : MONGO_ID_EXAMPLE;
  }
}

function normalizeVirtualPopulateOptions(opts: MongoPropRuntimeOptions, typeInfo: PropTypeInfo): void {
  if (!hasVirtualPopulateFields(opts)) return;

  opts.kind = 'virtual';
  opts.mode = 'populate';

  if (isUndefined(opts.justOne) && !typeInfo.isArray) {
    opts.justOne = true;
  }

  if (isUndefined(opts.example)) {
    opts.example = typeInfo.isArray ? [] : {};
  }
}

function buildSwaggerOptions(opts: MongoPropRuntimeOptions, typeInfo: PropTypeInfo): ApiPropertyOptions {
  const required = isRequired(opts);
  const swaggerOptions: ApiPropertyOptions = {
    type: typeInfo.swaggerType,
    required,
    example: !isUndefined(opts.example) ? opts.example : opts.default,
    enum: opts.enum,
    deprecated: isBoolean(opts.deprecated) ? opts.deprecated : undefined,
    nullable: !required,
    description: opts?.comment || undefined,
    isArray: typeInfo.isArray,
    readOnly: opts.immutable === true ? true : undefined,
  };

  if (opts.ref) swaggerOptions.example = opts.example || (typeInfo.isArray ? [] : {});
  else if (!typeInfo.isArray && isArray(opts.example)) {
    swaggerOptions.example = opts.example[0];
    swaggerOptions.examples = opts.example;
  }

  return swaggerOptions;
}

function resolveExposeOptions(opts: MongoPropRuntimeOptions, toPlainOnly = false): ExposeOptions | undefined {
  if (opts.expose) return opts.expose;
  if (opts.groups?.length) return toPlainOnly ? { groups: opts.groups, toPlainOnly } : { groups: opts.groups };
  return toPlainOnly ? { toPlainOnly } : undefined;
}

function addRequiredDecorators(decorators: PropertyDecorator[], opts: MongoPropRuntimeOptions): void {
  if (opts.required) {
    const validatorOption: any = {};
    if (isArray(opts.required)) validatorOption.message = last(opts.required);
    decorators.push(IsNotEmpty(validatorOption));
    return;
  }

  decorators.push(IsOptional());
}

function addVisibilityDecorators(decorators: PropertyDecorator[], opts: MongoPropRuntimeOptions): void {
  if (opts.hidden) {
    decorators.push(Exclude({ toPlainOnly: true }), ApiHideProperty());
    return;
  }

  decorators.push(Expose(resolveExposeOptions(opts)));
}

function addVirtualVisibilityDecorators(decorators: PropertyDecorator[], opts: MongoPropRuntimeOptions): void {
  if (opts.hidden) {
    decorators.push(Exclude({ toPlainOnly: true }), ApiHideProperty());
    return;
  }

  decorators.push(Expose(resolveExposeOptions(opts, true)));
}

function addTransformDecorators(
  decorators: PropertyDecorator[],
  opts: MongoPropRuntimeOptions,
  typeInfo: PropTypeInfo,
): void {
  if (typeInfo.hasExplicitType && !typeInfo.isObjectId) {
    decorators.push(Type(typeInfo.transformType));
  }

  if (opts.nested) {
    decorators.push(ValidateNested({ each: typeInfo.isArray }));
    if (!typeInfo.hasExplicitType) decorators.push(Type(typeInfo.transformType));
  }
}

function addTypedValidationDecorators(
  decorators: PropertyDecorator[],
  opts: MongoPropRuntimeOptions,
  swaggerOptions: ApiPropertyOptions,
  typeInfo: PropTypeInfo,
): void {
  if (typeInfo.isArray) decorators.push(...ArrayProps(opts as IPropOptions, swaggerOptions));
  if (opts.enum) {
    decorators.push(...EnumProps(opts as IPropOptions, swaggerOptions));
    if (!isRequired(opts)) opts.addNullToEnum = true;
  } else if (typeInfo.designType === String) decorators.push(...StringProps(opts as IPropOptions, swaggerOptions));
  else if (typeInfo.designType === Number) decorators.push(...NumberProps(opts as IPropOptions, swaggerOptions));
  else if (typeInfo.designType === Date) decorators.push(...DateProps(opts as IPropOptions, swaggerOptions));
  else if (typeInfo.designType === Boolean) decorators.push(...BoolProps(opts as IPropOptions, swaggerOptions));
  else if (typeInfo.isObjectId) decorators.push(IsMongoId({ each: typeInfo.isArray }));
}

function addSwaggerDecorator(
  decorators: PropertyDecorator[],
  opts: MongoPropRuntimeOptions,
  swaggerOptions: ApiPropertyOptions,
): void {
  if (opts.hidden) return;
  const swaggerDecorator = isRequired(opts) ? ApiProperty : ApiPropertyOptional;
  decorators.push(swaggerDecorator(merge(swaggerOptions, opts.swagger)));
}

function toMongooseOptions(opts: MongoPropRuntimeOptions): MongoPropRuntimeOptions {
  const mongooseOpts = { ...opts };
  if (mongooseOpts.ref) delete mongooseOpts.type;
  WRAPPER_OPTION_KEYS.forEach(key => delete mongooseOpts[key]);
  return mongooseOpts;
}

function hasVirtualPopulateFields(opts: MongoPropRuntimeOptions): boolean {
  return Boolean(opts.ref && opts.localField && opts.foreignField);
}

function getPropKind(opts: MongoPropRuntimeOptions): MongoPropKind {
  if (opts.kind === 'map') return 'map';
  if (opts.kind === 'mixed') return 'mixed';
  if (opts.kind === 'virtual' || opts.virtual || hasVirtualPopulateFields(opts)) return 'virtual';
  return 'normal';
}

function getVirtualMode(opts: MongoPropRuntimeOptions): MongoVirtualMode {
  if (opts.mode === 'populate' || hasVirtualPopulateFields(opts)) return 'populate';
  return 'getter';
}

function getTypegooseKind(opts: MongoPropRuntimeOptions, typeInfo: PropTypeInfo): PropType | undefined {
  if (opts.kind === 'map') return PropType.MAP;
  if (typeInfo.isArray) return PropType.ARRAY;
  return undefined;
}
