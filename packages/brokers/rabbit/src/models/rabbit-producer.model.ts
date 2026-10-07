import type { Options } from 'amqplib';

export interface RabbitProduceOptions extends Options.Publish {
  channelKey?: string;
}

export interface RabbitProduceDecoratorOptions extends RabbitProduceOptions {
  useEnv?: boolean;
}

export interface RabbitProduceResult {
  success: number;
  failed: number;
  error?: Error;
}
