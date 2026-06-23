import { Type } from '@joktec/utils';
import { Type as NestType } from '@nestjs/common/interfaces/type.interface';
import { Field } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Constructor, Entity } from '../base.dto';
import { IBasePaginationResponse } from '../base.response';

export interface ICursorPaginationResponse<T extends Entity> extends IBasePaginationResponse<T> {
  hasNextPage: boolean;
  nextCursor: string | null;
}

export const CursorPaginationResponse = <T extends Entity>(
  dto: Constructor<T>,
): NestType<ICursorPaginationResponse<T>> => {
  class BaseListResponseClazz implements ICursorPaginationResponse<T> {
    @Field(() => [dto], { defaultValue: [] })
    @ApiProperty({ type: [dto], default: [], example: () => [new dto()] })
    @Type(() => dto)
    items!: T[];

    @Field({ defaultValue: 0 })
    @ApiProperty({ default: 0 })
    @Type(() => Number)
    total!: number;

    @Field({ nullable: true, defaultValue: null })
    @ApiPropertyOptional({ example: true })
    @Type(() => Boolean)
    hasNextPage!: boolean;

    @Field({ nullable: true, defaultValue: null })
    @ApiPropertyOptional({ example: 'xxxx' })
    @Type(() => String)
    nextCursor!: string | null;
  }

  return BaseListResponseClazz;
};
