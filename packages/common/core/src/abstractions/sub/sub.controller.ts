import { HttpStatus, toArray, toBool, toPlural, toSingular } from '@joktec/utils';
import {
  applyDecorators,
  Body,
  Delete,
  Get,
  HttpCode,
  Inject,
  OnModuleInit,
  Param,
  Post,
  Put,
  Query,
  Type,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { UseFilters } from '@nestjs/common/decorators/core';
import {
  ApiBody,
  ApiExcludeController,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
import { startCase } from 'lodash';
import { ApiFilterQuery, ApiNotAllowedEndpoint, ApiSchema, ApiUseApiKey, ApiUseBearer } from '../../decorators';
import { NotFoundException } from '../../exceptions';
import {
  Constructor,
  DeepPartial,
  Entity,
  IBaseRequest,
  IBaseSubController,
  IBaseSubService,
  IPaginationResponse,
  OffsetPaginationResponse,
  CursorPaginationResponse,
  PagePaginationResponse,
  PaginationMode,
} from '../../models';
import { ConfigService, LogService } from '../../modules';
import { BaseValidationPipe } from '../../pipes';
import { isHideEndpoint } from '../shared/endpoint.types';
import { getParamName, getSwaggerParamType, parseSubParam } from '../shared/param.util';
import { ISubControllerProps } from './sub.types';

export type { ISubControllerProps, ISubEndpointProps } from './sub.types';
export type { ISubParamProps } from '../shared/param.util';

export const SubController = <
  TParent extends Entity,
  TChild extends Entity,
  ParentID = string,
  ChildID = string,
  REQ extends IBaseRequest<TChild> = IBaseRequest<TChild>,
>(
  props: ISubControllerProps<TParent, TChild, ParentID, ChildID, REQ>,
): Type<IBaseSubController<TParent, TChild, ParentID, ChildID, REQ>> => {
  const dtoName = props.dtoName || props.dto.name;
  const parentDtoName = props.parentDtoName || props.parentDto.name;
  const nameSingular = startCase(toSingular(dtoName));
  const namePlural = toPlural(nameSingular);
  const parentNameSingular = startCase(toSingular(parentDtoName));
  const tag = props.tag || `${parentNameSingular} ${namePlural}`;
  const parentParamName = getParamName(props.parentParam, 'id');
  const childParamName = getParamName(props.childParam, 'childId');

  class DefaultQueryDto implements IBaseRequest<TChild> {}

  const queryDto: Constructor<any> = props.customDto?.queryDto || DefaultQueryDto;
  const createDto: Constructor<any> = props.customDto?.createDto || props.dto;
  const updatedDto: Constructor<any> = props.customDto?.updatedDto || PartialType(createDto);
  const detailDto: Constructor<any> = props.customDto?.detailDto || props.dto;
  const mutationDto: Constructor<any> = props.customDto?.mutationDto || props.parentDto;

  @ApiSchema({ name: `${parentNameSingular}${nameSingular}QueryDto` })
  class QueryDto extends queryDto {}

  const paginationMode = props.paginate?.mode || 'page';
  const createDefaultPaginationDto = (mode: PaginationMode): Constructor<IPaginationResponse<TChild>> => {
    if (mode === 'offset') {
      @ApiSchema({ name: `${parentNameSingular}${nameSingular}Pagination` })
      class DefaultPaginationDto extends OffsetPaginationResponse<TChild>(props.dto) {}
      return DefaultPaginationDto;
    }

    if (mode === 'cursor') {
      @ApiSchema({ name: `${parentNameSingular}${nameSingular}Pagination` })
      class DefaultPaginationDto extends CursorPaginationResponse<TChild>(props.dto) {}
      return DefaultPaginationDto;
    }

    @ApiSchema({ name: `${parentNameSingular}${nameSingular}Pagination` })
    class DefaultPaginationDto extends PagePaginationResponse<TChild>(props.dto) {}
    return DefaultPaginationDto;
  };
  const PaginationDto: Constructor<IPaginationResponse<TChild>> =
    props.customDto?.paginationDto || createDefaultPaginationDto(paginationMode);

  @ApiSchema({ name: `${parentNameSingular}${nameSingular}CreateDto` })
  class CreateDto extends createDto {}

  @ApiSchema({ name: `${parentNameSingular}${nameSingular}UpdateDto` })
  class UpdateDto extends updatedDto {}

  @ApiTags(tag)
  @ApiExcludeController(toBool(props.hidden, false))
  @ApiUseBearer(props.useBearer)
  @ApiUseApiKey(props.useApiKey)
  @UseGuards(...toArray(props.guards))
  @UseInterceptors(...toArray(props.hooks))
  @UsePipes(...toArray(props.pipes))
  @UseFilters(...toArray(props.filters))
  @applyDecorators(...toArray(props.decorators))
  class Controller implements OnModuleInit {
    @Inject() public readonly configService: ConfigService;
    @Inject() public readonly logService: LogService;

    constructor(protected service: IBaseSubService<TParent, TChild, ParentID, ChildID, REQ>) {}

    onModuleInit() {
      this.logService.setContext(this.constructor.name);
      this.afterModuleInit();
    }

    protected afterModuleInit() {}

    protected parseParentId(value: string): ParentID {
      return parseSubParam<ParentID>(value, props.parentParam);
    }

    protected parseChildId(value: string): ChildID {
      return parseSubParam<ChildID>(value, props.childParam);
    }

    @Get('/')
    @ApiOperation({ summary: `List ${namePlural}` })
    @ApiParam({ name: parentParamName, type: getSwaggerParamType(props.parentParam) })
    @ApiFilterQuery({ ...props.paginate, paginationMode })
    @ApiOkResponse({ type: PaginationDto })
    @ApiExcludeEndpoint(isHideEndpoint(props.paginate))
    @ApiNotAllowedEndpoint(toBool(props.paginate?.disable, false))
    @ApiUseBearer(props.paginate?.useBearer)
    @ApiUseApiKey(props.paginate?.useApiKey)
    @UseGuards(...toArray(props.paginate?.guards))
    @UseInterceptors(...toArray(props.paginate?.hooks))
    @UsePipes(...toArray(props.paginate?.pipes))
    @UseFilters(...toArray(props.paginate?.filters))
    @applyDecorators(...toArray(props.paginate?.decorators))
    async paginate(
      @Param(parentParamName) parentId: string,
      @Query() query: QueryDto,
    ): Promise<IPaginationResponse<TChild>> {
      return this.service.paginate(this.parseParentId(parentId), query as REQ);
    }

    @Post('/search')
    @ApiOperation({ summary: `Search ${namePlural}` })
    @ApiParam({ name: parentParamName, type: getSwaggerParamType(props.parentParam) })
    @ApiOkResponse({ type: PaginationDto })
    @ApiExcludeEndpoint(!toBool(props.paginate?.search, false))
    @ApiNotAllowedEndpoint(!toBool(props.paginate?.search, false))
    @ApiUseBearer(props.paginate?.useBearer)
    @ApiUseApiKey(props.paginate?.useApiKey)
    @UseGuards(...toArray(props.paginate?.guards))
    @UseInterceptors(...toArray(props.paginate?.hooks))
    @UsePipes(...toArray(props.paginate?.pipes))
    @UseFilters(...toArray(props.paginate?.filters))
    @applyDecorators(...toArray(props.paginate?.decorators))
    @HttpCode(HttpStatus.OK)
    async search(
      @Param(parentParamName) parentId: string,
      @Body() query: QueryDto,
    ): Promise<IPaginationResponse<TChild>> {
      return this.service.paginate(this.parseParentId(parentId), query as REQ);
    }

    @Get(`/:${childParamName}`)
    @ApiOperation({ summary: `Detail ${nameSingular}` })
    @ApiParam({ name: parentParamName, type: getSwaggerParamType(props.parentParam) })
    @ApiParam({ name: childParamName, type: getSwaggerParamType(props.childParam) })
    @ApiOkResponse({ type: detailDto })
    @ApiExcludeEndpoint(isHideEndpoint(props.detail))
    @ApiNotAllowedEndpoint(toBool(props.detail?.disable, false))
    @ApiUseBearer(props.detail?.useBearer)
    @ApiUseApiKey(props.detail?.useApiKey)
    @UsePipes(...toArray(props.detail?.pipes))
    @UseInterceptors(...toArray(props.detail?.hooks))
    @UseFilters(...toArray(props.detail?.filters))
    @applyDecorators(...toArray(props.detail?.decorators))
    async detail(
      @Param(parentParamName) parentId: string,
      @Param(childParamName) childId: string,
      @Query() query: QueryDto,
    ): Promise<TChild> {
      const detail = await this.service.findById(
        this.parseParentId(parentId),
        this.parseChildId(childId),
        query as REQ,
      );
      if (!detail) throw new NotFoundException();
      return detail;
    }

    @Post('/')
    @ApiOperation({ summary: `Add ${nameSingular}` })
    @ApiParam({ name: parentParamName, type: getSwaggerParamType(props.parentParam) })
    @ApiOkResponse({ type: mutationDto })
    @ApiBody({ type: CreateDto })
    @ApiExcludeEndpoint(isHideEndpoint(props.create))
    @ApiNotAllowedEndpoint(toBool(props.create?.disable, false))
    @ApiUseBearer(props.create?.useBearer)
    @ApiUseApiKey(props.create?.useApiKey)
    @UsePipes(new BaseValidationPipe(props?.pipeOpts), ...toArray(props.create?.pipes))
    @UseInterceptors(...toArray(props.create?.hooks))
    @UseFilters(...toArray(props.create?.filters))
    @applyDecorators(...toArray(props.create?.decorators))
    async create(@Param(parentParamName) parentId: string, @Body() entity: CreateDto): Promise<TParent | TChild> {
      return this.service.create(this.parseParentId(parentId), entity as DeepPartial<TChild>);
    }

    @Put(`/:${childParamName}`)
    @ApiOperation({ summary: `Update ${nameSingular}` })
    @ApiParam({ name: parentParamName, type: getSwaggerParamType(props.parentParam) })
    @ApiParam({ name: childParamName, type: getSwaggerParamType(props.childParam) })
    @ApiOkResponse({ type: mutationDto })
    @ApiBody({ type: UpdateDto })
    @ApiExcludeEndpoint(isHideEndpoint(props.update))
    @ApiNotAllowedEndpoint(toBool(props.update?.disable, false))
    @ApiUseBearer(props.update?.useBearer)
    @ApiUseApiKey(props.update?.useApiKey)
    @UsePipes(
      new BaseValidationPipe({ skipMissingProperties: true, ...props?.pipeOpts }),
      ...toArray(props.update?.pipes),
    )
    @UseInterceptors(...toArray(props.update?.hooks))
    @UseFilters(...toArray(props.update?.filters))
    @applyDecorators(...toArray(props.update?.decorators))
    async update(
      @Param(parentParamName) parentId: string,
      @Param(childParamName) childId: string,
      @Body() entity: UpdateDto,
    ): Promise<TParent | TChild> {
      const detail = await this.service.update(
        this.parseParentId(parentId),
        this.parseChildId(childId),
        entity as DeepPartial<TChild>,
      );
      if (!detail) throw new NotFoundException();
      return detail;
    }

    @Delete(`/:${childParamName}`)
    @ApiOperation({ summary: `Delete ${nameSingular}` })
    @ApiParam({ name: parentParamName, type: getSwaggerParamType(props.parentParam) })
    @ApiParam({ name: childParamName, type: getSwaggerParamType(props.childParam) })
    @ApiOkResponse({ type: mutationDto })
    @ApiExcludeEndpoint(isHideEndpoint(props.delete))
    @ApiNotAllowedEndpoint(toBool(props.delete?.disable, false))
    @ApiUseBearer(props.delete?.useBearer)
    @ApiUseApiKey(props.delete?.useApiKey)
    @UsePipes(...toArray(props.delete?.pipes))
    @UseInterceptors(...toArray(props.delete?.hooks))
    @UseFilters(...toArray(props.delete?.filters))
    @applyDecorators(...toArray(props.delete?.decorators))
    async delete(@Param(parentParamName) parentId: string, @Param(childParamName) childId: string) {
      const detail = await this.service.delete(this.parseParentId(parentId), this.parseChildId(childId));
      if (!detail) throw new NotFoundException();
      return detail;
    }
  }

  return Controller as unknown as Type<IBaseSubController<TParent, TChild, ParentID, ChildID, REQ>>;
};
