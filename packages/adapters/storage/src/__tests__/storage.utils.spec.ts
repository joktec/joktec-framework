import { describe, expect, it, afterEach, jest } from '@jest/globals';
import { BadRequestException } from '@joktec/core';
import { getMetadata, isImage, parseKey } from '../storage.utils';

describe('storage utils', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should parse object keys from links and relative paths', () => {
    expect(parseKey('https://cdn.example.com/media/folder%20name/avatar.png', 'media')).toBe('folder name/avatar.png');
    expect(parseKey('folder/avatar.png', 'media')).toBe('folder/avatar.png');
  });

  it('should reject links that do not contain the expected bucket', () => {
    expect(() => parseKey('https://cdn.example.com/other/avatar.png', 'media')).toThrow(BadRequestException);
  });

  it('should detect common image signatures', () => {
    expect(isImage(Buffer.from('ffd8ff00', 'hex'))).toBe(true);
    expect(isImage(Buffer.from('89504e470d0a1a0a', 'hex'))).toBe(true);
    expect(isImage(Buffer.from('plain text'))).toBe(false);
  });

  it('should generate encoded metadata with date prefix and detected content type', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-03T04:05:06.000Z'));

    expect(getMetadata('my image.png', 'image/png', 'date')).toEqual({
      filename: 'my%20image_1770091506.png',
      prefix: '2026/2/3',
      contentType: 'image/png',
    });
  });
});
