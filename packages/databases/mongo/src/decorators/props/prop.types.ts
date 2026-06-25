import type { ArrayPropOptions } from './array.prop';
import type { BoolPropOptions } from './bool.prop';
import type { DatePropOptions } from './date.prop';
import type { EnumPropOptions } from './enum.prop';
import type { NumberPropOptions } from './number.prop';
import type { StringPropOptions } from './string.prop';
import type { ApiPropertyOptions, Clazz } from '@joktec/core';
import type { ExposeOptions } from '@joktec/utils';
import type { PropType } from '@typegoose/typegoose';
import type { BasePropOptions, MapPropOptions, VirtualOptions } from '@typegoose/typegoose/lib/types';

export type TypegooseProp =
  | BasePropOptions
  | StringPropOptions
  | NumberPropOptions
  | DatePropOptions
  | EnumPropOptions
  | BoolPropOptions
  | ArrayPropOptions
  | MapPropOptions
  | VirtualOptions;

export interface IMongoPropCommonOptions<T = any> {
  /** Typegoose/Mongoose extension fields not modeled by this wrapper yet. */
  [extra: string]: any;

  /** Hide this field from plain responses and Swagger output. */
  hidden?: boolean;

  /** Treat this field as optional for validator and Swagger metadata. */
  optional?: boolean;

  /** class-transformer expose options. */
  expose?: ExposeOptions;

  /** Apply nested class transform and nested validation for explicit class types. */
  nested?: boolean;

  /** Swagger/example value. */
  example?: T | Clazz<T>;

  /** Human-readable field description. */
  comment?: string;

  /** Enables strict-reference plugin checks where supported. */
  strictRef?: boolean;

  /** Marks Swagger field as deprecated. */
  deprecated?: boolean;

  /** Shared class-transformer groups. */
  groups?: string[];

  /** Additional property decorators appended by the application. */
  decorators?: PropertyDecorator[];

  /** Swagger override. Wrapper-inferred values are applied first. */
  swagger?: ApiPropertyOptions;

  /** Reserved GraphQL metadata flag used by framework consumers. */
  useGQL?: boolean;
}

export type IMongoNormalPropOptions<T = any> = TypegooseProp &
  IMongoPropCommonOptions<T> & {
    /** Persisted property mode. Omit for normal schema fields. */
    kind?: 'normal';

    /** Legacy getter virtual switch. Prefer `kind: 'virtual'`. */
    virtual?: false;
  };

export type IMongoMapPropOptions<T = any> = MapPropOptions &
  IMongoPropCommonOptions<T> & {
    /** Raw object/map property mode. */
    kind: 'map';
  };

export type IMongoVirtualGetterPropOptions<T = any> = IMongoPropCommonOptions<T> & {
  /** Virtual property mode. */
  kind?: 'virtual';

  /** TypeScript getter mode. Omit when using legacy `virtual: true`. */
  mode?: 'getter';

  /** Legacy getter virtual switch. */
  virtual?: true;

  /** Optional explicit type for Swagger/class-transformer metadata. */
  type?: BasePropOptions['type'];

  /** Required metadata for getter virtuals only. */
  required?: BasePropOptions['required'];

  /** Mark getter output as read-only in Swagger. */
  immutable?: BasePropOptions['immutable'];
};

export type IMongoVirtualPopulatePropOptions<T = any> = VirtualOptions &
  IMongoPropCommonOptions<T> & {
    /** Virtual property mode. */
    kind?: 'virtual';

    /** Mongoose virtual populate mode. Inferred when ref/localField/foreignField are provided. */
    mode?: 'populate';

    /** Explicit populated class or array class resolver. Populate-one can fallback to `ref`. */
    type?: BasePropOptions['type'];
  };

export type IMongoPropOptions<T = any> =
  | IMongoNormalPropOptions<T>
  | IMongoMapPropOptions<T>
  | IMongoVirtualGetterPropOptions<T>
  | IMongoVirtualPopulatePropOptions<T>;

/** Compatibility alias for existing imports. Prefer `IMongoPropOptions` in new code. */
export type IPropOptions<T = any> = IMongoPropOptions<T>;

export type MongoPropRuntimeOptions<T = any> = TypegooseProp &
  IMongoPropCommonOptions<T> & {
    kind?: 'normal' | 'map' | 'virtual';
    mode?: 'getter' | 'populate';
    virtual?: boolean;
  };

export type MongoFieldDecorator = PropertyDecorator & MethodDecorator;
export type MongoPropKind = 'normal' | 'map' | 'virtual';
export type MongoVirtualMode = 'getter' | 'populate';

export interface PropTypeInfo {
  designType: any;
  swaggerType: any;
  transformType: () => any;
  isArray: boolean;
  isObjectId: boolean;
  hasExplicitType: boolean;
}

export interface PropBuildContext<T = any> {
  options: MongoPropRuntimeOptions<T>;
  typeInfo: PropTypeInfo;
  propKind: MongoPropKind;
  typegooseKind?: PropType;
}
