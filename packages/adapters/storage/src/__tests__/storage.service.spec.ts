import 'reflect-metadata';
import { describe, expect, it, jest } from '@jest/globals';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { StorageACL, StorageOperation } from '../models';
import { StorageConfig } from '../storage.config';
import { StorageMetricService } from '../storage.metric';
import { StorageService } from '../storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async () => 'https://signed.example/upload'),
}));

const createService = (send = jest.fn(async (_command: unknown) => ({}))) => {
  const service = new StorageService();
  const config = new StorageConfig({
    conId: 'default',
    bucket: 'media',
    region: 'ap-southeast-1',
    linkFormat: 'https://cdn.example/<bucket>/<key>',
  } as StorageConfig);

  jest.spyOn(service, 'getConfig').mockReturnValue(config);
  jest.spyOn(service, 'getClient').mockReturnValue({ send } as never);
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    ConfigService: createMock<ConfigService>({
      get: jest.fn().mockReturnValue(config),
    }),
    StorageMetricService: createMock<StorageMetricService>({
      track: jest.fn(),
    }),
    logService: createMock<LogService>(),
  });

  return { service, send, config };
};

describe('StorageService', () => {
  it('should return false for missing buckets and rethrow unexpected bucket errors', async () => {
    const notFound = Object.assign(new Error('not found'), { name: 'NotFound' });
    const send = jest
      .fn<(command: unknown) => Promise<unknown>>()
      .mockImplementationOnce(async () => {
        throw notFound;
      })
      .mockImplementationOnce(async () => {
        throw new Error('denied');
      });
    const { service } = createService(send);

    await expect(service.bucketExists('media')).resolves.toBe(false);
    await expect(service.bucketExists('media')).rejects.toThrow('denied');
    expect(send).toHaveBeenNthCalledWith(1, expect.any(HeadBucketCommand));
  });

  it('should create a bucket only when it does not already exist', async () => {
    const send = jest
      .fn<(command: unknown) => Promise<unknown>>()
      .mockImplementationOnce(async () => {
        throw Object.assign(new Error('missing'), { name: 'NotFound' });
      })
      .mockImplementationOnce(async () => ({ Location: '/media' }));
    const { service } = createService(send);

    await service.makeBucket('media');

    expect(send).toHaveBeenNthCalledWith(1, expect.any(HeadBucketCommand));
    expect(send).toHaveBeenNthCalledWith(2, expect.any(CreateBucketCommand));
  });

  it('should upload files using inferred content type and configured link format', async () => {
    const send = jest.fn(async (_command: unknown) => ({ ETag: 'etag-1' }));
    const { service } = createService(send);

    await expect(
      service.upload({
        file: Buffer.from('hello'),
        filename: 'avatar.png',
        prefix: 'users',
      }),
    ).resolves.toEqual({
      key: 'users/avatar.png',
      link: 'https://cdn.example/media/users/avatar.png',
      eTag: 'etag-1',
      contentType: 'image/png',
    });

    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command.input).toMatchObject({
      ACL: StorageACL.PUBLIC_READ,
      Bucket: 'media',
      Key: 'users/avatar.png',
      ContentType: 'image/png',
    });
  });

  it('should download files after parsing full object links', async () => {
    const body = Buffer.from('file');
    const send = jest.fn(async (_command: unknown) => ({ Body: body, ETag: 'etag-2', ContentType: 'text/plain' }));
    const { service } = createService(send);

    await expect(service.download({ key: 'https://cdn.example/media/docs/readme.txt' })).resolves.toEqual({
      key: 'docs/readme.txt',
      file: body,
      eTag: 'etag-2',
      contentType: 'text/plain',
    });

    const command = send.mock.calls[0][0] as GetObjectCommand;
    expect(command.input).toMatchObject({ Bucket: 'media', Key: 'docs/readme.txt' });
  });

  it('should create presigned URL requests for put operations', async () => {
    const { service } = createService();

    await expect(
      service.presigned({
        operation: StorageOperation.PUT_OBJECT,
        filename: 'avatar.jpg',
        prefix: 'users',
        expires: 120,
      }),
    ).resolves.toEqual({
      url: 'https://signed.example/upload',
      key: 'users/avatar.jpg',
      contentType: 'image/jpeg',
    });

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(PutObjectCommand),
      expect.objectContaining({ expiresIn: 120 }),
    );
  });

  it('should list objects with inferred content type metadata', async () => {
    const send = jest.fn(async (_command: unknown) => ({
      Contents: [
        { Key: 'docs/readme.txt', ETag: 'etag-3', Size: 10, LastModified: new Date('2026-01-01T00:00:00.000Z') },
      ],
    }));
    const { service } = createService(send);

    await expect(service.listObjects({ prefix: 'docs' })).resolves.toEqual([
      {
        key: 'docs/readme.txt',
        eTag: 'etag-3',
        size: 10,
        lastModified: new Date('2026-01-01T00:00:00.000Z'),
        contentType: 'text/plain',
      },
    ]);
    expect(send.mock.calls[0][0]).toBeInstanceOf(ListObjectsCommand);
  });
});
