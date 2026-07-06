import { KafkaContext, MqttContext, NatsContext, RedisContext, RmqContext, TcpContext } from '@nestjs/microservices';

export type MicroContext = TcpContext | RedisContext | NatsContext | MqttContext | RmqContext | KafkaContext;
