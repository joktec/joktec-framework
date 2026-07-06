import { Inject, OnModuleInit, Type } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { DeepPartial, Entity, IBaseRequest, IBaseSubService, IPaginationResponse } from '../../models';
import { ConfigService, JwtPayload, LogService } from '../../modules';
import { getSubResourceCommand, normalizeResourceName } from '../shared/command.util';
import { ISubMicroClientProps } from './sub-client.types';

export type { ISubMicroClientProps } from './sub-client.types';

export const SubClientService = <
  TParent extends Entity,
  TChild extends Entity,
  ParentID = string,
  ChildID = string,
  REQ extends IBaseRequest<TChild> = IBaseRequest<TChild>,
>(
  props: ISubMicroClientProps<TParent, TChild>,
): Type<IBaseSubService<TParent, TChild, ParentID, ChildID, REQ>> => {
  const dtoName = props.dtoName || props.dto.name;
  const parentDtoName = props.parentDtoName || props.parentDto.name;
  const nameSingular = normalizeResourceName(dtoName);
  const parentNameSingular = normalizeResourceName(parentDtoName);

  class Service implements IBaseSubService<TParent, TChild, ParentID, ChildID, REQ>, OnModuleInit {
    @Inject() public readonly configService: ConfigService;
    @Inject() public readonly logService: LogService;

    constructor(protected client: ClientProxy) {}

    onModuleInit() {
      this.logService.setContext(this.constructor.name);
      this.afterModuleInit();
    }

    protected afterModuleInit() {}

    async paginate(parentId: ParentID, req: REQ): Promise<IPaginationResponse<TChild>> {
      const result = this.client.send<IPaginationResponse<TChild>>(
        { cmd: getSubResourceCommand(parentNameSingular, nameSingular, 'paginate') },
        { parentId, req },
      );
      return await firstValueFrom(result);
    }

    async findById(parentId: ParentID, childId: ChildID, req: REQ = {} as REQ): Promise<TChild> {
      const result = this.client.send<TChild>(
        { cmd: getSubResourceCommand(parentNameSingular, nameSingular, 'detail') },
        { parentId, childId, req },
      );
      return await firstValueFrom(result);
    }

    async create(parentId: ParentID, entity: DeepPartial<TChild>, jwtPayload?: JwtPayload): Promise<TParent | TChild> {
      const result = this.client.send<TParent | TChild>(
        { cmd: getSubResourceCommand(parentNameSingular, nameSingular, 'create') },
        { parentId, dto: entity, entity, jwtPayload },
      );
      return await firstValueFrom(result);
    }

    async update(
      parentId: ParentID,
      childId: ChildID,
      entity: DeepPartial<TChild>,
      jwtPayload?: JwtPayload,
    ): Promise<TParent | TChild> {
      const result = this.client.send<TParent | TChild>(
        { cmd: getSubResourceCommand(parentNameSingular, nameSingular, 'update') },
        { parentId, childId, dto: entity, entity, jwtPayload },
      );
      return await firstValueFrom(result);
    }

    async delete(parentId: ParentID, childId: ChildID, jwtPayload?: JwtPayload): Promise<TParent | TChild | null> {
      const result = this.client.send<TParent | TChild | null>(
        { cmd: getSubResourceCommand(parentNameSingular, nameSingular, 'delete') },
        { parentId, childId, jwtPayload },
      );
      return await firstValueFrom(result);
    }
  }

  return Service;
};
