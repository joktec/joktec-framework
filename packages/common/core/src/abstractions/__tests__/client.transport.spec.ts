import { describe, expect, it, jest } from '@jest/globals';
import { of } from 'rxjs';
import { ClientService } from '../client/client.service';
import { SubClientService } from '../sub-client/sub-client.service';

class Article {
  id!: string;
}

class Competition {
  id!: string;
}

class Season {
  year!: number;
  title!: string;
}

const createClient = () => ({
  send: jest.fn(),
});

describe('transport client services', () => {
  it('should send base CRUD commands with backward-compatible dto payloads', async () => {
    const client = createClient();
    client.send.mockReturnValue(of({ id: 'article-1' }));
    const Service = ClientService<Article, string>({ dto: Article });
    const service = new Service(client as any);

    await service.create({ id: 'article-1' });
    await service.update('article-1', { id: 'article-1' });
    await service.findOne({ condition: { id: 'article-1' } });

    expect(client.send).toHaveBeenNthCalledWith(
      1,
      { cmd: 'Article.create' },
      { dto: { id: 'article-1' }, entity: { id: 'article-1' }, jwtPayload: undefined },
    );
    expect(client.send).toHaveBeenNthCalledWith(
      2,
      { cmd: 'Article.update' },
      { id: 'article-1', dto: { id: 'article-1' }, entity: { id: 'article-1' }, jwtPayload: undefined },
    );
    expect(client.send).toHaveBeenNthCalledWith(
      3,
      { cmd: 'Article.detail' },
      { id: 'article-1', req: { condition: { id: 'article-1' } } },
    );
  });

  it('should send nested CRUD commands with parent and child ids', async () => {
    const client = createClient();
    client.send.mockReturnValue(of({ id: 'competition-1' }));
    const Service = SubClientService<Competition, Season, string, number>({
      parentDto: Competition,
      dto: Season,
    });
    const service = new Service(client as any);

    await service.create('competition-1', { year: 2026 });
    await service.update('competition-1', 2026, { title: 'Updated' });
    await service.findById('competition-1', 2026, { limit: 1 });

    expect(client.send).toHaveBeenNthCalledWith(
      1,
      { cmd: 'Competition.Season.create' },
      {
        parentId: 'competition-1',
        dto: { year: 2026 },
        entity: { year: 2026 },
        jwtPayload: undefined,
      },
    );
    expect(client.send).toHaveBeenNthCalledWith(
      2,
      { cmd: 'Competition.Season.update' },
      {
        parentId: 'competition-1',
        childId: 2026,
        dto: { title: 'Updated' },
        entity: { title: 'Updated' },
        jwtPayload: undefined,
      },
    );
    expect(client.send).toHaveBeenNthCalledWith(
      3,
      { cmd: 'Competition.Season.detail' },
      { parentId: 'competition-1', childId: 2026, req: { limit: 1 } },
    );
  });
});
