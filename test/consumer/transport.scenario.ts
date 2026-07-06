jest.mock('ioredis', () => {
  const actual = jest.requireActual('ioredis');
  return actual.default || actual;
});

import fs from 'fs';
import path from 'path';

import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import yaml from 'js-yaml';
import mongoose from 'mongoose';
import { firstValueFrom, timeout } from 'rxjs';

import {
  consumerPrefix,
  ManagedApp,
  microRuntimeDependencies,
  preflightDependencies,
  repoRoot,
  startApp,
  stopApp,
} from './helpers';

interface MicroConfig {
  mongo: Array<{
    conId?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    options?: Record<string, any>;
  }>;
}

const loadMicroConfig = (): MicroConfig => {
  const configPath = path.join(repoRoot, 'apps/example-micro/config.yml');
  return yaml.load(fs.readFileSync(configPath, 'utf8')) as MicroConfig;
};

const createMongoConnection = async (): Promise<mongoose.Connection> => {
  const config = loadMicroConfig();
  const mongoConfig = config.mongo.find(item => item.conId === 'default') || config.mongo[0];
  const uri = `mongodb://${mongoConfig.host || 'localhost'}:${mongoConfig.port || 27017}/${mongoConfig.database}`;

  return mongoose
    .createConnection(uri, {
      ...(mongoConfig.options || {}),
      auth: mongoConfig.username ? { username: mongoConfig.username, password: mongoConfig.password } : undefined,
    })
    .asPromise();
};

describe('consumer micro transport scenario', () => {
  let micro: ManagedApp;
  let client: ClientProxy;
  let mongo: mongoose.Connection;
  const mongoIds: Record<string, mongoose.Types.ObjectId> = {};

  beforeAll(async () => {
    await preflightDependencies(microRuntimeDependencies);
    micro = await startApp('micro');
    client = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        host: 'localhost',
        port: 6379,
        password: 'root',
        db: 0,
      },
    });
    await client.connect();
    mongo = await createMongoConnection();
  });

  afterAll(async () => {
    if (mongo) {
      await Promise.all(
        ['articles', 'comments', 'users'].map(collection => {
          return mongo
            .collection(collection)
            .deleteMany({ _id: { $in: Object.values(mongoIds) } })
            .catch(() => undefined);
        }),
      );
      await mongo.close().catch(() => undefined);
    }
    await client?.close();
    await stopApp(micro);
  });

  it('should call Cron.refresh over Redis transport', async () => {
    const response = await firstValueFrom(client.send({ cmd: 'Cron.refresh' }, {}).pipe(timeout(20000)));

    expect(response).toEqual(expect.objectContaining({ success: true }));
  });

  it('should create, read, list, update, and delete nested article comments over Redis transport', async () => {
    const now = new Date();
    Object.assign(mongoIds, {
      user: new mongoose.Types.ObjectId(),
      article: new mongoose.Types.ObjectId(),
    });

    await mongo.collection('users').insertOne({
      _id: mongoIds.user,
      email: `${consumerPrefix}-transport@example.test`,
      nickname: `${consumerPrefix}-transport`,
      role: 'biz',
      avatar: null,
      status: 'activated',
      providers: [],
      profile: {},
      wallet: {},
      rank: {},
      keywords: [],
      config: { language: 'en', timezone: 'Asia/Bangkok', notifications: [], topics: [] },
      artistIds: [],
      profileBadgeIds: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    await mongo.collection('articles').insertOne({
      _id: mongoIds.article,
      title: `${consumerPrefix}-transport`,
      subhead: '',
      description: 'Consumer transport article',
      type: 'default',
      postedAt: now,
      modifiedAt: now,
      files: [],
      status: 'activated',
      summary: {},
      rawHashtags: [],
      resource: 'default',
      resourceId: null,
      authorId: mongoIds.user,
      parentId: null,
      artistIds: [],
      tagIds: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    const created = await firstValueFrom(
      client
        .send(
          { cmd: 'Article.Comment.create' },
          {
            parentId: String(mongoIds.article),
            dto: {
              articleId: String(mongoIds.article),
              authorId: String(mongoIds.user),
              parentId: null,
              content: `${consumerPrefix}-comment`,
            },
          },
        )
        .pipe(timeout(20000)),
    );
    mongoIds.comment = new mongoose.Types.ObjectId(created._id);

    expect(created).toEqual(
      expect.objectContaining({
        content: `${consumerPrefix}-comment`,
        articleId: String(mongoIds.article),
        authorId: String(mongoIds.user),
      }),
    );

    const detail = await firstValueFrom(
      client
        .send(
          { cmd: 'Article.Comment.detail' },
          {
            parentId: String(mongoIds.article),
            childId: String(mongoIds.comment),
            req: {},
          },
        )
        .pipe(timeout(20000)),
    );
    expect(detail).toEqual(expect.objectContaining({ _id: String(mongoIds.comment) }));

    const page = await firstValueFrom(
      client
        .send(
          { cmd: 'Article.Comment.paginate' },
          {
            parentId: String(mongoIds.article),
            req: { limit: 10, page: 1 },
          },
        )
        .pipe(timeout(20000)),
    );
    expect(page.items).toEqual(expect.arrayContaining([expect.objectContaining({ _id: String(mongoIds.comment) })]));

    const updated = await firstValueFrom(
      client
        .send(
          { cmd: 'Article.Comment.update' },
          {
            parentId: String(mongoIds.article),
            childId: String(mongoIds.comment),
            dto: { content: `${consumerPrefix}-comment-updated` },
          },
        )
        .pipe(timeout(20000)),
    );
    expect(updated).toEqual(expect.objectContaining({ content: `${consumerPrefix}-comment-updated` }));

    const deleted = await firstValueFrom(
      client
        .send(
          { cmd: 'Article.Comment.delete' },
          {
            parentId: String(mongoIds.article),
            childId: String(mongoIds.comment),
          },
        )
        .pipe(timeout(20000)),
    );
    expect(deleted).toEqual(expect.objectContaining({ _id: String(mongoIds.comment) }));
    delete mongoIds.comment;
  });
});
