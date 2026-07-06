import { Module, TransportProxyFactory } from '@joktec/core';
import { TRANSPORT } from '../../app.constant';
import { ArticleCommentController } from './article-comment.controller';
import { ArticleCommentService } from './article-comment.service';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  controllers: [CommentController, ArticleCommentController],
  providers: [
    CommentService,
    ArticleCommentService,
    TransportProxyFactory(TRANSPORT.PROXY.ARTICLE, TRANSPORT.NAME.REDIS),
  ],
  exports: [CommentService, ArticleCommentService],
})
export class CommentModule {}
