import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Column, Entity as MysqlEntity, EntitySubscriberInterface, PrimaryGeneratedColumn } from 'typeorm';
import { ConfigService, LogService } from '@joktec/core';
import { MysqlModel } from '../models';
import { MODEL_REGISTRY_KEY, SUBSCRIBER_REGISTRY_KEY } from '../mysql.client';
import { MysqlModule } from '../mysql.module';
import { MysqlService } from '../mysql.service';

@MysqlEntity()
class TestMysqlEntity extends MysqlModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;
}

class TestMysqlSubscriber implements EntitySubscriberInterface<TestMysqlEntity> {}

@Global()
@Module({
  providers: [
    { provide: ConfigService, useValue: { get: jest.fn() } },
    { provide: LogService, useValue: { setContext: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
  ],
  exports: [ConfigService, LogService],
})
class TestSupportModule {}

describe('MysqlModule integration', () => {
  it('should compile MysqlModule.forRoot and expose model/subscriber registries', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TestSupportModule,
        MysqlModule.forRoot({
          conId: 'reporting',
          models: [TestMysqlEntity],
          subscribers: [TestMysqlSubscriber],
        }),
      ],
    }).compile();

    expect(moduleRef.get(MysqlService)).toBeDefined();
    expect(moduleRef.get(MODEL_REGISTRY_KEY, { strict: false })).toEqual({ reporting: [TestMysqlEntity] });
    expect(moduleRef.get(SUBSCRIBER_REGISTRY_KEY, { strict: false })).toEqual({
      reporting: [TestMysqlSubscriber],
    });

    await moduleRef.close();
  });
});
