import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { StorageAssumeRoleConfig, StorageConfig } from '../storage.config';

describe('StorageConfig', () => {
  it('should build public links from configured placeholders', () => {
    const config = new StorageConfig({
      conId: 'default',
      bucket: 'media',
      region: 'ap-southeast-1',
      namespace: 'public',
      linkFormat: 'https://<bucket>.cdn.<region>.example/<namespace>/<key>',
    } as StorageConfig);

    expect(config.buildLink('avatars/user.png')).toBe(
      'https://media.cdn.ap-southeast-1.example/public/avatars/user.png',
    );
  });

  it('should use endpoint as link format when linkFormat is omitted', () => {
    const config = new StorageConfig({
      conId: 'default',
      bucket: 'assets',
      endpoint: 'https://storage.example/<bucket>/<key>',
    } as StorageConfig);

    expect(config.linkFormat).toBe('https://storage.example/<bucket>/<key>');
    expect(config.buildLink('article/image.png')).toBe('https://storage.example/assets/article/image.png');
  });

  it('should hydrate assume role config', () => {
    const config = new StorageConfig({
      conId: 'default',
      bucket: 'assets',
      assumeRole: {
        arn: 'arn:aws:iam::123456789012:role/storage',
        sessionName: 'JokTecStorage',
        durationSeconds: 900,
      },
    } as StorageConfig);

    expect(config.assumeRole).toBeInstanceOf(StorageAssumeRoleConfig);
    expect(config.assumeRole).toMatchObject({
      arn: 'arn:aws:iam::123456789012:role/storage',
      sessionName: 'JokTecStorage',
      durationSeconds: 900,
    });
  });
});
