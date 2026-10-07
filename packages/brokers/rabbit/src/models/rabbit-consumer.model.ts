import { Clazz } from '@joktec/core';
import type { ConsumeMessage, Options } from 'amqplib';

export type ConsumerInfoType = {
  [key: string]: { serviceClazz: Clazz; serviceName: string; methodName: string }[];
};

export interface RabbitConsumeOptions extends Options.Consume {
  channelKey?: string;
  autoCommit?: boolean;
  prefetchMessages?: number;
  requeue?: boolean;
}

export interface RabbitConsumeDecoratorOptions extends RabbitConsumeOptions {
  durable?: boolean;
  useEnv?: boolean;
}

export interface RabbitMessage extends ConsumeMessage {}
