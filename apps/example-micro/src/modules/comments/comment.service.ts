import {
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

@Injectable()
export class ArticleCommentService implements IBaseSubService<Article, Comment, string, string, IBaseRequest<Comment>> {
  constructor(private readonly commentRepo: CommentRepo) {}

  async paginate(articleId: string, query: IBaseRequest<Comment>): Promise<IPaginationResponse<Comment>> {
    return this.commentRepo.paginate({
      ...query,
      condition: { ...query.condition, articleId },
    });
  }

  async findById(articleId: string, commentId: string, query: IBaseRequest<Comment> = {}): Promise<Comment> {
    const comment = await this.commentRepo.findOne({ _id: commentId, articleId }, query);
    if (!comment) throw new NotFoundException('comment.NOT_FOUND');
    return comment;
  }

  async create(articleId: string, entity: DeepPartial<Comment>): Promise<Comment> {
    return this.commentRepo.create({ ...entity, articleId });
  }

  async update(articleId: string, commentId: string, entity: DeepPartial<Comment>): Promise<Comment> {
    await this.assertArticleComment(articleId, commentId);
    return this.commentRepo.update(commentId, entity);
  }

  async delete(articleId: string, commentId: string): Promise<Comment> {
    await this.assertArticleComment(articleId, commentId);
    return this.commentRepo.delete(commentId);
  }

  private async assertArticleComment(articleId: string, commentId: string): Promise<void> {
    const comment = await this.commentRepo.findOne(commentId);
    if (!comment) throw new NotFoundException('comment.NOT_FOUND');
    if (!ObjectId.compare(comment.articleId, articleId)) throw new NotFoundException('comment.NOT_FOUND');
  }
}
