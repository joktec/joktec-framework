import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { calculateSize, removePath } from '../file.utils';

describe('file utils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'joktec-file-utils-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('should calculate nested directory size', async () => {
    fs.writeFileSync(path.join(tempDir, 'a.txt'), 'hello');
    fs.mkdirSync(path.join(tempDir, 'nested'));
    fs.writeFileSync(path.join(tempDir, 'nested', 'b.txt'), 'world!');

    await expect(calculateSize(tempDir)).resolves.toBe(11);
  });

  it('should remove files and directories recursively', async () => {
    const nestedDir = path.join(tempDir, 'nested');
    fs.mkdirSync(nestedDir);
    fs.writeFileSync(path.join(nestedDir, 'a.txt'), 'hello');

    await expect(removePath(nestedDir)).resolves.toBe(true);
    await expect(fs.pathExists(nestedDir)).resolves.toBe(false);
    await expect(removePath(nestedDir)).resolves.toBe(false);
  });
});
