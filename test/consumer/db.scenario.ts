import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

import yaml from 'js-yaml';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import {
  consumerPrefix,
  gatewayRuntimeDependencies,
  ManagedApp,
  microRuntimeDependencies,
  preflightDependencies,
  requestJson,
  repoRoot,
  startApp,
  stopApp,
  unwrapData,
} from './helpers';

const objectIdPattern = /^[0-9a-f]{24}$/i;

interface GatewayConfig {
  jwt: {
    secretKey: string;
    expired: string;
  };
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

const loadGatewayConfig = (): GatewayConfig => {
  const configPath = path.join(repoRoot, 'apps/example-gateway/config.yml');
  return yaml.load(fs.readFileSync(configPath, 'utf8')) as GatewayConfig;
};

const createMongoConnection = async (): Promise<mongoose.Connection> => {
  const config = loadGatewayConfig();
  const mongoConfig = config.mongo.find(item => item.conId === 'default') || config.mongo[0];
  const uri = `mongodb://${mongoConfig.host || 'localhost'}:${mongoConfig.port || 27017}/${mongoConfig.database}`;
  return mongoose.createConnection(uri, {
    ...(mongoConfig.options || {}),
    auth: mongoConfig.username ? { username: mongoConfig.username, password: mongoConfig.password } : undefined,
  }).asPromise();
};

const createObjectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

const hasBinaryLeakShape = (value: any): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.type === 'Buffer' && Array.isArray(value.data)) return true;
  if (value.$binary || value._bsontype === 'ObjectId') return true;
  if (value.buffer && typeof value.buffer === 'object') return true;
  return false;
};

const findUnsafeJsonPaths = (value: any, pathName = '$'): string[] => {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    return /[\u0000-\u001F]/.test(value) ? [`${pathName} contains control/binary characters`] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findUnsafeJsonPaths(item, `${pathName}[${index}]`));
  }
  if (typeof value === 'object') {
    if (hasBinaryLeakShape(value)) return [`${pathName} has serialized BSON/Buffer shape`];
    return Object.entries(value).flatMap(([key, item]) => findUnsafeJsonPaths(item, `${pathName}.${key}`));
  }
  return [];
};

const expectMongoIdString = (value: unknown, pathName: string): void => {
  expect({ [pathName]: value }).toEqual({ [pathName]: expect.any(String) });
  expect({ [pathName]: String(value) }).toEqual({ [pathName]: expect.stringMatching(objectIdPattern) });
};

const expectCleanMongoJson = (value: any): void => {
  expect(findUnsafeJsonPaths(value)).toEqual([]);
};

