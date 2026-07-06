import { Inject, OnModuleInit, Type } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, Transport } from '@nestjs/microservices';
import {
  DeepPartial,
  Entity,
  IBaseRequest,
  IBaseSubController,
  IBaseSubService,
  IPaginationResponse,
} from '../../models';
import { ConfigService, LogService } from '../../modules';
import { BaseValidationPipe } from '../../pipes';
import { getSubResourceCommand, normalizeResourceName } from '../shared/command.util';
import { MicroContext } from '../shared/micro.types';
import { ISubMicroControllerProps } from './sub-client.types';

export type { ISubMicroControllerProps } from './sub-client.types';

export const SubClientController = <
  TParent extends Entity,
  TChild extends Entity,
  ParentID = string,
  ChildID = string,
  REQ extends IBaseRequest<TChild> = IBaseRequest<TChild>,
>(
  props: ISubMicroControllerProps<TParent, TChild, REQ>,
): Type<IBaseSubController<TParent, TChild, ParentID, ChildID, REQ>> => {
  const dtoName = props.dtoName || props.dto.name;
  const parentDtoName = props.parentDtoName || props.parentDto.name;
  const nameSingular = normalizeResourceName(dtoName);
  const parentNameSingular = normalizeResourceName(parentDtoName);
  const transport: Transport = props.transport || Transport.TCP;

  class DefaultQueryDto implements IBaseRequest<TChild> {}

  const queryDto = props.customDto?.queryDto || DefaultQueryDto;
  const createDto = props.customDto?.createDto || props.dto;
  const updatedDto = props.customDto?.updatedDto || createDto;

  class QueryDto extends queryDto {}
  class CreateDto extends createDto {}
  class UpdateDto extends updatedDto {}

  class Controller implements OnModuleInit {
    @Inject() public readonly configService: ConfigService;
    @Inject() public readonly logService: LogService;

    constructor(protected service: IBaseSubService<TParent, TChild, ParentID, ChildID, REQ>) {}

    onModuleInit() {
      this.logService.setContext(this.constructor.name);
      this.afterModuleInit();
    }

    protected afterModuleInit() {}

    @MessagePattern({ cmd: getSubResourceCommand(parentNameSingular, nameSingular, 'paginate') }, transport)
    async paginate(
      @Payload('parentId') parentId: ParentID,
      @Payload('req') req: QueryDto,
      @Ctx() context?: MicroContext,
    ): Promise<IPaginationResponse<TChild>> {
      void context;
      return this.service.paginate(parentId, req as REQ);
    }

    @MessagePattern({ cmd: getSubResourceCommand(parentNameSingular, nameSingular, 'detail') }, transport)
    async detail(
      @Payload('parentId') parentId: ParentID,
      @Payload('childId') childId: ChildID,
      @Payload('req') req: QueryDto = {} as QueryDto,
      @Ctx() context?: MicroContext,
    ): Promise<TChild> {
      void context;
      return this.service.findById(parentId, childId, req as REQ);
    }

    @MessagePattern({ cmd: getSubResourceCommand(parentNameSingular, nameSingular, 'create') }, transport)
    async create(
      @Payload('parentId') parentId: ParentID,
      @Payload('dto') dto: CreateDto,
      @Payload('entity') entity: CreateDto,
      @Ctx() context?: MicroContext,
    ): Promise<TParent | TChild> {
      void context;
      const payload = await new BaseValidationPipe().transform(dto || entity, {
        type: 'body',
        metatype: CreateDto,
        data: 'dto',
      });
      return this.service.create(parentId, payload as DeepPartial<TChild>);
    }

    @MessagePattern({ cmd: getSubResourceCommand(parentNameSingular, nameSingular, 'update') }, transport)
    async update(
      @Payload('parentId') parentId: ParentID,
      @Payload('childId') childId: ChildID,
      @Payload('dto') dto: UpdateDto,
      @Payload('entity') entity: UpdateDto,
      @Ctx() context?: MicroContext,
    ): Promise<TParent | TChild> {
      void context;
      const payload = await new BaseValidationPipe({ skipMissingProperties: true }).transform(dto || entity, {
        type: 'body',
        metatype: UpdateDto,
        data: 'dto',
      });
      return this.service.update(parentId, childId, payload as DeepPartial<TChild>);
    }

    @MessagePattern({ cmd: getSubResourceCommand(parentNameSingular, nameSingular, 'delete') }, transport)
    async delete(
      @Payload('parentId') parentId: ParentID,
      @Payload('childId') childId: ChildID,
      @Ctx() context?: MicroContext,
    ): Promise<TParent | TChild | null> {
      void context;
      return this.service.delete(parentId, childId);
    }
  }

  return Controller as unknown as Type<IBaseSubController<TParent, TChild, ParentID, ChildID, REQ>>;
};
