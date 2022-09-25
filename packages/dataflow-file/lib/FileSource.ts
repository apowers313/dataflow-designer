import {Chunk, Source, SourceMethods, SourceOpts} from "@dataflow-designer/dataflow-core";
import {Parser, ParserDecodeOpts} from "@dataflow-designer/stupendous-parser";
import {Readable} from "node:stream";
import {ReadableStreamDefaultReader} from "node:stream/web";
import {createReadStream} from "node:fs";

interface FileSourceOpts extends Omit<SourceOpts, "pull"> {
    file: string;
    parserOpts?: ParserDecodeOpts;
}

/**
 * A Source component that reads a file, parses it, and emits the resulting objects as a stream
 */
export class FileSource extends Source {
    file: string;
    parserOpts?: ParserDecodeOpts;
    #fileReader?: ReadableStreamDefaultReader;

    /**
     * Creates a new file source
     *
     * @param opts - The options for the new file source
     */
    constructor(opts: FileSourceOpts) {
        super({
            ... opts,
            pull: async(methods): Promise<void> => this.#pull(methods),
        });

        this.file = opts.file;
        this.parserOpts = opts.parserOpts;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #pull(methods: SourceMethods): Promise<void> {
        if (!this.#fileReader) {
            await methods.finished();
            return;
        }

        const iter = await this.#fileReader.read();
        if (iter.done) {
            await methods.finished();
            return;
        }

        const chunk = Chunk.create({type: "data", data: iter.value});
        await methods.send(0, chunk);
    }

    /**
     * Typically called by the `.complete()` function from dataflow-core to initialize this component
     */
    async init(): Promise<void> {
        const fileStream = Readable.toWeb(createReadStream(this.file));

        const parser = Parser.getParserStreamForPath(this.file, "decode", this.parserOpts);
        if (!parser) {
            throw new Error(`parser not found for file: '${this.file}'`);
        }

        this.#fileReader = fileStream.pipeThrough(parser).getReader();

        await super.init();
    }
}
