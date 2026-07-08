import {
  BadRequestException,
  DeepPartial,
  IBaseRequest,
  IBaseSubService,
  Injectable,
  MessageEvent,
  IPaginationResponse,
  NotFoundException,
} from '@joktec/core';
import { MongoService, ObjectId } from '@joktec/mongo';
import { Observable } from 'rxjs';
import { Article, Comment } from '../../models/schemas';
import { CommentRepo } from '../../repositories';
import { CommentService } from './comment.service';
import { CommentCreateDto } from './models';

type ArticleCommentStreamMode = 'stream' | 'polling';

interface ArticleCommentStreamEvent {
  articleId: string;
  mode: ArticleCommentStreamMode;
  comment: Comment;
}

@Injectable()
export class ArticleCommentService implements IBaseSubService<Article, Comment, string, string, IBaseRequest<Comment>> {
  constructor(
    private readonly commentService: CommentService,
    private readonly commentRepo: CommentRepo,
    private readonly mongoService: MongoService,
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

  listenNewComments(articleId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>(subscriber => {
      let closed = false;
      let interval: NodeJS.Timeout | undefined;
      let stream: any;
      const emittedIds = new Set<string>();
      const startedAt = new Date();
      let lastSeenAt = startedAt;

      const emitComment = (mode: ArticleCommentStreamMode, comment: Comment) => {
        const commentId = String(comment?._id || comment?.id || '');
        if (!commentId || emittedIds.has(commentId)) return;

        emittedIds.add(commentId);
        if (comment.createdAt && comment.createdAt > lastSeenAt) lastSeenAt = comment.createdAt;

        subscriber.next({
          type: 'comment.created',
          data: {
            articleId,
            mode,
            comment,
          } satisfies ArticleCommentStreamEvent,
        });
      };

      const pollComments = async () => {
        const comments = await this.commentRepo.find({
          condition: {
            articleId,
            createdAt: { $gte: lastSeenAt },
          },
          limit: 100,
          sort: { createdAt: 'asc' },
          populate: {
            author: { select: ['_id', 'avatar', 'email', 'nickname'] },
            parent: '*',
            children: '*',
          },
        });

        comments.forEach(comment => emitComment('polling', comment));
      };

      const start = async () => {
        const coverage = await this.mongoService.getCoverage();

        if (coverage.canUseStream) {
          stream = await this.commentRepo.watch([
            {
              $match: {
                operationType: 'insert',
                'fullDocument.articleId': ObjectId.create(articleId),
              },
            },
          ]);

          stream.on('change', async (change: any) => {
            if (closed || !change?.fullDocument?._id) return;
            const comment = await this.findById(articleId, String(change.fullDocument._id));
            emitComment('stream', comment);
          });
          stream.on('error', err => subscriber.error(err));
          return;
        }

        await pollComments();
        interval = setInterval(() => {
          pollComments().catch(err => subscriber.error(err));
        }, 10_000);
      };

      start().catch(err => subscriber.error(err));

      return () => {
        closed = true;
        if (interval) clearInterval(interval);
        void stream?.close();
      };
    });
  }

  private async assertArticleComment(articleId: string, commentId: string): Promise<void> {
    const comment = await this.commentRepo.findOne(commentId);
    if (!comment) throw new NotFoundException('comment.NOT_FOUND');
    if (!ObjectId.compare(comment.articleId, articleId)) throw new BadRequestException('comment.NOT_IN_ARTICLE');
  }
}
