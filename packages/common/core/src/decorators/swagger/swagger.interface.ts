import { Constructor, PaginationMode, Wrapper } from '../../models';

export interface IApiFilterQueryOptions {
  textSearch?: boolean;
  geoSearch?: boolean;
  paginationMode?: PaginationMode;
  relation?: boolean;
}

export type DecoratorOptions = { name: string };
export type ApiSchemaDecorator = <T extends Constructor<object>>(
  options: DecoratorOptions,
) => (constructor: T) => Wrapper<T>;
