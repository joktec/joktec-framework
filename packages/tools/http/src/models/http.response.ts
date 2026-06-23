import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface HttpResponse<DATA = any, CONFIG = any> extends AxiosResponse<DATA, CONFIG> {}

export type HttpAgent = Pick<AxiosRequestConfig, 'httpAgent' | 'httpsAgent'>;
