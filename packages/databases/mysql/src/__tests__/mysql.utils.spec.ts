import { printSql } from '../helpers';

describe('Mysql SQL utils', () => {
  it('should quote and escape positional SQL parameters', () => {
    const sql = printSql('select * from users where name = ? and active = ? and meta = ?', [
      "O'Reilly",
      true,
      { role: 'admin' },
    ]);

    expect(sql).toBe(
      "select * from users where name = 'O''Reilly' and active = TRUE and meta = '{\"role\":\"admin\"}'",
    );
  });

  it('should replace postgres-style numbered parameters', () => {
    const sql = printSql('select * from users where id = $1 and created_at > $2', [
      10,
      new Date('2026-01-01T00:00:00.000Z'),
    ]);

    expect(sql).toBe("select * from users where id = 10 and created_at > '2026-01-01T00:00:00.000Z'");
  });
});
