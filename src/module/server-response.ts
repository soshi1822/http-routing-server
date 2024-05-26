import { createDeflate, createGzip, Deflate, Gzip } from 'zlib';
import { IncomingMessage, ServerResponse } from 'http';

export class ServerResponseData extends ServerResponse {
    private output?: Gzip | Deflate;

    timeline = {
        response: <Date | null>null
    };


    constructor(req: IncomingMessage) {
        super(req);

        this.on('close', () => this.timeline.response = new Date());
    }

    get getContentEncodingEnable() {
        return (this.output && this.getHeader('content-encoding')) ?? null;
    }

    write(chunk: any, callback?: (error: Error | null | undefined) => void): boolean;

    write(chunk: any, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void): boolean;

    write(...args: any[]): boolean {
        return this.output?.write(args[0], args[1], args[2]) ?? super.write(args[0], args[1], args[2]);
    }

    end(cb?: () => void): this;

    end(chunk: any, cb?: () => void): this;

    end(chunk: any, encoding?: BufferEncoding, cb?: () => void): this;

    end(...args: any[]): this {
        if (args[0] && typeof args[0] !== 'function') {
            if (typeof args[1] !== 'function') {
                this.write(args[0], args[1]);
                if (this.output) {
                    this.output.end(args[2]);
                } else {
                    super.end(args[2]);
                }
            } else {
                this.write(args[0]);
                if (this.output) {
                    this.output.end(args[1]);
                } else {
                    super.end(args[1]);
                }
            }
        } else {
            if (this.output) {
                this.output.end(args[0]);
            } else {
                super.end(args[0]);
            }
        }

        return this;
    }

    enableContentEncoding() {
        if (this.output) {
            return;
        }

        const acceptEncoding = this.req.headers['accept-encoding'];
        if (acceptEncoding?.includes('gzip')) {
            this.setHeader('content-encoding', 'gzip');
            this.output = createGzip();
        } else if (acceptEncoding?.includes('deflate')) {
            this.setHeader('content-encoding', 'deflate');
            this.output = createDeflate();
        }

        if (this.output) {
            this.streamWrite(this.output);
        }
    }

    private async streamWrite(output: Gzip | Deflate) {
        for await (const chunk of output) {
            super.write(chunk);
        }

        super.end();
    }


    json<T extends object>(data: T, status = this.statusCode ?? 200, isEnd = true) {
        this.writeHead(status, { 'content-type': 'application/json' });
        this.write(JSON.stringify(data));

        if (isEnd) {
            this.end();
        }
    }
}
