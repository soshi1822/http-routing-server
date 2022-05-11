import { IncomingMessage, ServerResponse } from 'http';

export class ServerResponseData extends ServerResponse {
    timeline = {
        response: <Date | null>null
    };

    constructor(req: IncomingMessage) {
        super(req);

        this.on('close', () => this.timeline.response = new Date());
    }

    json<T extends object>(data: T, status = this.statusCode ?? 200, isEnd = true) {
        this.writeHead(status, { 'content-type': 'application/json' });
        this.write(JSON.stringify(data));

        if (isEnd) {
            this.end();
        }
    }
}
