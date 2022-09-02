import {Chunk, ChunkCollection, Sink, SinkMethods, SinkOpts} from "dataflow-core";
import {Parser, ParserEncodeOpts} from "stupendous-parser";
import {TransformStream} from "node:stream/web";
import {Writable} from "node:stream";
import {createWriteStream} from "fs";

interface FileSinkOpts extends Omit<SinkOpts, "push"> {
    file: string;
    parserOpts?: ParserEncodeOpts;
}

export class FileSink extends Sink {
    file: string;
    parserOpts?: ParserEncodeOpts;
    #fileWriter?: WritableStreamDefaultWriter;
    #parserStream?: TransformStream;

    constructor(opts: FileSinkOpts) {
        super({
            ... opts,
            push: (chunk, methods) => this.push(chunk, methods),
            writeClose: async(): Promise<void> => {
                if (this.#fileWriter) {
                    await this.#fileWriter.close();
                }
            },
        });

        this.file = opts.file;
        this.parserOpts = opts.parserOpts;
    }

    async push(chunk: Chunk | ChunkCollection, _methods: SinkMethods): Promise<void> {
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
