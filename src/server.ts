import { Server as HttpServer } from 'http';
import { AddressInfo, ListenOptions } from 'net';
import { HttpStatusError } from './error';
import { IncomingMessageData } from './module/incoming-message';
import { ServerResponseData } from './module/server-response';
import { Router } from './router';
import { ServerOption } from './type';


export class Server extends Router {
  private http = new HttpServer({
    maxHeaderSize: this.option.headerMaxLength,
    IncomingMessage: IncomingMessageData,
    ServerResponse: ServerResponseData as any
  });

  constructor(private option: ServerOption = {}) {
    super();

    this.http.on('request', (req: any, res: any) => this.onEvent(req, res));
    super.on('error.parent', (error: Error, req, res) => {
      console.error(error);

      if (res.destroyed) {
        return;
      }

      const basicError = error instanceof HttpStatusError ? error : new HttpStatusError(500, 'Server error');

      res.json(basicError.toJSON(), basicError.statusCode);
    });
  }

  protected async onEvent(req: IncomingMessageData, res: ServerResponseData) {
    if (req.url && req.url.length > (this.option.urlMaxLength ?? 2048)) {
      return this.onError(new HttpStatusError(414, 'URL Too Long'), req, res);
    }

    if (this.option.responseAutoEncoding !== false) {
      res.enableContentEncoding();
    }

    return new Promise<void>((resolve, reject) =>
      req.once('end', () => super.onEvent(req, res).then(resolve, reject))
    );
  }

  get timeout(): number {
    return this.http.timeout;
  }

  set timeout(value: number) {
    this.http.timeout = value;
  }

  get requestTimeout(): number {
    return this.http.requestTimeout;
  }

  set requestTimeout(value: number) {
    this.http.requestTimeout = value;
  }

  get maxHeadersCount(): number | null {
    return this.http.maxHeadersCount;
  }

  set keepAliveTimeout(value: number) {
    this.http.keepAliveTimeout = value;
  }

  get headersTimeout(): number {
    return this.http.headersTimeout;
  }

  set headersTimeout(value: number) {
    this.http.headersTimeout = value;
  }

  listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void): this;

  listen(port?: number, hostname?: string, listeningListener?: () => void): this;

  listen(port?: number, backlog?: number, listeningListener?: () => void): this;

  listen(port?: number, listeningListener?: () => void): this;

  listen(path: string, backlog?: number, listeningListener?: () => void): this;

  listen(path: string, listeningListener?: () => void): this

  listen(options: ListenOptions, listeningListener?: () => void): this;

  listen(handle: any, backlog?: number, listeningListener?: () => void): this;

  listen(handle: any, listeningListener?: () => void): this;

  listen(...args: any[]): this {
    this.http.listen(...args);
    return this;
  }

  close(callback?: (err?: Error) => void): this {
    this.http.close(callback);
    return this;
  }

  address(): AddressInfo | string | null {
    return this.http.address();
  }

  getConnections(cb: (error: Error | null, count: number) => void): void {
    this.http.getConnections(cb);
  }

  setTimeout(msecs?: number, callback?: () => void): this;

  setTimeout(callback: () => void): this;

  setTimeout(...args: any[]): this {
    this.http.setTimeout(...args);
    return this;
  }
}
