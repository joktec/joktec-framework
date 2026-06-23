import { describe, expect, it } from '@jest/globals';
import { BigQueryUtils } from '../bigquery.utils';
import { BigQuerySchema } from '../models';

describe('BigQueryUtils', () => {
  const schema: BigQuerySchema[] = [
    { name: 'id', type: 'STRING' },
    { name: 'title', type: 'STRING' },
  ];

  it('should build positional insert SQL and params', async () => {
    await expect(
      BigQueryUtils.buildInsertStatementQuery('project.dataset.table', [{ id: '1' }, { id: '2' }], schema),
    ).resolves.toBe('INSERT INTO `project.dataset.table` (id, title) VALUES (?, ?), (?, ?);');
    await expect(
      BigQueryUtils.buildInsertParam(
        [
          { id: '1', title: 'One' },
          { id: '2', title: 'Two' },
        ],
        schema,
      ),
    ).resolves.toEqual(['1', 'One', '2', 'Two']);
  });
});
