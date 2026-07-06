import { PickType } from '@joktec/core';
import { Comment } from '../../../models/schemas';

export class ArticleCommentCreateDto extends PickType(Comment, ['content', 'parentId'] as const) {}

export class ArticleCommentUpdateDto extends PickType(Comment, ['content'] as const) {}
