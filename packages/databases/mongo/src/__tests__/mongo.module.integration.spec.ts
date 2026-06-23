import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService, LogService } from '@joktec/core';
import { MongoSchema } from '../models';
import { MODEL_REGISTRY_KEY } from '../mongo.constant';
import { MongoModule } from '../mongo.module';
import { MongoService } from '../mongo.service';

class TestMongoSchema extends MongoSchema {
  title!: string;
}

@Global()
@Module({
  providers: [
    { provide: ConfigService, useValue: { get: jest.fn() } },
    { provide: LogService, useValue: { setContext: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
  ],
  exports: [ConfigService, LogService],
})
class TestSupportModule {}

describe('MongoModule integration', () => {
  it('should compile MongoModule.forRoot and expose model registry', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestSupportModule, MongoModule.forRoot({ conId: 'reporting', models: [TestMongoSchema] })],
    }).compile();

    expect(moduleRef.get(MongoService)).toBeDefined();
    expect(moduleRef.get(MODEL_REGISTRY_KEY, { strict: false })).toEqual({ reporting: [TestMongoSchema] });

    await moduleRef.close();
  });
});
