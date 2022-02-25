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

export type RouteingParams<P> = P extends string ?
    P extends `${infer A1}:{${infer P1}}${infer A2}` ? { [key in P1]: string } & RouteingParams<A1> & RouteingParams<A2> : {} :
    Record<string, unknown>;

export interface RequestData<P> {
    routeUrl?: string;
    params: RouteingParams<P>;
    query: URLSearchParams;
    json: <T>() => T;
    text: () => string;
    cookies: Map<string, string>;
}

export interface ResponseData {
    json: (data: object, isEnd?: boolean) => void;
    _end: End;
}

export type IncomingMessageData<P = any> = IncomingMessage & RequestData<P>;
export type ServerResponseData = ServerResponse & ResponseData;

export type RequestCallback<P = any> = (req: IncomingMessageData<P>, res: ServerResponseData) => void;

export interface RequestOption<P = any> {
    params?: Partial<{ [key in keyof RouteingParams<P> | string]: RegExp }>
}

export interface RouterWaits<P> {
    method: HttpMethods;
    match: string | RegExp;
    callback: RequestCallback<P>;
    option: RequestOption<P>;
}
