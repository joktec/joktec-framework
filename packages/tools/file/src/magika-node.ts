import { ReadStream } from 'fs';
import { MagikaOptions } from './file.config';

export interface MagikaNode {
  identifyStream(stream: ReadStream, length: number): Promise<any>;
}

interface MagikaNodeConstructor {
  create(options?: MagikaOptions): Promise<MagikaNode>;
}

const magika = require('magika/node') as { MagikaNode: MagikaNodeConstructor };

export const MagikaNode: MagikaNodeConstructor = magika.MagikaNode;
