import { Controller, ISubMicroControllerProps, SubClientController, Transport } from '@joktec/core';
import { Article, Comment } from '../../models/schemas';
import { ArticleCommentService } from './comment.service';
import { CommentCreateDto, CommentUpdateDto } from './models';

const props: ISubMicroControllerProps<Article, Comment> = {
  parentDto: Article,
  dto: Comment,
  transport: Transport.REDIS,
  customDto: {
    createDto: CommentCreateDto,
    updatedDto: CommentUpdateDto,
  },
};

@Controller('comments')
export class ArticleCommentController extends SubClientController<Article, Comment, string, string>(props) {
  constructor(protected articleCommentService: ArticleCommentService) {
    super(articleCommentService);
  }
}
