import { AddressInfo, ListenOptions } from 'net';
import { HttpBase, Server as HttpServer } from 'http';
import { Router } from './router';
import { HttpStatusError } from './error';


export class Server extends Router implements HttpBase {
  private http = new HttpServer();

  constructor() {
    super();

    this.http.on('request', (req: any, res: any) => this.onEvent(req, res));
    super.on('error.parent', (error: Error, req, res) => {
      console.error(error);

      if (req.destroyed) {
        return;
      }

      const basicError = error instanceof HttpStatusError ? error : new HttpStatusError(500, 'Server error');

      res.writeHead(basicError.statusCode, { 'content-type': 'application/json' });
      res.end(JSON.stringify(basicError.toJSON()));
    });
  }


  listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void): HttpServer;
  listen(port?: number, hostname?: string, listeningListener?: () => void): HttpServer;
  listen(port?: number, backlog?: number, listeningListener?: () => void): HttpServer;
  listen(port?: number, listeningListener?: () => void): HttpServer;
  listen(path: string, backlog?: number, listeningListener?: () => void): HttpServer;
  listen(path: string, listeningListener?: () => void): HttpServer;
  listen(options: ListenOptions, listeningListener?: () => void): HttpServer;
  listen(handle: any, backlog?: number, listeningListener?: () => void): HttpServer;
  listen(handle: any, listeningListener?: () => void): HttpServer;
  listen(...args: any[]): HttpServer {
    return this.http.listen(...args);
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
}
