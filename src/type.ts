import { IncomingMessageData } from './module/incoming-message';
import { ServerResponseData } from './module/server-response';

export interface ServerOption {
  urlMaxLength?: number;
  headerMaxLength?: number;
}

export type HttpMethods =
  'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH'
  | 'ALL'
  | 'Router';

export type RouteingParams<P> = P extends string ?
  P extends `${infer A1}:{${infer P1}}${infer A2}` ? { [key in P1]: string } & RouteingParams<A1> & RouteingParams<A2> : {} :
  Record<string, unknown>;


export type RequestCallback<P = any, T = any> = (req: IncomingMessageData<P>, res: ServerResponseData) => T | Promise<T>;

export interface RequestOption<P = any> {
  params?: Partial<{ [key in keyof RouteingParams<P> | string]: RegExp }>;
}

export interface RouterWaits<P> {
  method: HttpMethods;
  match: string | RegExp;
  callback: RequestCallback<P>;
  option: RequestOption<P>;
}
