import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  BaseController,
  BaseValidationPipe,
  Body,
  Controller,
  IControllerProps,
  Param,
  Patch,
  UsePipes,
} from '@joktec/core';
import { ProfileBadge } from '../../models/entities';
import { User } from '../../models/schemas';
import { AssignProfileBadgeDto } from './models';
import { ProfileBadgeService } from './profile-badge.service';

const props: IControllerProps<ProfileBadge> = {
  dto: ProfileBadge,
};

@Controller('profile-badges')
export class ProfileBadgeController extends BaseController<ProfileBadge, string>(props) {
  constructor(protected profileBadgeService: ProfileBadgeService) {
    super(profileBadgeService);
  }

  @Patch('/:id/users')
  @ApiOperation({ summary: 'Assign profile badge to a user' })
  @ApiBody({ type: AssignProfileBadgeDto })
  @ApiOkResponse({ type: User })
  @UsePipes(new BaseValidationPipe())
  async assignToUser(@Param('id') id: string, @Body() dto: AssignProfileBadgeDto): Promise<User> {
    return this.profileBadgeService.assignToUser(id, dto.userId);
  }
}
