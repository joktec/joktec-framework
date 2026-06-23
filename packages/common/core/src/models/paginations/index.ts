import { Entity } from '../base.dto';
import { IBasePaginationResponse } from '../base.response';
import { ICursorPaginationResponse } from './cursor-based.pagination';
import { IOffsetPaginationResponse } from './offset-based.pagination';
import { IPagePaginationResponse } from './page-based.pagination';

export type PaginationMode = 'page' | 'offset' | 'cursor';

export type PaginationResponse<T extends Entity> =
  | IPagePaginationResponse<T>
  | IOffsetPaginationResponse<T>
  | ICursorPaginationResponse<T>;

export interface IPaginationResponse<T extends Entity>
  extends
    IBasePaginationResponse<T>,
    Partial<Omit<IPagePaginationResponse<T>, keyof IBasePaginationResponse<T>>>,
    Partial<Omit<IOffsetPaginationResponse<T>, keyof IBasePaginationResponse<T>>>,
    Partial<Omit<ICursorPaginationResponse<T>, keyof IBasePaginationResponse<T>>> {}

export * from './cursor-based.pagination';
export * from './cursor-pagination';
export * from './offset-based.pagination';
export * from './page-based.pagination';
