import { Type } from '@joktec/utils';
import { Type as NestType } from '@nestjs/common/interfaces/type.interface';
import { Field } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Constructor, Entity } from '../base.dto';
import { IBasePaginationResponse } from '../base.response';

export interface IPagePaginationResponse<T extends Entity> extends IBasePaginationResponse<T> {
  prevPage: number | null;
  currPage: number;
  nextPage: number | null;
  lastPage: number | null;
}

export const PagePaginationResponse = <T extends Entity>(dto: Constructor<T>): NestType<IPagePaginationResponse<T>> => {
  class BaseListResponseClazz implements IPagePaginationResponse<T> {
    @Field(() => [dto], { defaultValue: [] })
    @ApiProperty({ type: [dto], default: [], example: () => [new dto()] })
    @Type(() => dto)
    items!: T[];

    @Field({ defaultValue: 0 })
    @ApiProperty({ default: 0 })
    @Type(() => Number)
    total!: number;

    @Field({ nullable: true, defaultValue: null })
    @ApiPropertyOptional({ example: 1 })
    @Type(() => Number)
    prevPage!: number | null;

    @Field({ nullable: true, defaultValue: 1 })
    @ApiPropertyOptional({ example: 2 })
    @Type(() => Number)
    currPage!: number;

    @Field({ nullable: true, defaultValue: null })
    @ApiPropertyOptional({ example: 3 })
    @Type(() => Number)
    nextPage!: number | null;

    @Field({ nullable: true, defaultValue: null })
    @ApiPropertyOptional({ example: 10 })
    @Type(() => Number)
    lastPage!: number | null;
  }

  return BaseListResponseClazz;
};
