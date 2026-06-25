import { AgentOptions } from 'http';
import { Client } from '@joktec/core';
import { AxiosInstance } from 'axios';
import { HttpConfig, HttpProxyConfig } from './http.config';
import { HttpAgent, HttpFormRequest, HttpRequest, HttpResponse } from './models';

/**
 * Represents a custom HTTP client that extends a generic client configuration
 * with Axios-specific configurations and instances.
 */
export interface HttpClient extends Client<HttpConfig, AxiosInstance> {
  /**
   * Verifies the validity of the provided proxy configuration by attempting to establish
   * a connection to the proxy server.
   *
   * @param proxy - The proxy configuration object that includes host, port, and authentication details.
   * @param timeout - Timeout as milliseconds to abort the connection
   * @returns A promise that resolves to a tuple:
   *  - First element (`boolean`): `true` if the connection to the proxy is successful, `false` otherwise.
   *  - Second element (`string`): A message describing the result, such as "Connection successful" or the error message encountered.
   */
  checkProxy(proxy: HttpProxyConfig, timeout?: number): Promise<[boolean, string]>;

  /**
   * Builds an HTTP agent with custom configuration, including proxy settings.
   *
   * @param proxy - Proxy host, port, protocol, and optional authentication.
   * @param opts - Optional standard Node agent options merged with proxy defaults.
   * @returns An instance of HttpAgent to be used for HTTP requests.
   */
  buildAgent(proxy: HttpProxyConfig, opts?: AgentOptions): HttpAgent;

  /**
   * Sends an HTTP request using the provided configuration.
   *
   * @typeParam T - The expected type of the response data.
   * @param config - The configuration object for the HTTP request, extending the HttpRequest interface.
   * @param conId - (Optional) A connection identifier that can be used to track or manage requests.
   * @returns A promise that resolves to an HttpResponse object containing the response data of type `T`.
   */
  request<T = any>(config: HttpRequest, conId?: string): Promise<HttpResponse<T>>;

  /**
   * Uploads form data to the server, using a multipart form request.
   *
   * @typeParam T - The expected type of the response data.
   * @param config - The configuration object for the form request, extending the HttpFormRequest interface.
   * @param conId - (Optional) A connection identifier that can be used to track or manage requests.
   * @returns A promise that resolves to an HttpResponse object containing the response data of type `T`.
   */
  upload<T = any>(config: HttpFormRequest, conId?: string): Promise<HttpResponse<T>>;
}
