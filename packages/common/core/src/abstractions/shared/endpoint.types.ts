import {
  CanActivate,
  ExceptionFilter,
  NestInterceptor,
  Paramtype,
  PipeTransform,
  ValidationPipeOptions,
} from '@nestjs/common';
import { IApiFilterQueryOptions } from '../../decorators';
import { PaginationMode } from '../../models';

export interface IEndpointProps {
  disable?: boolean;
  hidden?: boolean;
  useBearer?: boolean;
  useApiKey?: boolean | [boolean, string];
  guards?: (CanActivate | Function)[];
  pipes?: (PipeTransform | Function)[];
  hooks?: (NestInterceptor | Function)[];
  filters?: (ExceptionFilter | Function)[];
  decorators?: MethodDecorator[];
}

type IControllerFilterQueryOptions = Omit<IApiFilterQueryOptions, 'mode' | 'paginationMode'>;

export type IControllerPaginateProps = IEndpointProps &
  IControllerFilterQueryOptions & {
    search?: boolean;
    mode?: PaginationMode;
  };

export type ControllerPipeOptions = ValidationPipeOptions & { metadataTypes?: Paramtype[] };

export const isHideEndpoint = (opts?: IEndpointProps): boolean => {
  if (opts?.disable) return true;
  return !!opts?.hidden;
};
