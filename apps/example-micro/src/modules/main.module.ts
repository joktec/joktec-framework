import { Global, Module } from '@joktec/core';
import { SharedModule } from '../shared/shared.module';
import { ArticleModule } from './articles';
import { ArtistModule } from './artists';
import { AssetModule } from './assets';
import { CommentModule } from './comments';
import { CronModule } from './crons';
import { NotificationModule } from './notifications';
import { OtpModule } from './otpLogs';
import { UserModule } from './users';

@Global()
@Module({
  imports: [
    SharedModule,
    CronModule,
    ArticleModule,
    ArtistModule,
    AssetModule,
    CommentModule,
    NotificationModule,
    OtpModule,
    UserModule,
  ],
})
export class MainModule {}
