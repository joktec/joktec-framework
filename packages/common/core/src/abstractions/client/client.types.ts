import { Transport } from '@nestjs/microservices';
import { Clazz, Constructor, DeepPartial, Entity, IBaseRequest } from '../../models';

export interface IMicroControllerProps<T extends Entity> {
  dto: Constructor<T>;
  dtoName?: string;
  transport?: Transport;
  customDto?: {
    queryDto?: Constructor<IBaseRequest<T>> | Clazz;
    createDto?: Constructor<DeepPartial<T>> | Clazz;
    updatedDto?: Constructor<DeepPartial<T>> | Clazz;
  };
}

export interface IMicroClientProps<T extends Entity> {
  dto: Constructor<T>;
  dtoName?: string;
}
