import { Inject, OnModuleInit, Type } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { set } from 'lodash';
import { Constructor, Entity, IBaseController, IBaseRequest, IBaseService, IPaginationResponse } from '../../models';
import { ConfigService, LogService } from '../../modules';
import { BaseValidationPipe } from '../../pipes';
import { getResourceCommand, normalizeResourceName } from '../shared/command.util';
import { MicroContext } from '../shared/micro.types';
import { IMicroControllerProps } from './client.types';

export type { IMicroControllerProps } from './client.types';
export type { MicroContext } from '../shared/micro.types';

export const ClientController = <T extends Entity, ID>(
  props: IMicroControllerProps<T>,
): Type<IBaseController<T, ID>> => {
  const dtoName = props.dtoName || props.dto.name;
  const nameSingular = normalizeResourceName(dtoName);
  const transport: Transport = props.transport || Transport.TCP;

  class DefaultQueryDto implements IBaseRequest<T> {}

  const queryDto: Constructor<any> = props.customDto?.queryDto || DefaultQueryDto;
  const createDto: Constructor<any> = props.customDto?.createDto || props.dto;
  const updatedDto: Constructor<any> = props.customDto?.updatedDto || createDto;

  class QueryDto extends queryDto {}
  class CreateDto extends createDto {}
  class UpdateDto extends updatedDto {}

  class Controller implements OnModuleInit {
    @Inject() public readonly configService: ConfigService;
    @Inject() public readonly logService: LogService;

    constructor(protected service: IBaseService<T, ID, IBaseRequest<T>>) {}

    onModuleInit() {
      this.logService.setContext(this.constructor.name);
      this.afterModuleInit();
    }

    protected afterModuleInit() {}

    @MessagePattern({ cmd: getResourceCommand(nameSingular, 'paginate') }, transport)
    async paginate(@Payload('req') req: QueryDto, @Ctx() context?: MicroContext): Promise<IPaginationResponse<T>> {
      void context;
      return this.service.paginate(req);
    }

    @MessagePattern({ cmd: getResourceCommand(nameSingular, 'detail') }, transport)
    async detail(
      @Payload('id') id: ID,
      @Payload('req') req: QueryDto = {} as QueryDto,
      @Ctx() context?: MicroContext,
    ): Promise<T> {
      void context;
      if (id) set(req, 'condition.id', id);
      return this.service.findOne(req);
    }

    @MessagePattern({ cmd: getResourceCommand(nameSingular, 'create') }, transport)
    async create(
      @Payload('dto') dto: CreateDto,
      @Payload('entity') entity: CreateDto,
      @Ctx() context?: MicroContext,
    ): Promise<T> {
      void context;
      const payload = await new BaseValidationPipe().transform(dto || entity, {
        type: 'body',
        metatype: CreateDto,
        data: 'dto',
      });
      return this.service.create(payload);
    }

    @MessagePattern({ cmd: getResourceCommand(nameSingular, 'update') }, transport)
    async update(
      @Payload('id') id: ID,
      @Payload('dto') dto: UpdateDto,
      @Payload('entity') entity: UpdateDto,
      @Ctx() context?: MicroContext,
    ): Promise<T> {
      void context;
      const payload = await new BaseValidationPipe({ skipMissingProperties: true }).transform(dto || entity, {
        type: 'body',
        metatype: UpdateDto,
        data: 'dto',
      });
      return this.service.update(id, payload);
    }

    @MessagePattern({ cmd: getResourceCommand(nameSingular, 'delete') }, transport)
    async delete(@Payload('id') id: ID, @Ctx() context?: MicroContext): Promise<T> {
      void context;
      return this.service.delete(id);
    }
  }

  return Controller as unknown as Type<IBaseController<T, ID>>;
};
