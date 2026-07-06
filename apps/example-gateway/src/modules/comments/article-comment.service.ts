import {
  BadRequestException,
  DeepPartial,
  IBaseRequest,
  IBaseSubService,
  Injectable,
  IPaginationResponse,
  NotFoundException,
} from '@joktec/core';
import { ObjectId } from '@joktec/mongo';
import { Article, Comment } from '../../models/schemas';
import { CommentRepo } from '../../repositories';
import { CommentService } from './comment.service';
import { CommentCreateDto } from './models';

@Injectable()
export class ArticleCommentService implements IBaseSubService<Article, Comment, string, string, IBaseRequest<Comment>> {
  constructor(
    private readonly commentService: CommentService,
    private readonly commentRepo: CommentRepo,
  ) {}

  async paginate(articleId: string, query: IBaseRequest<Comment>): Promise<IPaginationResponse<Comment>> {
    return this.commentService.paginate({
      ...query,
      condition: { ...query.condition, articleId },
    });
  }

  async findById(articleId: string, commentId: string, query: IBaseRequest<Comment> = {}): Promise<Comment> {
    const comment = await this.commentRepo.findOne(
      { _id: commentId, articleId },
      {
        ...query,
        populate: {
          author: { select: ['_id', 'avatar', 'email', 'nickname'] },
          parent: '*',
          children: '*',
          ...query.populate,
        },
      },
    );
    if (!comment) throw new NotFoundException('comment.NOT_FOUND');
    return comment;
  }

  async create(articleId: string, entity: DeepPartial<Comment>): Promise<Comment> {
    return this.commentService.create({ ...entity, articleId } as CommentCreateDto);
  }

  async update(articleId: string, commentId: string, entity: DeepPartial<Comment>): Promise<Comment> {
    await this.assertArticleComment(articleId, commentId);
    return this.commentService.update(commentId, entity);
  }

  async delete(articleId: string, commentId: string): Promise<Comment> {
    await this.assertArticleComment(articleId, commentId);
    return this.commentService.delete(commentId);
  }

  private async assertArticleComment(articleId: string, commentId: string): Promise<void> {
    const comment = await this.commentRepo.findOne(commentId);
    if (!comment) throw new NotFoundException('comment.NOT_FOUND');
    if (!ObjectId.compare(comment.articleId, articleId)) throw new BadRequestException('comment.NOT_IN_ARTICLE');
  }
}
