import { Type } from '@joktec/utils';
import { Type as NestType } from '@nestjs/common';
import { Field } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { Constructor, Entity } from './base.dto';

export interface IBasePaginationResponse<T extends Entity> {
  items: T[];
  total: number;
}

export const BasePaginationResponse = <T extends Entity>(dto: Constructor<T>): NestType<IBasePaginationResponse<T>> => {
  class BaseListResponseClazz implements IBasePaginationResponse<T> {
    @Field(() => [dto], { defaultValue: [] })
    @ApiProperty({ type: [dto], default: [], example: () => [new dto()] })
    @Type(() => dto)
    items!: T[];

    @Field({ defaultValue: 0 })
    @ApiProperty({ default: 0 })
    @Type(() => Number)
    total!: number;
  }

  return BaseListResponseClazz;
};

export * from './paginations';
