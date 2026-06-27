import { IResponseDto } from '../../models';

/** Response variants that ExpressInterceptor can return to Nest. */
export type ExpressResponseType<T> = string | T | IResponseDto<T>;
