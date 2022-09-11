import {Chunk, DataChunk, ManualThroughMethods, Through, ThroughOpts} from "@dataflow-designer/dataflow-core";
import {RequestInfo, RequestInit, fetch} from "undici";
import {UrlDataCollection, UrlDataEntry} from "./UrlDataCollection";
import Handlebars from "handlebars";
import {ParserDecodeOpts} from "@dataflow-designer/stupendous-parser";

interface UrlThroughOpts extends Omit<ThroughOpts, "through"> {
    request?: RequestInfo;
    parserOpts?: ParserDecodeOpts;
    fetchOpts?: RequestInit;
    url: string;
}

export class UrlThrough extends Through {
    #url: string;
    #fetchOpts: RequestInit;
    #fetchTemplates: FetchTemplates;
    #parserOpts: ParserDecodeOpts;
    #outputReader: ReadableStreamDefaultReader | undefined;

    constructor(cfg: UrlThroughOpts) {
        super({
            ... cfg,
            manualRead: true,
            through: (methods) => this.through(methods),
        });

        this.#url = cfg.url;
        this.#fetchOpts = cfg.fetchOpts ?? {};
        this.#parserOpts = cfg.parserOpts ?? {};
        this.#fetchTemplates = createTemplates(cfg.url, this.#fetchOpts);
    }

    async through(methods: ManualThroughMethods): Promise<void> {
        if (!this.#outputReader) {
            this.#outputReader = await this.#getDecodeReader(methods);
        }

        const {value, done} = await this.#outputReader.read();
        if (done) {
            await this.#outputReader.closed;
            methods.finished();
            return;
        }

        const chunk = Chunk.create({type: "data", data: value});
        await methods.send(0, chunk);
    }

    async #getDecodeReader(methods: ManualThroughMethods): Promise<ReadableStreamDefaultReader> {
        const objSource = new ReadableStream({
            pull: async(controller): Promise<void> => {
                const chunk = await methods.read();

                if (!chunk) {
                    controller.close();
                    return;
                }

                if (!chunk.isData()) {
                    return;
                }

                const ude = await this.#getUrl(chunk);
                controller.enqueue(ude);
            },
        });

        const udc = new UrlDataCollection();
        const fetchObjStream = udc.decode({parserOpts: this.#parserOpts});
        const parsedStream = objSource.pipeThrough(fetchObjStream);

        return parsedStream.getReader();
    }

    async #getUrl(chunk: Chunk): Promise<UrlDataEntry> {
        const {url, opts} = applyTemplates(this.#fetchTemplates, chunk, this.#url, this.#fetchOpts);

        const response = await fetch(url, opts);

        if (response.status < 200 || response.status > 299) {
            throw new Error(`error getting URL: ${response.statusText}`);
        }

        const httpStream = response.body;
        if (!httpStream) {
            throw new Error("HTTP request did not produce a body");
        }

        return new UrlDataEntry({
            path: url.toString(),
            stream: httpStream,
            metadata: {
                response: response,
                request: url,
            },
        });
    }
}

interface FetchTemplates {
    url: HandlebarsTemplateFn | null;
}

function createTemplates(url: string, opts: RequestInit): FetchTemplates {
    let urlTemplate: HandlebarsTemplateFn | null = null;

    url = url.replace("%7B%7B", "{{").replace("%7D%7D", "}}");
    if (isHandlebars(url)) {
        urlTemplate = Handlebars.compile(url);
    }

    // chunk.data.url
    // chunk.data.body
    // chunk.data.query
    // chunk.data.method

    return {
        url: urlTemplate,
    };
}

interface FetchOpts {
    url: RequestInfo;
    opts: RequestInit;
}

function applyTemplates(templates: FetchTemplates, chunk: Chunk, url: RequestInfo, opts: RequestInit): FetchOpts {
    if (templates.url) {
        const ctx = buildHandlebarsContext(chunk);
        url = templates.url(ctx);
    }

    return {
        url,
        opts,
    };
}

/* ---- move everything below to dataflow-core ---- */

type HandlebarsTemplateFn = ReturnType<typeof Handlebars.compile<HandlebarsContext>>;

function isHandlebars(str: string): boolean {
    const handlebarsPattern = /{{[^}]*}}/;
    return handlebarsPattern.test(str);
}

interface HandlebarsContext {
    type: Chunk["type"];
    data: Record<string | number | symbol, unknown>;
    // error: Error | null;
    // metadata: MetadataChunk["metadata"];
    // nodeRedGlobal: Record<string|number|symbol, unknown>;
    // nodeRedFlow: Record<string|number|symbol, unknown>;
    // globalThis: Record<string|number|symbol, unknown>;
    // credentials?: Record<string|number|symbol, unknown>;
}

function buildHandlebarsContext(chunk: Chunk, _inclCreds = false): HandlebarsContext {
    let dataChunk: DataChunk | null = null;
    if (chunk.isData()) {
        dataChunk = chunk;
    }

    return {
        type: "data",
        data: dataChunk?.data ?? {},
        // nodeRedGlobal: {},
        // nodeRedFlow: {},
        // globalThis: {},
        // credentials: {},
    };
}
