import {Chunk, Source, SourceMethods, SourceOpts} from "dataflow-core";
import {Parser, ParserDecodeOpts} from "stupendous-parser";
import {RequestInfo, fetch} from "undici";
import {TransformStream} from "node:stream/web";

// interface UrlSourceOpts extends SourceOpts {}
interface UrlSourceOpts extends Omit<SourceOpts, "pull"> {
    request: RequestInfo
    parserOpts?: ParserDecodeOpts
}

export class UrlSource extends Source {
    #dataReader: ReadableStreamDefaultReader | null = null;
    request: RequestInfo;
    parserOpts: ParserDecodeOpts;

    constructor(opts: UrlSourceOpts) {
        super({
            pull: (methods) => this.pull(methods),
        });
        this.request = opts.request;
        this.parserOpts = opts.parserOpts ?? {};
    }

    async pull(methods: SourceMethods): Promise<void> {
        await this.started;
        if (!this.#dataReader) {
            await methods.finished();
            return;
        }

        const iter = await this.#dataReader.read();

        if (iter.done) {
            await methods.finished();
            return;
        }

        const chunk = Chunk.create({type: "data", data: iter.value});
        await methods.send(0, chunk);
    }

    async init(): Promise<void> {
        const response = await fetch(this.request);
        if (response.status < 200 || response.status > 299) {
            throw new Error(`error getting URL: ${response.statusText}`);
        }

        const dataStream = response.body;
        if (!dataStream) {
            throw new Error("no body in HTTP response");
        }

        const contentType = response.headers.get("content-type");
        console.log("content type", contentType);
        if (!contentType) {
            throw new Error("no content type header was found");
        }

        console.log("Parser.getParserStreamForMimeType");
        const parser = Parser.getParserStreamForMimeType(contentType, "decode", this.parserOpts);
        if (!parser) {
            throw new Error(`parser not found for content type: '${contentType}'`);
        }

        console.log("doing pipe");
        this.#dataReader = dataStream
            // .pipeThrough(new TransformStream({
            //     transform: (chunk, controller): void => {
            //         console.log("chunk", chunk);
            //         controller.enqueue(chunk);
            //     },
            // }))
            .pipeThrough(parser)
            // .pipeThrough(new TransformStream({
            //     transform: (chunk, controller): void => {
            //         console.log("after", chunk);
            //         controller.enqueue(chunk);
            //     },
            // }))
            .getReader();

        await super.init();
    }
}
