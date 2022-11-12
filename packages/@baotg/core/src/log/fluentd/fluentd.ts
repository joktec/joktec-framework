import { FluentdConfig } from './fluentd.config';

const createFluentd = require('pino-fluentd');

export const createFluentdStream = (cfg: FluentdConfig) =>
  createFluentd({
    tag: '@baotg/services',
    ...cfg,
  });
