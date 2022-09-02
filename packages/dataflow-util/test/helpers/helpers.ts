import {Chunk, DataChunk, Source, SourceMethods} from "dataflow-core";
import {MockAgent, setGlobalDispatcher} from "undici";
import {readFileSync} from "fs";
import path from "node:path";

const debug = false;
let debugf: typeof console.log;
if (debug) {
    debugf = console.log;
} else {
    debugf = (): void => { /* do nothing */ };
}

const mockAgent = new MockAgent();
mockAgent.disableNetConnect();
setGlobalDispatcher(mockAgent);

export interface MockUrlOpts {
    method?: string;
    status?: number;
    contentType?: string;
    headers?: Record<any, any>;
    interceptOpts?: Record<any, any>;
}

type ClientType = ReturnType<MockAgent["get"]>;
type TIntercept = ReturnType<ClientType["intercept"]>;
type MockOptions = NonNullable<Parameters<TIntercept["reply"]>[2]>;
// type MockHeaders = NonNullable<MockOptions["headers"]>;
const clientCache: Map<string, ClientType> = new Map();

export function setMockUrl(urlStr: string, datapath: string, opts: MockUrlOpts = {}): void {
    const url = new URL(urlStr);
    const fullUrlStr: string = url.pathname + url.search;
    const method = opts.method ?? "GET";
    const status = opts.status ?? 200;
    // const contentType = opts.contentType ?? "application/json; charset=utf-8";

    const clientStr = `${url.protocol}//${url.host}`;
    let client = clientCache.get(clientStr);
    if (!client) {
        debugf("Creating new intercept for:", clientStr);
        client = mockAgent.get(clientStr);
        clientCache.set(clientStr, client);
    }

    let interceptOpts: MockOptions;
    if (!opts.interceptOpts) {
        interceptOpts = {};
        if (!opts.headers) {
            interceptOpts.headers = {};
            if (!opts.contentType) {
                interceptOpts.headers["content-type"] = "application/json; charset=utf-8";
            } else {
                interceptOpts.headers["content-type"] = opts.contentType;
            }
        } else {
            interceptOpts.headers = opts.headers;
        }
    } else {
        ({interceptOpts} = opts);
    }

    const data = readFileSync(path.resolve(__dirname, "data", datapath));

    debugf("Mocking:", fullUrlStr, method, status, datapath, interceptOpts);
    client
        .intercept({path: fullUrlStr, method})
        .reply(status, data, interceptOpts);
}

export function objectSource(objs: Array<Record<any, any>>): Source {
    let curr = 0;
    return new Source({
        pull: async(methods): Promise<void> => {
            if (curr > (objs.length - 1)) {
                console.log("source finished");
                await methods.finished();
                return;
            }

            const next = objs[curr];
            curr++;

            const chunk = Chunk.create({type: "data", data: next});
            await methods.send(0, chunk);
        },
    });
}

export async function timeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export interface TestSourceOpts {
    countBy?: number;
    delay?: number;
    sendNum?: number;
    includeId?: boolean;
}

let cnt = 0;
export class TestSource extends Source {
    countBy: number;
    delay: number;
    sendNum: number;
    count: number;
    id: number;
    includeId: boolean;

    constructor(opt: TestSourceOpts = {}) {
        super({
            pull: (methods) => {
                return this.testPull.call(this, methods);
            },
            name: "test-source",
        });

        this.id = cnt++;
        this.includeId = opt.includeId ?? false;
        this.countBy = opt.countBy ?? 1;
        this.delay = opt.delay ?? 0;
        this.sendNum = opt.sendNum ?? 10;
        if (opt.countBy === undefined) {
            this.count = 0;
        } else {
            this.count = opt.countBy;
        }
    }

    async testPull(this: TestSource, methods: SourceMethods): Promise<void> {
        if (this.delay) {
            await timeout(this.delay);
        }

        if (this.count > (this.sendNum * this.countBy)) {
            await methods.finished();
            return;
        }

        const next = Chunk.create({type: "data", data: {count: this.count}}) as DataChunk;
        if (this.includeId) {
            next.data.id = this.id;
        }

        this.count += this.countBy;
        await methods.send(0, next);
    }
}
