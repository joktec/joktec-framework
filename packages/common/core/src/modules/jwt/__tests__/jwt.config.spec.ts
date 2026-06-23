import { describe, expect, it, jest } from '@jest/globals';
import { JwtConfig } from '../jwt.config';
import { ConfigService } from '../../config';

describe('JwtConfig class', () => {
  describe('constructor', () => {
    it('should create a new instance with custom values', () => {
      const props = {
        secretKey: 'custom_secret_key',
        refreshKey: 'custom_refresh_key',
        expired: '7 days',
      };
      const jwtConfig = new JwtConfig(props);
      expect(jwtConfig.secretKey).toEqual(props.secretKey);
      expect(jwtConfig.refreshKey).toEqual(props.refreshKey);
      expect(jwtConfig.expired).toEqual(props.expired);
    });

    it('should create a new instance with values parsed from ConfigService', () => {
      const props = {
        secretKey: 'parsed_secret_key',
        refreshKey: 'parsed_refresh_key',
        expired: '30 days',
      };
      const configService = new ConfigService();
      jest.spyOn(configService, 'get').mockReturnValue(props);

      const jwtConfig = configService.parse(JwtConfig, 'jwt');

      expect(jwtConfig.secretKey).toEqual(props.secretKey);
      expect(jwtConfig.refreshKey).toEqual(props.refreshKey);
      expect(jwtConfig.expired).toEqual(props.expired);
    });
  });
});
