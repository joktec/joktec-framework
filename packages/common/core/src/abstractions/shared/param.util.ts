import { BadRequestException } from '@nestjs/common';

export type SubParamType = 'string' | 'number';

export interface ISubParamProps<T = unknown> {
  name?: string;
  type?: SubParamType;
  parser?: (value: string) => T;
  description?: string;
}

export const getParamName = (props: ISubParamProps | undefined, fallback: string): string => {
  return props?.name || fallback;
};

export const getSwaggerParamType = (props?: ISubParamProps): StringConstructor | NumberConstructor => {
  return props?.type === 'number' ? Number : String;
};

export const parseSubParam = <T>(value: string, props: ISubParamProps<T> | undefined): T => {
  if (props?.parser) return props.parser(value);
  if (props?.type === 'number') {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) throw new BadRequestException(`Invalid numeric param: ${props.name || 'param'}`);
    return parsed as T;
  }
  return value as T;
};
