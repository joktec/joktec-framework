import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import net from 'net';
import path from 'path';

export type ConsumerAppName = 'gateway' | 'micro';

export interface ManagedApp {
  app: ConsumerAppName;
  baseUrl: string;
  external: boolean;
  process?: ChildProcessWithoutNullStreams;
  logs: string[];
}

export interface TcpDependency {
  name: string;
  host: string;
  port: number;
}

export interface JsonResponse<T = any> {
  status: number;
  body: T;
}

export const repoRoot = path.resolve(__dirname, '../..');

export const consumerRunId = process.env.CONSUMER_RUN_ID || `${Date.now()}-${process.pid}`;
export const consumerPrefix = `consumer-test-${consumerRunId}`;

export const apps: Record<ConsumerAppName, { cwd: string; port: number; baseUrl: string }> = {
  gateway: {
    cwd: path.join(repoRoot, 'apps/example-gateway'),
    port: 9011,
    baseUrl: 'http://localhost:9011',
  },
  micro: {
    cwd: path.join(repoRoot, 'apps/example-micro'),
    port: 9012,
    baseUrl: 'http://localhost:9012',
  },
};

export const redisDependency: TcpDependency = { name: 'Redis', host: 'localhost', port: 6379 };

export const gatewayRuntimeDependencies: TcpDependency[] = [
  redisDependency,
  { name: 'MongoDB', host: 'localhost', port: 27017 },
  { name: 'MySQL', host: 'localhost', port: 3306 },
  { name: 'MinIO/S3', host: '127.0.0.1', port: 9000 },
  { name: 'Kafka', host: 'localhost', port: 9092 },
  { name: 'RabbitMQ', host: 'localhost', port: 5672 },
  { name: 'ElasticMQ/SQS', host: 'localhost', port: 9324 },
];

export const microRuntimeDependencies: TcpDependency[] = [
  redisDependency,
  { name: 'MongoDB', host: 'localhost', port: 27017 },
  { name: 'MySQL', host: 'localhost', port: 3306 },
  { name: 'MinIO/S3', host: '127.0.0.1', port: 9000 },
  { name: 'Kafka', host: 'localhost', port: 9092 },
  { name: 'RabbitMQ', host: 'localhost', port: 5672 },
  { name: 'ElasticMQ/SQS', host: 'localhost', port: 9324 },
];

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const tail = (items: string[], limit: number = 40): string => items.slice(-limit).join('\n');

export async function assertTcpOpen(dependency: TcpDependency, timeoutMs: number = 2000): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: dependency.host, port: dependency.port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`${dependency.name} is not reachable at ${dependency.host}:${dependency.port}`));
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve();
    });
    socket.once('error', err => {
      clearTimeout(timer);
      reject(new Error(`${dependency.name} is not reachable at ${dependency.host}:${dependency.port}: ${err.message}`));
    });
  });
}

export async function preflightDependencies(dependencies: TcpDependency[]): Promise<void> {
  const failures: string[] = [];
  for (const dependency of dependencies) {
    try {
      await assertTcpOpen(dependency);
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (failures.length) {
    throw new Error(`Consumer stack preflight failed:\n${failures.map(item => `- ${item}`).join('\n')}`);
  }
}

export async function waitForHttpOk(url: string, timeoutMs: number = 90000): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(1000);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : lastError}`);
}

export async function startApp(app: ConsumerAppName): Promise<ManagedApp> {
  const appConfig = apps[app];
  const healthUrl = `${appConfig.baseUrl}/health`;

  if (process.env.CONSUMER_REUSE_RUNNING === '1') {
    await waitForHttpOk(healthUrl, 3000);
    return { app, baseUrl: appConfig.baseUrl, external: true, logs: [] };
  }

  const logs: string[] = [];
  const child = spawn('yarn', ['start'], {
    cwd: appConfig.cwd,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'test',
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', chunk => logs.push(String(chunk).trimEnd()));
  child.stderr.on('data', chunk => logs.push(String(chunk).trimEnd()));

  try {
    await waitForHttpOk(healthUrl);
    return { app, baseUrl: appConfig.baseUrl, external: false, process: child, logs };
  } catch (err) {
    await stopApp({ app, baseUrl: appConfig.baseUrl, external: false, process: child, logs });
    const startError = new Error(
      `Failed to start ${app} app: ${err instanceof Error ? err.message : err}\n${tail(logs)}`,
    ) as Error & { cause?: unknown };
    startError.cause = err;
    throw startError;
  }
}

export async function stopApp(app: ManagedApp): Promise<void> {
  if (app.external || !app.process || app.process.killed) return;

  app.process.kill('SIGTERM');
  const exited = await new Promise<boolean>(resolve => {
    const timer = setTimeout(() => resolve(false), 5000);
    app.process.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });

  if (!exited && !app.process.killed) {
    app.process.kill('SIGKILL');
  }
}

export async function requestJson<T = any>(
  baseUrl: string,
  route: string,
  init: RequestInit = {},
): Promise<JsonResponse<T>> {
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new Error(`${init.method || 'GET'} ${route} failed with HTTP ${response.status}: ${text}`);
  }

  return { status: response.status, body };
}

export function unwrapData<T = any>(response: JsonResponse<any>): T {
  return response.body?.data ?? response.body;
}

export function swaggerAuthHeader(): string {
  return `Basic ${Buffer.from('admin:admin').toString('base64')}`;
}
