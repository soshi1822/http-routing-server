import { IncomingMessage, ServerResponse } from 'http';

type End = ((cb?: () => void) => void) |
  ((chunk: any, cb?: () => void) => void) |
  ((chunk: any, encoding: BufferEncoding, cb?: () => void) => void)

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
export type RequestData = { routeUrl?: string, params: { [key: string]: string }, query: URLSearchParams, json: <T>() => T, text: () => string, cookies: Map<string, string> };
export type ResponseData = { json: (data: object, isEnd?: boolean) => void; _end: End; };
export type IncomingMessageData = IncomingMessage & RequestData;
export type ServerResponseData = ServerResponse & ResponseData;

export type RequestCallback = (req: IncomingMessageData, res: ServerResponseData) => void;
export type RequestOption = { params?: { [key: string]: RegExp } };
export type RouterWaits = { method: HttpMethods, match: string | RegExp, callback: RequestCallback, option: RequestOption };
