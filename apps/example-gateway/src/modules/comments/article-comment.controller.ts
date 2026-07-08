import { Controller, ISubControllerProps, MessageEvent, Param, Sse, SubController } from '@joktec/core';
import { Observable } from 'rxjs';
import { AuthGuard, RoleGuard } from '../../common';
import { Article, Comment } from '../../models/schemas';
import { ArticleCommentService } from './article-comment.service';
import { ArticleCommentCreateDto, ArticleCommentUpdateDto, CommentPaginationDto } from './models';

const props: ISubControllerProps<Article, Comment> = {
  parentDto: Article,
  dto: Comment,
  parentParam: { name: 'articleId' },
  childParam: { name: 'commentId' },
  customDto: {
    createDto: ArticleCommentCreateDto,
    updatedDto: ArticleCommentUpdateDto,
    paginationDto: CommentPaginationDto,
    mutationDto: Comment,
  },
  paginate: { mode: 'offset', search: true },
  guards: [AuthGuard, RoleGuard],
  useBearer: true,
};

@Controller('articles/:articleId/comments')
export class ArticleCommentController extends SubController<Article, Comment, string, string>(props) {
  constructor(protected articleCommentService: ArticleCommentService) {
    super(articleCommentService);
  }

  @Sse('events/new')
  listenNewComments(@Param('articleId') articleId: string): Observable<MessageEvent> {
    return this.articleCommentService.listenNewComments(articleId);
  }
}
