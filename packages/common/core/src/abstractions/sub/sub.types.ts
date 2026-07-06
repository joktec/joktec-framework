import { Clazz, Constructor, DeepPartial, Entity, IBaseRequest, IPaginationResponse } from '../../models';
import { ControllerPipeOptions, IControllerPaginateProps, IEndpointProps } from '../shared/endpoint.types';
import { ISubParamProps } from '../shared/param.util';

export interface ISubEndpointProps extends IEndpointProps {}

export interface ISubControllerProps<
  TParent extends Entity,
  TChild extends Entity,
  ParentID = string,
  ChildID = string,
  REQ extends IBaseRequest<TChild> = IBaseRequest<TChild>,
> extends IEndpointProps {
  parentDto: Constructor<TParent>;
  dto: Constructor<TChild>;
  dtoName?: string;
  parentDtoName?: string;
  tag?: string;
  parentParam?: ISubParamProps<ParentID>;
  childParam?: ISubParamProps<ChildID>;
  customDto?: {
    queryDto?: Constructor<REQ> | Clazz;
    createDto?: Constructor<DeepPartial<TChild>> | Clazz;
    updatedDto?: Constructor<DeepPartial<TChild>> | Clazz;
    paginationDto?: Constructor<IPaginationResponse<TChild>>;
    detailDto?: Constructor<TChild>;
    mutationDto?: Constructor<TParent | TChild>;
  };
  paginate?: IControllerPaginateProps;
  detail?: ISubEndpointProps;
  create?: ISubEndpointProps;
  update?: ISubEndpointProps;
  delete?: ISubEndpointProps;
  pipeOpts?: ControllerPipeOptions;
}
