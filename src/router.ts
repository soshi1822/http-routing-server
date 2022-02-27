import { EventEmitter } from 'events';
import { URL } from 'url';
import { HttpStatusError } from './error';
import { IncomingMessageData } from './module/incoming-message';
import { ServerResponseData } from './module/server-response';
import { HttpMethods, RequestCallback, RequestOption, RouterWaits } from './type';


export class Router extends EventEmitter {
  private waits = new Set<RouterWaits<any>>();

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

  get<P extends string | RegExp>(match: P, callback: RequestCallback<P>, option?: RequestOption<P>) {
    return this.request('GET', match, callback, option);
  }

  head<P extends string | RegExp>(match: P, callback: RequestCallback<P>, option?: RequestOption<P>) {
    return this.request('HEAD', match, callback, option);
  }

  post<P extends string | RegExp>(match: P, callback: RequestCallback<P>, option?: RequestOption<P>) {
    return this.request('POST', match, callback, option);
  }

  put<P extends string | RegExp>(match: P, callback: RequestCallback<P>, option?: RequestOption<P>) {
    return this.request('PUT', match, callback, option);
  }

  delete<P extends string | RegExp>(match: P, callback: RequestCallback<P>, option?: RequestOption<P>) {
    return this.request('DELETE', match, callback, option);
  }

  connect<P extends string | RegExp>(match: P, callback: RequestCallback<P>, option?: RequestOption<P>) {
    return this.request('CONNECT', match, callback, option);
  }

  options<P extends string | RegExp>(match: P, callback: RequestCallback<P>, option?: RequestOption<P>) {
    return this.request('OPTIONS', match, callback, option);
  }

  trace<P extends string | RegExp>(match: P, callback: RequestCallback<P>, option?: RequestOption<P>) {
    return this.request('TRACE', match, callback, option);
  }

  patch<P extends string | RegExp>(match: P, callback: RequestCallback<P>, option?: RequestOption<P>) {
    return this.request('PATCH', match, callback, option);
  }

  catch(callback: (error: Error, req: IncomingMessageData<any>, res: ServerResponseData) => void) {
    this.on('error', callback);
  }

  childRouter<P extends string | RegExp>(match: P, router: Router, option?: RequestOption<P>) {
    router.on('error.parent', (error, req, res) => this.onError(error, req, res));

    return this.request('Router', match, (req, res) => router.onEvent(req, res), option);
  }

  protected async onEvent(req: IncomingMessageData, res: ServerResponseData) {
    res.on('close', () => this.emit('response', req, res));

    await this.requestRun(req, res)
        .catch(error => this.onError(error, req, res));
  }

  protected onError(error: Error, req: IncomingMessageData, res: ServerResponseData) {
    this.listenerCount('error') > 0 ?
        this.emit('error', error, req, res) :
        this.emit('error.parent', error, req, res);
  }

  private request(method: HttpMethods, match: string | RegExp, callback: RequestCallback, option?: RequestOption) {
    option ??= {};

    if (typeof match === 'string') {
      const params = match.match(/:{?[a-z0-9_-]+}?/ig);
      if (params && params.length > 0) {

        option.params = {
          ...(Object.fromEntries(params.map(param => [
            param.replace(/^:{?([a-z0-9_-]+)}?$/i, '$1'), /.+?/
          ]))), ...option.params
        };

        let matchSol = quote(match);

        for (let i = 0; i < params.length; i++) {
          const param = params[i];
          const paramName = param.replace(/^:{?([a-z0-9_-]+)}?$/i, '$1');

          const paramMatch = option.params?.[paramName];

          if (!paramMatch) {
            continue;
          }

          if (paramMatch.ignoreCase) {
            throw new Error(`The "i" flag is not allowed in option.params. method:${method} match:${match}`);
          }

          matchSol = matchSol.replace(
              quote(param),
              paramMatch.toString().replace(/^\/\^?(.+?)\$?\//, `(?<${paramName}>$1)`)
          );
        }

        match = new RegExp(`^${matchSol}$`, 's');
      }
    }


    this.waits.add({ method, match, callback, option });
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
          emits.push(await this.emitRequest(callback, req, res, {params: matchObj.groups, url}));
          continue;
        }

        emits.push(await this.emitRequest(callback, req, res, { url }));
      }
    }

    if (emits.length === 0) {
      throw new HttpStatusError(404, 'Not Found');
    }
  }

  private async emitRequest(callback: RequestCallback, req: IncomingMessageData, res: ServerResponseData, reqAddOption: { params?: { [key: string]: string }, url: URL }) {
    req.params = { ...req.params, ...reqAddOption?.params };

    const call = callback(req, res);

    if (!(call instanceof Promise)) {
      return;
    }

    return call.then(() => undefined);
  }
}

function quote(str: string) {
  return str.replace(/\W/g, $0 => '\\' + $0);
}

function counter(str: string, seq: string | RegExp) {
  return str.split(seq).length - 1;
}
