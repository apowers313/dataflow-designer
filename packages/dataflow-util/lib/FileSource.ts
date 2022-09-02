import {Chunk, Source, SourceMethods, SourceOpts} from "dataflow-core";
import {Parser, ParserDecodeOpts} from "stupendous-parser";
import {Readable} from "node:stream";
import {createReadStream} from "node:fs";
import path from "node:path";

interface FileSourceOpts extends Omit<SourceOpts, "pull"> {
    file: string;
    parserOpts?: ParserDecodeOpts;
}

export class FileSource extends Source {
    file: string;
    parserOpts?: ParserDecodeOpts;
    #fileReader?: ReadableStreamDefaultReader;

    constructor(opts: FileSourceOpts) {
        super({
            ... opts,
            pull: async(methods): Promise<void> => this.pull(methods),
        });

        this.file = opts.file;
        this.parserOpts = opts.parserOpts;
    }

    async pull(methods: SourceMethods): Promise<void> {
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
