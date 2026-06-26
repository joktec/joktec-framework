import { describe, expect, it, jest } from '@jest/globals';
import { DECORATORS } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { BaseController } from '../base.controller';
import { BaseService } from '../base.service';
import { ConfigService, LogService } from '../../modules';

class TestArticle {
  id!: string;
  title!: string;
}

const createService = () => ({
  paginate: jest.fn<(query: object) => Promise<object>>(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const getSwaggerQueryNames = (controller: Function, method: string): string[] => {
  const parameters = Reflect.getMetadata(DECORATORS.API_PARAMETERS, controller.prototype[method]) || [];
  return parameters.map((param: { name: string }) => param.name);
};

const getSwaggerResponseType = (controller: Function, method: string): Function => {
  const responses = Reflect.getMetadata(DECORATORS.API_RESPONSE, controller.prototype[method]) || {};
  return responses['200']?.type;
};

const getSwaggerModelProperties = (model: Function): string[] => {
  return Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, model.prototype) || [];
};

describe('BaseController integration', () => {
  it('should default to page pagination metadata and delegate list requests to the service', async () => {
    const Controller = BaseController<TestArticle, string>({ dto: TestArticle });
    const service = createService();
    service.paginate.mockResolvedValue({ items: [], total: 0, currPage: 1, prevPage: null, nextPage: null });

    const moduleRef = await Test.createTestingModule({
      controllers: [Controller],
      providers: [
        { provide: BaseService, useValue: service },
        { provide: ConfigService, useValue: {} },
        { provide: LogService, useValue: { setContext: jest.fn() } },
      ],
    }).compile();

    const controller = moduleRef.get(Controller);
    const result = await controller.paginate({ page: 1, limit: 10 });
    const responseType = getSwaggerResponseType(Controller, 'paginate');

    expect(result).toEqual({ items: [], total: 0, currPage: 1, prevPage: null, nextPage: null });
    expect(service.paginate).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(getSwaggerQueryNames(Controller, 'paginate')).toEqual(
      expect.arrayContaining(['page', 'limit', 'condition', 'sort']),
    );
    expect(getSwaggerModelProperties(responseType)).toEqual(expect.arrayContaining([':currPage', ':nextPage']));

    await moduleRef.close();
  });

  it('should expose cursor pagination metadata when paginate mode is cursor', () => {
    const Controller = BaseController<TestArticle, string>({
      dto: TestArticle,
      paginate: { search: true, mode: 'cursor' },
    });

    const responseType = getSwaggerResponseType(Controller, 'paginate');

    expect(getSwaggerQueryNames(Controller, 'paginate')).toEqual(
      expect.arrayContaining(['cursor', 'cursorKey', 'limit', 'condition', 'sort']),
    );
    expect(getSwaggerModelProperties(responseType)).toEqual(expect.arrayContaining([':hasNextPage', ':nextCursor']));
    expect(getSwaggerResponseType(Controller, 'search')).toBe(responseType);
  });

  it('should expose offset pagination metadata when paginate mode is offset', () => {
    const Controller = BaseController<TestArticle, string>({ dto: TestArticle, paginate: { mode: 'offset' } });
    const responseType = getSwaggerResponseType(Controller, 'paginate');

    expect(getSwaggerQueryNames(Controller, 'paginate')).toEqual(
      expect.arrayContaining(['offset', 'limit', 'condition', 'sort']),
    );
    expect(getSwaggerModelProperties(responseType)).toEqual(expect.arrayContaining([':currOffset', ':nextOffset']));
  });
});
