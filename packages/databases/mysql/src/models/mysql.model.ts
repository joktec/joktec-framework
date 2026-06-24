import { ApiProperty, Field } from '@joktec/core';
import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

export interface IMysqlModel {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

/**
 * Base relational entity fields shared by repositories and pagination contracts.
 */
export class MysqlModel implements IMysqlModel {
  @CreateDateColumn()
  @ApiProperty({ type: Date })
  @Field(() => Date, { nullable: true })
  createdAt?: Date;

  @UpdateDateColumn()
  @ApiProperty({ type: Date })
  @Field(() => Date, { nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn()
  @ApiProperty({ type: Date })
  @Field(() => Date, { nullable: true })
  deletedAt?: Date;
}
