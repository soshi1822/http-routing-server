import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { RouteingParams } from '../type';

export class IncomingMessageData<P = any> extends IncomingMessage {
    routeUrl?: string;
    params: RouteingParams<P> = <any>{};
    cookies = new Map<string, string>();

    timeline = {
        connecting: new Date(),
        purseEnd: <Date | null>null
    };

    private bodyChunks: Buffer[] = [];
    private isOneReadable = false;

    constructor(socket: Socket) {
        super(socket);

        this.timeline.purseEnd = new Date();

        this.on('readable', () => this.onReadable());
        this.once('end', () => this.timeline.purseEnd = new Date());
    }

    get query(): URLSearchParams {
        return new URL(this.url ?? '', 'http://127.0.0.1').searchParams;
    }

    async json<T>() {
        const body = this.body();
        return JSON.parse(body.toString('utf-8'));
    }

    body() {
        return Buffer.concat(this.bodyChunks);
    }

    private onReadable() {
        const initMode = !this.isOneReadable;
        this.isOneReadable = true;

        if (initMode) {
            this.headers.cookie
                ?.split(/;\s+?/)
                .map(v => <[string, string]>v.split('=').map(t => t.trim()))
                .forEach(([k, v]) => this.cookies.set(k, v));

        }

        let data;
        while (data = this.read()) {
            if (this.listenerCount('data') > 0) {
                this.emit('data', data);
            }

            if (initMode) {
                this.bodyChunks.push(data);
            }
        }
    }
}
