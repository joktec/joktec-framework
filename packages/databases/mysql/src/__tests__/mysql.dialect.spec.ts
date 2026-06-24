import { Dialect, MysqlConfig } from '../mysql.config';
import { assertFirstClassDialect, getMysqlDialectCapabilities } from '../services';

describe('Mysql dialect support', () => {
  it('should default schema sync to explicit opt-in', () => {
    const config = new MysqlConfig({ username: 'root', password: 'root', database: 'joktec' } as MysqlConfig);

    expect(config.sync).toBe(false);
  });

  it('should expose first-class capabilities for mysql and postgres', () => {
    expect(getMysqlDialectCapabilities(Dialect.MYSQL)).toMatchObject({
      firstClass: true,
      caseInsensitiveLike: 'LIKE',
      fullTextIndex: true,
    });
    expect(getMysqlDialectCapabilities(Dialect.POSTGRES)).toMatchObject({
      firstClass: true,
      caseInsensitiveLike: 'ILIKE',
      arrayOperators: true,
    });
  });

  it('should accept only first-class relational dialects', () => {
    expect(() => assertFirstClassDialect(Dialect.MYSQL)).not.toThrow();
    expect(() => assertFirstClassDialect(Dialect.MARIADB)).not.toThrow();
    expect(() => assertFirstClassDialect(Dialect.POSTGRES)).not.toThrow();
  });
});
