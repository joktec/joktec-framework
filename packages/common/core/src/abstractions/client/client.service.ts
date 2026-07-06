import { Inject, OnModuleInit, Type } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { MethodNotAllowedException } from '../../exceptions';
import { DeepPartial, Entity, IBaseRequest, IBaseService, IPaginationResponse } from '../../models';
import { ConfigService, JwtPayload, LogService } from '../../modules';
import { getResourceCommand, normalizeResourceName } from '../shared/command.util';
import { IMicroClientProps } from './client.types';

export type { IMicroClientProps } from './client.types';

export const ClientService = <T extends Entity, ID = string, REQ extends IBaseRequest<T> = IBaseRequest<T>>(
  props: IMicroClientProps<T>,
): Type<IBaseService<T, ID, REQ>> => {
  const dtoName = props.dtoName || props.dto.name;
  const nameSingular = normalizeResourceName(dtoName);

  class Service implements IBaseService<T, ID, REQ>, OnModuleInit {
    @Inject() public readonly configService: ConfigService;
    @Inject() public readonly logService: LogService;

    constructor(protected client: ClientProxy) {}

    onModuleInit() {
      this.logService.setContext(this.constructor.name);
      this.afterModuleInit();
    }

    protected afterModuleInit() {}

    async paginate(req: REQ): Promise<IPaginationResponse<T>> {
      const result = this.client.send<IPaginationResponse<T>>(
        { cmd: getResourceCommand(nameSingular, 'paginate') },
        { req },
      );
      return await firstValueFrom(result);
    }

    async find(req: REQ): Promise<T[]> {
      const data = await this.paginate(req);
      return data?.items || [];
    }

    async findOne(req: REQ = {} as REQ): Promise<T> {
      const id = req?.condition?.['id'];
      const result = this.client.send<T>({ cmd: getResourceCommand(nameSingular, 'detail') }, { id, req });
      return await firstValueFrom(result);
    }

    async create(entity: DeepPartial<T>, jwtPayload?: JwtPayload): Promise<T> {
      const result = this.client.send<T>(
        { cmd: getResourceCommand(nameSingular, 'create') },
        { dto: entity, entity, jwtPayload },
      );
      return await firstValueFrom(result);
    }

    async update(id: ID, entity: DeepPartial<T>, jwtPayload?: JwtPayload): Promise<T> {
      const result = this.client.send<T>(
        { cmd: getResourceCommand(nameSingular, 'update') },
        { id, dto: entity, entity, jwtPayload },
      );
      return await firstValueFrom(result);
    }

    async delete(id: ID, jwtPayload?: JwtPayload): Promise<T> {
      const result = this.client.send<T>({ cmd: getResourceCommand(nameSingular, 'delete') }, { id, jwtPayload });
      return await firstValueFrom(result);
    }

    async restore(id: ID, payload?: JwtPayload): Promise<T> {
      void id;
      void payload;
      throw new MethodNotAllowedException('Method not implemented.');
    }
  }

  return Service;
};
