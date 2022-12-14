import {Chunk, ChunkCollection, Sink, SinkMethods, SinkOpts} from "@dataflow-designer/dataflow-core";
import {Parser, ParserEncodeOpts} from "@dataflow-designer/stupendous-parser";
import {TransformStream, WritableStreamDefaultWriter} from "node:stream/web";
import {Writable} from "node:stream";
import {createWriteStream} from "fs";

interface FileSinkOpts extends Omit<SinkOpts, "push"> {
    file: string;
    parserOpts?: ParserEncodeOpts;
}

/**
 * Converts a stream of objects into a file with the specified encoding
 */
export class FileSink extends Sink {
    file: string;
    parserOpts?: ParserEncodeOpts;
    #fileWriter?: WritableStreamDefaultWriter;
    #parserStream?: TransformStream;

    /**
     * Creates a new file sink
     *
     * @param opts - The options for the new file sink
     */
    constructor(opts: FileSinkOpts) {
        super({
            ... opts,
            mode: "fifo",
            push: (chunk, methods) => this.#push(chunk, methods),
            writeClose: async(): Promise<void> => {
                if (this.#fileWriter) {
                    await this.#fileWriter.close();
                }
            },
        });

        this.file = opts.file;
        this.parserOpts = opts.parserOpts;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #push(chunk: Chunk | ChunkCollection, _methods: SinkMethods): Promise<void> {
        if (!this.#fileWriter) {
            return;
        }

        if (chunk instanceof ChunkCollection) {
            throw new Error("chunk collection ignored");
        } else {
            if (!chunk.isData()) {
                return;
            }

            await this.#fileWriter.write(chunk.data);
        }
    }

    /**
     * Typically called by the `.complete()` function from dataflow-core to initialize this component
     */
    async init(): Promise<void> {
        const fileStream = Writable.toWeb(createWriteStream(this.file));

        this.#parserStream = Parser.getParserStreamForPath(this.file, "encode", this.parserOpts);
        if (!this.#parserStream) {
            throw new Error(`parser not found for file: '${this.file}'`);
        }

        this.#fileWriter = this.#parserStream.writable.getWriter();

        await super.init();

        await this.#parserStream.readable.pipeTo(fileStream);
    }
}
