import {Chunk, Source, SourceMethods, SourceOpts} from "@dataflow-designer/dataflow-core";
import {Parser, ParserDecodeOpts} from "@dataflow-designer/stupendous-parser";
import {RequestInfo, fetch} from "undici";
import {ReadableStreamDefaultReader} from "node:stream/web";

// interface UrlSourceOpts extends SourceOpts {}
interface UrlSourceOpts extends Omit<SourceOpts, "pull"> {
    request: RequestInfo;
    parserOpts?: ParserDecodeOpts;
}

/**
 * Converts a single URL into a stream of objects
 */
export class UrlSource extends Source {
    #dataReader: ReadableStreamDefaultReader | null = null;
    request: RequestInfo;
    parserOpts: ParserDecodeOpts;

    /**
     * Creates a new URL source
     *
     * @param opts - Options for decoding the stream
     */
    constructor(opts: UrlSourceOpts) {
        super({
            pull: (methods) => this.pull(methods),
        });
        this.request = opts.request;
        this.parserOpts = opts.parserOpts ?? {};
    }

    /**
     * Pulls a single object from the stream. Typically called automatically by ReadableStream
     *
     * @param methods - Methods for interacting with the stream, passed in by dataflow-core.
     * @returns a Promise that resolves when the pull request has completed
     */
    async pull(methods: SourceMethods): Promise<void> {
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

    /**
     * Initializes the source. Typically called automatically by `.complete()`
     */
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
        if (!contentType) {
            throw new Error("no content type header was found");
        }

        const parser = Parser.getParserStreamForMimeType(contentType, "decode", this.parserOpts);
        if (!parser) {
            throw new Error(`parser not found for content type: '${contentType}'`);
        }

        this.#dataReader = dataStream
            .pipeThrough(parser)
            .getReader();

        await super.init();
    }
}
