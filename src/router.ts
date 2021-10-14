import { EventEmitter } from 'events';
import { URL } from 'url';
import { HttpStatusError } from './error';
import {
  HttpMethods,
  IncomingMessageData,
  RequestCallback,
  RequestOption,
  RouterWaits,
  ServerResponseData
} from './type';


export class Router extends EventEmitter {
  private waits = new Set<RouterWaits>();

  constructor() {
    super();
  }


  /**
   * @internal
   * @param event
   * @param listener
   */
  on(event: 'error', listener: (error: Error, req: IncomingMessageData, res: ServerResponseData) => void): this;

  /**
   * @internal
   * @param event
   * @param listener
   */
  on(event: 'error.parent', listener: (error: Error, req: IncomingMessageData, res: ServerResponseData) => void): this;

  on(event: 'response', listener: (req: IncomingMessageData, res: ServerResponseData) => void): this;
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  get(match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    return this.request('GET', match, callback, option);
  }

  head(match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    return this.request('HEAD', match, callback, option);
  }

  post(match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    return this.request('POST', match, callback, option);
  }

  put(match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    return this.request('PUT', match, callback, option);
  }

  delete(match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    return this.request('DELETE', match, callback, option);
  }

  connect(match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    return this.request('CONNECT', match, callback, option);
  }

  options(match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    return this.request('OPTIONS', match, callback, option);
  }

  trace(match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    return this.request('TRACE', match, callback, option);
  }

  patch(match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    return this.request('PATCH', match, callback, option);
  }

  catch(callback: (error: Error, req: IncomingMessageData, res: ServerResponseData) => void) {
    this.on('error', callback);
  }

  childRouter(match: string | RegExp, router: Router, option?: RequestOption) {
    router.on('error.parent', (error, req, res) => this.onError(error, req, res));
    router.on('response', (req, res) => this.emit('response', req, res));

    return this.request('Router', match, (req, res) => router.onEvent(req, res), option);
  }

  protected async onEvent(req: IncomingMessageData, res: ServerResponseData) {
    res._end ??= res.end;
    res.end = (...args: [any?, any?, any?]) => {
      res._end(...args);
      this.emit('response', req, res);
    };

    this.requestRun(req, res)
      .catch(error => this.onError(error, req, res));
  }

  private async requestRun(req: IncomingMessageData, res: ServerResponseData) {
    const url = new URL(req.routeUrl ?? req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const emits: any[] = [];

    for (const { method, match, callback, option } of this.waits) {
      const urlTmp = {
        pathname: url.pathname.slice(1)
      };

      if (method !== req.method && method !== 'ALL' && method !== 'Router') {
        continue;
      }

      if (method === 'Router') {
        const hierarchy = (typeof match === 'string' ? counter(match, '/') : counter(match.toString(), '\\/')) + 1;
        const paths = urlTmp.pathname.split('/');

        urlTmp.pathname = [...paths].splice(0, hierarchy).join('/')!;
        req.routeUrl = [...paths].splice(hierarchy).join('/')! + url.search;
      }

      if (typeof match === 'string') {
        if (match === urlTmp.pathname) {
          emits.push(await this.emitRequest(callback, req, res, { url }));
        }
        continue;
      }

      const matchObj = urlTmp.pathname?.match?.(match);
      if (matchObj) {
        if (typeof option.params === 'object') {
          let isSuccess = false;
          for (const key in matchObj.groups) {
            const matchObjElementValue = matchObj.groups?.[key];

            if (!matchObjElementValue || !option.params[key]?.test(matchObjElementValue)) {
              isSuccess = false;
              break;
            } else {
              isSuccess = true;
            }
          }
          isSuccess ? emits.push(await this.emitRequest(callback, req, res, { params: matchObj.groups, url })) : null;
          continue;
        }

        emits.push(await this.emitRequest(callback, req, res, { url }));
      }
    }

    if (emits.length === 0) {
      throw new HttpStatusError(404, 'Not Found');
    }
  }

  private request(method: HttpMethods, match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    option ??= {};

    if (typeof match === 'string') {
      const params = match.match(/:[a-z0-9_-]+/ig);
      if (params && params.length > 0) {

        option.params = {
          ...(Object.fromEntries(params.map(param => [
            param.replace(/^:/, ''), /^(.+)$/s
          ]))), ...option.params
        };
        match = new RegExp(`^${quote(match).replace(/\\:([a-z0-9]+)/ig, '(?<$1>[^/]+)')}$`, 's');
      }
    }


    this.waits.add({ method, match, callback, option });
  }

  private async emitRequest(callback: RequestCallback, req: IncomingMessageData, res: ServerResponseData, reqAddOption: { params?: { [key: string]: string }, url: URL }) {
    return new Promise((resolve, reject) => {

      req.params = { ...req.params, ...reqAddOption?.params };
      req.query = reqAddOption.url.searchParams;
      req.cookies = new Map(req.headers.cookie?.split(/;\s+?/).map(v => v.split('=').map(t => t.trim())) as [string, string][] ?? []);

      if (!req.text && !req.json) {
        res.json = (data, isEnd) => responseJson(res, data, isEnd);

        const bodyChunk: Buffer[] = [];
        req.on('data', chunk => bodyChunk.push(Buffer.from(chunk)));
        req.on('end', () => {
          const body = Buffer.concat(bodyChunk);


          req.text = () => body.toString();
          req.json = () => JSON.parse(req.text() ?? '');

          (async () => callback(req, res))().then(() => resolve(undefined), error => reject(error));
        });
      } else {
        (async () => callback(req, res))().then(() => resolve(undefined), error => reject(error));
      }
    });
  }

  private onError(error: Error, req: IncomingMessageData, res: ServerResponseData) {
    this.listenerCount('error') > 0 ? this.emit('error', error, req, res) : this.emit('error.parent', error, req, res);
  }
}

function quote(str: string) {
  return str.replace(/\W/g, $0 => '\\' + $0);
}

function counter(str: string, seq: string | RegExp) {
  return str.split(seq).length - 1;
}

function responseJson(res: ServerResponseData, data: object, isEnd = true) {
  res.setHeader('content-type', 'application/json');
  res.write(JSON.stringify(data));

  if (isEnd) {
    return res.end();
  }
}
