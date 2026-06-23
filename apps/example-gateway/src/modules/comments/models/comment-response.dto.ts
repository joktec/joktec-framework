import { ApiSchema, OffsetPaginationResponse } from '@joktec/core';
import { Comment } from '../../../models/schemas';

@ApiSchema({ name: `CommentPagination` })
export class CommentPaginationDto extends OffsetPaginationResponse<Comment>(Comment) {}
