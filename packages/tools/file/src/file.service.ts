import { AbstractClientService, DEFAULT_CON_ID, Injectable } from '@joktec/core';
import fs from 'fs-extra';
import { FileClient } from './file.client';
import { FileConfig } from './file.config';
import { FileMetric } from './file.metric';
import { calculateSize, removePath } from './file.utils';
import { MagikaNode } from './magika-node';

@Injectable()
export class FileService extends AbstractClientService<FileConfig, MagikaNode> implements FileClient {
  constructor() {
    super('file', FileConfig);
  }

  async init(config: FileConfig): Promise<MagikaNode> {
    return MagikaNode.create(config.magika?.toOptions());
  }

  async start(client: MagikaNode, conId: string = DEFAULT_CON_ID): Promise<void> {
    const { directory } = this.getConfig(conId);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  async stop(client: MagikaNode): Promise<void> {
    // Do nothing
  }

  @FileMetric()
  async getSize(conId: string = DEFAULT_CON_ID): Promise<number> {
    const { directory } = this.getConfig(conId);
    return calculateSize(directory);
  }

  @FileMetric()
  async deleteDir(mkdir: boolean = false, conId: string = DEFAULT_CON_ID): Promise<void> {
    const { directory } = this.getConfig(conId);
    await removePath(directory);
    if (mkdir) fs.mkdirSync(directory, { recursive: true });
  }

  @FileMetric()
  async getModifiedFile(start: Date | string, end: Date | string, conId: string = DEFAULT_CON_ID): Promise<any> {
    const { directory } = this.getConfig(conId);
    const filenames = await fs.promises.readdir(directory);

    const files = filenames?.reduce((files, filename) => {
      const mtime = new Date(fs.statSync(directory + filename).mtime);
      if (mtime > new Date(start) && mtime < new Date(end)) {
        files.push({ [filename]: mtime.toISOString() });
      }
      return files;
    }, []);

    return { files, total: files.length };
  }

  @FileMetric()
  async readFile(filename: string, conId: string = DEFAULT_CON_ID): Promise<string> {
    const { directory } = this.getConfig(conId);
    return fs.promises.readFile(directory + filename, 'utf8');
  }

  @FileMetric()
  async appendFile(
    filename: string,
    content: string,
    separator: string = ' ',
    conId: string = DEFAULT_CON_ID,
  ): Promise<void> {
    const { directory } = this.getConfig(conId);
    return fs.promises.appendFile(directory + filename, content + separator);
  }

  @FileMetric()
  async deleteFile(filename: string, conId: string = DEFAULT_CON_ID): Promise<void> {
    const { directory } = this.getConfig(conId);
    return fs.promises.unlink(directory + filename);
  }

  @FileMetric()
  async deleteFiles(start: Date | string, end: Date | string, conId: string = DEFAULT_CON_ID) {
    const { directory } = this.getConfig(conId);
    const filenames = await fs.promises.readdir(directory);

    const files = filenames?.reduce((files, filename) => {
      const mtime = new Date(fs.statSync(directory + filename).mtime);
      if (mtime > new Date(start) && mtime < new Date(end)) {
        files.push(filename);
      }
      return files;
    }, []);

    await Promise.all(files?.map(file => fs.promises.unlink(directory + file)));
  }
}