describe('consumer database scenario', () => {
  let micro: ManagedApp;
  let gateway: ManagedApp;
  let mongo: mongoose.Connection;
  let profileBadgeId: string | undefined;
  let creatorInsightId: string | undefined;
  let creatorMilestoneId: string | undefined;
  const mongoIds: Record<string, mongoose.Types.ObjectId> = {};
  let authHeader: string;

  beforeAll(async () => {
    await preflightDependencies([...microRuntimeDependencies, ...gatewayRuntimeDependencies]);
    micro = await startApp('micro');
    gateway = await startApp('gateway');
    mongo = await createMongoConnection();
  });

  afterAll(async () => {
    if (mongo) {
      const collections = ['articles', 'artists', 'categories', 'comments', 'sessions', 'tags', 'users'];
      await Promise.all(
        collections.map(collection => {
          return mongo
            .collection(collection)
            .deleteMany({ $or: [{ _id: { $in: Object.values(mongoIds) } }, { title: consumerPrefix }] })
            .catch(() => undefined);
        }),
      );
      await mongo.close().catch(() => undefined);
    }
    if (profileBadgeId) {
      await requestJson(gateway.baseUrl, `/profile-badges/${profileBadgeId}`, { method: 'DELETE' }).catch(
        () => undefined,
      );
    }
    if (creatorMilestoneId) {
      await requestJson(gateway.baseUrl, `/creator-milestones/${creatorMilestoneId}`, { method: 'DELETE' }).catch(
        () => undefined,
      );
    }
    if (creatorInsightId) {
      await requestJson(gateway.baseUrl, `/creator-insights/${creatorInsightId}`, { method: 'DELETE' }).catch(
        () => undefined,
      );
    }
    await stopApp(gateway);
    await stopApp(micro);
  });

  async function seedMongoPopulateGraph(): Promise<void> {
    const config = loadGatewayConfig();
    const now = new Date();
    const tokenId = randomUUID();
    Object.assign(mongoIds, {
      user: createObjectId(),
      session: createObjectId(),
      category: createObjectId(),
      artist: createObjectId(),
      tag: createObjectId(),
      parentArticle: createObjectId(),
      article: createObjectId(),
      comment: createObjectId(),
    });

    const user = {
      _id: mongoIds.user,
      email: `${consumerPrefix}@example.test`,
      nickname: consumerPrefix,
      role: 'biz',
      avatar: null,
      status: 'activated',
      providers: [{ type: 'default', providerId: consumerPrefix, verifiedAt: now }],
      profile: {},
      wallet: { charge: 10, revenue: 20, bonus: 30, event: 40 },
      rank: { score: 1, arrangeTop: 0, arrangeRank: 0 },
      keywords: [],
      config: { language: 'en', timezone: 'Asia/Bangkok', notifications: [], topics: ['default'] },
      registeredAt: now,
      artistIds: [mongoIds.artist],
      profileBadgeIds: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const commonArticle = {
      subhead: consumerPrefix,
      description: `Consumer populate ${consumerPrefix}`,
      type: 'feed',
      postedAt: now,
      modifiedAt: now,
      files: [
        {
          caption: consumerPrefix,
          type: 'image',
          url: 'http://127.0.0.1:9000/dispatch/consumer.png',
          preview: 'http://127.0.0.1:9000/dispatch/consumer-preview.png',
          mimetype: 'image/png',
          width: 100,
          height: 100,
          ratio: 1,
          seq: 1,
          elements: [],
          status: 'activated',
        },
      ],
      status: 'activated',
      summary: { like: 0, view: 0, share: 0, download: 0, comment: 0 },
      resource: 'default',
      resourceId: null,
      authorId: mongoIds.user,
      artistIds: [mongoIds.artist],
      tagIds: [mongoIds.tag],
      rawHashtags: ['consumer'],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await mongo.collection('users').insertOne(user);
    await mongo.collection('categories').insertOne({
      _id: mongoIds.category,
      title: { ko: consumerPrefix, en: consumerPrefix },
      type: 'default',
      image: null,
      seq: 1,
      parentId: null,
      status: 'activated',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    await mongo.collection('artists').insertOne({
      _id: mongoIds.artist,
      name: { ko: consumerPrefix, en: consumerPrefix },
      type: 'default',
      gender: 'unknown',
      avatar: null,
      status: 'activated',
      hiddenText: consumerPrefix,
      categoryIds: [mongoIds.category],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    await mongo.collection('tags').insertOne({
      _id: mongoIds.tag,
      title: consumerPrefix,
      hiddenText: { ko: consumerPrefix, en: consumerPrefix },
      status: 'activated',
      authorId: mongoIds.user,
      parentId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    await mongo.collection('articles').insertMany([
      {
        _id: mongoIds.parentArticle,
        ...commonArticle,
        title: `${consumerPrefix}-parent`,
        parentId: null,
      },
      {
        _id: mongoIds.article,
        ...commonArticle,
        title: consumerPrefix,
        parentId: mongoIds.parentArticle,
      },
    ]);
    await mongo.collection('comments').insertOne({
      _id: mongoIds.comment,
      articleId: mongoIds.article,
      authorId: mongoIds.user,
      parentId: null,
      content: consumerPrefix,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    await mongo.collection('sessions').insertOne({
      _id: mongoIds.session,
      tokenId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      lastActiveAt: now,
      locale: 'en',
      topics: [],
      status: 'activated',
      userType: 'User',
      userRefId: mongoIds.user,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    const accessToken = jwt.sign({ type: 'ACCESS', sub: String(mongoIds.user), jti: tokenId }, config.jwt.secretKey, {
      expiresIn: '1h',
    });
    authHeader = `Bearer ${accessToken}`;
  }

  it('should create, read, update, list, and delete a MySQL-backed profile badge through gateway', async () => {
    const code = `consumer-${consumerPrefix}`;
    const name = `Creator ${consumerPrefix}`;
    const updatedName = `${consumerPrefix}-updated`;

    const createResponse = await requestJson(gateway.baseUrl, '/profile-badges', {
      method: 'POST',
      body: JSON.stringify({
        code,
        name,
        icon: 'spark',
        color: '#33AAFF',
        minFollowers: 10,
        minPosts: 3,
        sortOrder: 1,
        active: true,
      }),
    });
    const created = unwrapData(createResponse);
    profileBadgeId = created.id;

    expect(created).toEqual(expect.objectContaining({ id: expect.any(String), code, name }));

    const detailResponse = await requestJson(gateway.baseUrl, `/profile-badges/${profileBadgeId}`);
    expect(unwrapData(detailResponse)).toEqual(expect.objectContaining({ id: profileBadgeId, code, name }));

    const updateResponse = await requestJson(gateway.baseUrl, `/profile-badges/${profileBadgeId}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: profileBadgeId,
        code,
        name: updatedName,
        icon: 'spark',
        color: '#33AAFF',
        minFollowers: 10,
        minPosts: 3,
        sortOrder: 1,
        active: true,
      }),
    });
    expect(unwrapData(updateResponse)).toEqual(expect.objectContaining({ id: profileBadgeId, name: updatedName }));

    const listResponse = await requestJson(
      gateway.baseUrl,
      `/profile-badges?limit=10&condition[code]=${encodeURIComponent(code)}`,
    );
    const list = unwrapData(listResponse);
    expect(list.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: profileBadgeId })]));

    await requestJson(gateway.baseUrl, `/profile-badges/${profileBadgeId}`, { method: 'DELETE' });
    profileBadgeId = undefined;
  });

  it('should persist MySQL json object, json class, and json class-array columns through gateway', async () => {
    const userId = randomUUID();

    const createResponse = await requestJson(gateway.baseUrl, '/creator-insights', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        sourceProfileRef: `profile-${consumerPrefix}`,
        rawSnapshot: {
          source: 'consumer-test',
          runId: consumerPrefix,
        },
        preference: {
          theme: 'dark',
          publicProfile: true,
        },
        metrics: [
          { key: 'followers', value: 120 },
          { key: 'posts', value: 8 },
        ],
        score: 88,
        active: true,
      }),
    });
    const created = unwrapData(createResponse);
    creatorInsightId = created.id;

    expect(created).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        userId,
        preference: expect.objectContaining({ theme: 'dark', publicProfile: true }),
        metrics: expect.arrayContaining([expect.objectContaining({ key: 'followers', value: 120 })]),
      }),
    );

    const detailResponse = await requestJson(gateway.baseUrl, `/creator-insights/${creatorInsightId}`);
    expect(unwrapData(detailResponse)).toEqual(
      expect.objectContaining({
        id: creatorInsightId,
        rawSnapshot: expect.objectContaining({ runId: consumerPrefix }),
      }),
    );

    const listResponse = await requestJson(
      gateway.baseUrl,
      `/creator-insights?limit=10&condition[userId]=${encodeURIComponent(userId)}`,
    );
    expect(unwrapData(listResponse).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: creatorInsightId })]),
    );

    await requestJson(gateway.baseUrl, `/creator-insights/${creatorInsightId}`, { method: 'DELETE' });
    creatorInsightId = undefined;
  });

  it('should persist a MySQL relation-backed creator milestone through gateway', async () => {
    const userId = randomUUID();
    const insightResponse = await requestJson(gateway.baseUrl, '/creator-insights', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        sourceProfileRef: `milestone-profile-${consumerPrefix}`,
        rawSnapshot: { source: 'consumer-milestone-test', runId: consumerPrefix },
        preference: { theme: 'light', publicProfile: false },
        metrics: [{ key: 'views', value: 32 }],
        score: 64,
        active: true,
      }),
    });
    const insight = unwrapData(insightResponse);
    creatorInsightId = insight.id;

    const code = `first-100-${consumerPrefix}`;
    const milestoneResponse = await requestJson(gateway.baseUrl, '/creator-milestones', {
      method: 'POST',
      body: JSON.stringify({
        insightId: creatorInsightId,
        code,
        title: 'Reach first 100 followers',
        description: 'Example social milestone stored in a relational table.',
        targetCount: 100,
        progressCount: 40,
        status: 'active',
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    const milestone = unwrapData(milestoneResponse);
    creatorMilestoneId = milestone.id;

    expect(milestone).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        insightId: creatorInsightId,
        code,
        targetCount: 100,
        progressCount: 40,
        status: 'active',
      }),
    );

    const detailResponse = await requestJson(
      gateway.baseUrl,
      `/creator-milestones/${creatorMilestoneId}?populate[insight]=*`,
    );
    const detail = unwrapData(detailResponse);
    expect(detail).toEqual(
      expect.objectContaining({
        id: creatorMilestoneId,
        insightId: creatorInsightId,
        version: expect.any(Number),
        insight: expect.objectContaining({ id: creatorInsightId, userId }),
      }),
    );

    const updateResponse = await requestJson(gateway.baseUrl, `/creator-milestones/${creatorMilestoneId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...detail,
        progressCount: 100,
        status: 'completed',
        completedAt: new Date().toISOString(),
      }),
    });
    expect(unwrapData(updateResponse)).toEqual(
      expect.objectContaining({
        id: creatorMilestoneId,
        progressCount: 100,
        status: 'completed',
      }),
    );

    const listResponse = await requestJson(
      gateway.baseUrl,
      `/creator-milestones?limit=10&condition[insightId]=${encodeURIComponent(creatorInsightId)}`,
    );
    expect(unwrapData(listResponse).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: creatorMilestoneId, code })]),
    );

    await requestJson(gateway.baseUrl, `/creator-milestones/${creatorMilestoneId}`, { method: 'DELETE' });
    creatorMilestoneId = undefined;

    await requestJson(gateway.baseUrl, `/creator-insights/${creatorInsightId}`, { method: 'DELETE' });
    creatorInsightId = undefined;
  });

  it('should return clean JSON for Mongo populate and deep populate responses through gateway', async () => {
    await seedMongoPopulateGraph();

    const query = [
      'populate[author][populate][artists][populate][categories]=*',
      'populate[author][populate][artists][populate][articles][populate][author]=*',
      'populate[artists][populate][categories]=*',
      'populate[artists][populate][articles][populate][author]=*',
      'populate[tags][populate][author]=*',
      'populate[parent][populate][tags][populate][author]=*',
    ].join('&');
    const response = await requestJson(gateway.baseUrl, `/articles/${mongoIds.article}?${query}`, {
      headers: { authorization: authHeader },
    });
    const article = unwrapData(response);

    expectCleanMongoJson(article);
    expectMongoIdString(article._id, 'article._id');
    expectMongoIdString(article.authorId, 'article.authorId');
    expectMongoIdString(article.author._id, 'article.author._id');
    expectMongoIdString(article.artists[0]._id, 'article.artists[0]._id');
    expectMongoIdString(article.artists[0].categories[0]._id, 'article.artists[0].categories[0]._id');
    expectMongoIdString(article.artists[0].articles[0]._id, 'article.artists[0].articles[0]._id');
    expectMongoIdString(article.artists[0].articles[0].author._id, 'article.artists[0].articles[0].author._id');
    expectMongoIdString(article.tags[0]._id, 'article.tags[0]._id');
    expectMongoIdString(article.tags[0].author._id, 'article.tags[0].author._id');
    expectMongoIdString(article.parent._id, 'article.parent._id');
    expectMongoIdString(article.parent.tags[0].author._id, 'article.parent.tags[0].author._id');

    expect(article.author.thumbnail).toEqual(expect.any(String));
    expect(article.artists[0].thumbnail).toEqual(expect.any(String));
    expect(article.files[0].thumbnail).toEqual(expect.any(String));
    expect(article.hashtags).toEqual([consumerPrefix]);

    const listResponse = await requestJson(
      gateway.baseUrl,
      `/articles?limit=1&condition[title]=${encodeURIComponent(consumerPrefix)}&${query}`,
      { headers: { authorization: authHeader } },
    );
    const list = unwrapData(listResponse);

    expect(list.items).toHaveLength(1);
    expectCleanMongoJson(list.items[0]);
    expectMongoIdString(list.items[0]._id, 'list.items[0]._id');
    expectMongoIdString(list.items[0].artists[0]._id, 'list.items[0].artists[0]._id');
  });
});
