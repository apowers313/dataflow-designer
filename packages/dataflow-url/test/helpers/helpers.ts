import {MockAgent, setGlobalDispatcher} from "undici";
import {helpers} from "@dataflow-designer/dataflow-core";
import path from "node:path";
import {readFileSync} from "fs";
export const {TestSource, timeout, objectSource} = helpers;

const disableMocks = false;
const debug = false;
let debugf: typeof console.log;
if (debug) {
    debugf = console.log;
} else {
    debugf = (): void => { /* do nothing */ };
}

const mockAgent = new MockAgent();
if (!disableMocks) {
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
}

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
