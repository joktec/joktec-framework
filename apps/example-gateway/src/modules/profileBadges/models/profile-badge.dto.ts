import { ApiProperty } from '@joktec/core';
import { IsNotEmpty, IsString } from '@joktec/utils';

export class AssignProfileBadgeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  userId!: string;
}
