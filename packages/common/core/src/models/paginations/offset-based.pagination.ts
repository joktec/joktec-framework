import { Type } from '@joktec/utils';
import { Type as NestType } from '@nestjs/common/interfaces/type.interface';
import { Field } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Constructor, Entity } from '../base.dto';
import { IBasePaginationResponse } from '../base.response';

export interface IOffsetPaginationResponse<T extends Entity> extends IBasePaginationResponse<T> {
  prevOffset: number | null;
  currOffset: number;
  nextOffset: number | null;
  lastOffset: number | null;
}

export const OffsetPaginationResponse = <T extends Entity>(
  dto: Constructor<T>,
): NestType<IOffsetPaginationResponse<T>> => {
  class BaseListResponseClazz implements IOffsetPaginationResponse<T> {
    @Field(() => [dto], { defaultValue: [] })
    @ApiProperty({ type: [dto], default: [], example: () => [new dto()] })
    @Type(() => dto)
    items!: T[];

    @Field({ defaultValue: 0 })
    @ApiProperty({ default: 0 })
    @Type(() => Number)
    total!: number;

    @Field({ nullable: true, defaultValue: null })
    @ApiPropertyOptional({ example: 0 })
    @Type(() => Number)
    prevOffset!: number | null;

    @Field({ nullable: true, defaultValue: 1 })
    @ApiPropertyOptional({ example: 10 })
    @Type(() => Number)
    currOffset!: number;

    @Field({ nullable: true, defaultValue: null })
    @ApiPropertyOptional({ example: 20 })
    @Type(() => Number)
    nextOffset!: number | null;

    @Field({ nullable: true, defaultValue: null })
    @ApiPropertyOptional({ example: 100 })
    @Type(() => Number)
    lastOffset!: number | null;
  }

  return BaseListResponseClazz;
};
