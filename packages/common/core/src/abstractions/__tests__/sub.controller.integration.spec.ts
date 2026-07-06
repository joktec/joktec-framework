import { describe, expect, it, jest } from '@jest/globals';
import { DECORATORS } from '@nestjs/swagger';
import { SubController } from '../sub/sub.controller';

class Competition {
  id!: string;
  name!: string;
}

class Season {
  year!: number;
  title!: string;
}

const createService = () => ({
  paginate: jest.fn<(parentId: string, query: object) => Promise<object>>(),
  findById: jest.fn<(parentId: string, childId: number, query?: object) => Promise<object>>(),
  create: jest.fn<(parentId: string, entity: object) => Promise<object>>(),
  update: jest.fn<(parentId: string, childId: number, entity: object) => Promise<object>>(),
  delete: jest.fn<(parentId: string, childId: number) => Promise<object>>(),
});

const getSwaggerParamNames = (controller: Function, method: string): string[] => {
  const parameters = Reflect.getMetadata(DECORATORS.API_PARAMETERS, controller.prototype[method]) || [];
  return parameters.map((param: { name: string }) => param.name);
};

describe('SubController integration', () => {
  it('should delegate nested CRUD calls with parsed parent and child params', async () => {
    const Controller = SubController<Competition, Season, string, number>({
      parentDto: Competition,
      dto: Season,
      childParam: { name: 'year', type: 'number' },
      customDto: { mutationDto: Competition },
      paginate: { search: true },
    });
    const service = createService();
    service.paginate.mockResolvedValue({ items: [], total: 0, currPage: 1 });
    service.findById.mockResolvedValue({ year: 2026 });
    service.create.mockResolvedValue({ id: 'cmp-1' });
    service.update.mockResolvedValue({ id: 'cmp-1' });
    service.delete.mockResolvedValue({ id: 'cmp-1' });

    const controller = new Controller(service as any);

    await controller.paginate('cmp-1', { page: 1, limit: 10 });
    await controller.detail('cmp-1', 2026 as any, {});
    await controller.create('cmp-1', { year: 2026 });
    await controller.update('cmp-1', 2026 as any, { title: 'Updated' });
    await controller.delete('cmp-1', 2026 as any);

    expect(service.paginate).toHaveBeenCalledWith('cmp-1', { page: 1, limit: 10 });
    expect(service.findById).toHaveBeenCalledWith('cmp-1', 2026, {});
    expect(service.create).toHaveBeenCalledWith('cmp-1', { year: 2026 });
    expect(service.update).toHaveBeenCalledWith('cmp-1', 2026, { title: 'Updated' });
    expect(service.delete).toHaveBeenCalledWith('cmp-1', 2026);
  });

  it('should expose parent and child swagger params for nested endpoints', () => {
    const Controller = SubController<Competition, Season, string, number>({
      parentDto: Competition,
      dto: Season,
      childParam: { name: 'year', type: 'number' },
    });

    expect(getSwaggerParamNames(Controller, 'paginate')).toEqual(expect.arrayContaining(['id']));
    expect(getSwaggerParamNames(Controller, 'detail')).toEqual(expect.arrayContaining(['id', 'year']));
    expect(getSwaggerParamNames(Controller, 'update')).toEqual(expect.arrayContaining(['id', 'year']));
    expect(getSwaggerParamNames(Controller, 'delete')).toEqual(expect.arrayContaining(['id', 'year']));
  });
});
