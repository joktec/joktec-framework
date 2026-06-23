import 'reflect-metadata';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMock } from '@golevelup/ts-jest';
import { ConfigService, LogService } from '@joktec/core';
import { FileConfig } from '../file.config';
import { FileMetricService } from '../file.metric';
import { FileService } from '../file.service';
import { MagikaNode } from '../magika-node';

const attachDecoratorServices = (service: FileService): FileService => {
  Object.assign(service as unknown as Record<string, unknown>, {
    PinoLogger: createMock<LogService>(),
    ConfigService: createMock<ConfigService>(),
    FileMetricService: createMock<FileMetricService>({
      duration: jest.fn().mockReturnValue(jest.fn()),
      trackStatus: jest.fn(),
    }),
  });
  return service;
};

describe('FileService', () => {
  let tempRoot: string;
  let directory: string;
  let config: FileConfig;
  let service: FileService;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'joktec-file-service-'));
    directory = path.join(tempRoot, 'uploads');
    config = new FileConfig({ conId: 'default', directory } as FileConfig);
    service = attachDecoratorServices(new FileService());
    jest.spyOn(service, 'getConfig').mockReturnValue(config);
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { force: true, recursive: true });
    jest.restoreAllMocks();
  });

  it('should create the configured directory on start', async () => {
    const magika = createMock<MagikaNode>({
      identifyStream: jest.fn<MagikaNode['identifyStream']>().mockResolvedValue({}),
    });

    await service.start(magika, 'default');

    expect(fs.existsSync(config.directory)).toBe(true);
  });

  it('should append, read, and delete files in the configured directory', async () => {
    fs.mkdirSync(config.directory, { recursive: true });

    await service.appendFile('events.log', 'first', '\n');
    await service.appendFile('events.log', 'second', '\n');

    await expect(service.readFile('events.log')).resolves.toBe('first\nsecond\n');

    await service.deleteFile('events.log');
    expect(fs.existsSync(path.join(config.directory, 'events.log'))).toBe(false);
  });

  it('should calculate size and recreate directory when deleting with mkdir option', async () => {
    fs.mkdirSync(config.directory, { recursive: true });
    fs.writeFileSync(path.join(config.directory, 'a.txt'), 'hello');
    fs.writeFileSync(path.join(config.directory, 'b.txt'), 'world!');

    await expect(service.getSize()).resolves.toBe(11);
    await service.deleteDir(true);

    expect(fs.existsSync(config.directory)).toBe(true);
    expect(fs.readdirSync(config.directory)).toEqual([]);
  });

  it('should list and delete files modified inside the requested range', async () => {
    fs.mkdirSync(config.directory, { recursive: true });
    const oldFile = path.join(config.directory, 'old.log');
    const currentFile = path.join(config.directory, 'current.log');
    fs.writeFileSync(oldFile, 'old');
    fs.writeFileSync(currentFile, 'current');
    fs.utimesSync(oldFile, new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-01T00:00:00.000Z'));
    fs.utimesSync(currentFile, new Date('2026-01-02T00:00:00.000Z'), new Date('2026-01-02T00:00:00.000Z'));

    await expect(service.getModifiedFile('2026-01-01T12:00:00.000Z', '2026-01-02T12:00:00.000Z')).resolves.toEqual({
      files: [{ 'current.log': '2026-01-02T00:00:00.000Z' }],
      total: 1,
    });

    await service.deleteFiles('2026-01-01T12:00:00.000Z', '2026-01-02T12:00:00.000Z');

    expect(fs.existsSync(oldFile)).toBe(true);
    expect(fs.existsSync(currentFile)).toBe(false);
  });
});
