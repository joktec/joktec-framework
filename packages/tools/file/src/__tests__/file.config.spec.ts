import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { FileConfig, MagikaConfig } from '../file.config';

describe('FileConfig', () => {
  it('should normalize directory with a trailing slash', () => {
    const config = new FileConfig({ conId: 'default', directory: '/tmp/uploads' } as FileConfig);

    expect(config.directory).toBe('/tmp/uploads/');
  });

  it('should hydrate magika config and map legacy config aliases', () => {
    const config = new FileConfig({
      conId: 'default',
      directory: '/tmp/uploads',
      magika: {
        modelPath: '/models/model.json',
        configPath: '/models/config.json',
      },
    } as FileConfig);

    expect(config.magika).toBeInstanceOf(MagikaConfig);
    expect(config.magika.toOptions()).toEqual({
      modelURL: undefined,
      modelPath: '/models/model.json',
      modelConfigURL: undefined,
      modelConfigPath: '/models/config.json',
    });
  });
});
