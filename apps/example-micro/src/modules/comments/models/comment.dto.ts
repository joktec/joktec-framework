import { PickType } from '@joktec/core';
import { Comment } from '../../../models/schemas';

export class CommentCreateDto extends PickType(Comment, ['content', 'articleId', 'authorId', 'parentId'] as const) {}

export class CommentUpdateDto extends PickType(CommentCreateDto, ['content'] as const) {}
