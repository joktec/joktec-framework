import { Module } from '@joktec/core';
import { ArticleCommentController } from './comment.controller';
import { ArticleCommentService } from './comment.service';

@Module({
  controllers: [ArticleCommentController],
  providers: [ArticleCommentService],
  exports: [ArticleCommentService],
})
export class CommentModule {}
