import { ApiSchema, OffsetPaginationResponse, PickType } from '@joktec/core';
import { Article, User } from '../../../models/schemas';

@ApiSchema({ name: `ArticlePagination` })
export class ArticlePaginationDto extends OffsetPaginationResponse<Article>(Article) {}

export class UserLiked extends PickType(User, ['_id', 'avatar', 'email', 'nickname'] as const) {}

@ApiSchema({ name: `UserLikedPagination` })
export class UserLikedPaginationDto extends OffsetPaginationResponse<UserLiked>(UserLiked) {}
