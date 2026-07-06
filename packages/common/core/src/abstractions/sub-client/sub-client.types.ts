import { Transport } from '@nestjs/microservices';
import { Clazz, Constructor, DeepPartial, Entity, IBaseRequest } from '../../models';

export interface ISubMicroControllerProps<
  TParent extends Entity,
  TChild extends Entity,
  REQ extends IBaseRequest<TChild> = IBaseRequest<TChild>,
> {
  parentDto: Constructor<TParent>;
  dto: Constructor<TChild>;
  dtoName?: string;
  parentDtoName?: string;
  transport?: Transport;
  customDto?: {
    queryDto?: Constructor<REQ> | Clazz;
    createDto?: Constructor<DeepPartial<TChild>> | Clazz;
    updatedDto?: Constructor<DeepPartial<TChild>> | Clazz;
  };
}

export interface ISubMicroClientProps<TParent extends Entity, TChild extends Entity> {
  parentDto: Constructor<TParent>;
  dto: Constructor<TChild>;
  dtoName?: string;
  parentDtoName?: string;
}
