import {ParserDecodeOpts, ParserEncodeOpts} from "./ParserOpts";
import {ReadableStream, ReadableStreamDefaultReader, TransformStream} from "node:stream/web";
import {Parser} from "./Parser";

export interface DataCollectionEntryCfg<TMetadata> {
    path: string;
    stream: ReadableStream;
    metadata: TMetadata;
}

export abstract class DataCollectionEntry<TMetadata extends Record<any, any> = Record<any, any>> {
    metadata: TMetadata;
    stream: ReadableStream;
    path: string;

    constructor(cfg: DataCollectionEntryCfg<TMetadata>) {
        this.stream = cfg.stream;
        this.path = cfg.path;
        this.metadata = cfg.metadata;
    }

    abstract discard(): void;
    abstract done(): void;
}

export interface DataCollectionEncodeCfg {
    parserOpts?: ParserEncodeOpts;
}

export interface DataCollectionDecodeCfg {
    collectionStream: TransformStream<any, DataCollectionEntry>;
    parserOpts?: ParserDecodeOpts;
}

export abstract class DataCollection extends Parser {
    abstract type: string;

    encode(opts: DataCollectionEncodeCfg): TransformStream {
        return new TransformStream();
    }

    decode(cfg: DataCollectionDecodeCfg): TransformStream {
        const {writable} = cfg.collectionStream;
        const collectionReader = cfg.collectionStream.readable.getReader();
        let currentEntry: DataCollectionEntry;
        const needEntry = true;
        let entryReader: ReadableStreamDefaultReader;

        const getNextEntry = async(controller: ReadableStreamController<any>): Promise<boolean> => {
            const iter = await collectionReader.read();
            if (iter.done) {
                console.log("collection reader done");
                controller.close();
                return false;
            }

            currentEntry = iter.value;
            // console.log("currentEntry", currentEntry);
            // console.log("getting parser with opts", cfg.parserOpts);
            const fileParser = Parser.getParserStreamForPath(currentEntry.path, "decode", cfg.parserOpts);
            if (!fileParser) {
                throw new Error(`file parser not found for: '${currentEntry.path}'`);
            }

            const s = currentEntry.stream.pipeThrough(fileParser);
            // const s = currentEntry.stream;
            entryReader = s.getReader();
            return true;
        };

        const readable = new ReadableStream({
            start: async(controller): Promise<void> => {
                await getNextEntry(controller);
            },
            pull: async(controller): Promise<void> => {
                // console.log("read requested for", currentEntry?.path);
                // if (needEntry) {
                //     needEntry = false;
                //     console.log("getting next entry");
                //     if (!await getNextEntry(controller)) {
                //         return;
                //     }
                // }

                let iter: ReadableStreamDefaultReadResult<any>;
                do {
                    iter = await entryReader.read();
                    if (iter.done) {
                        console.log("entry stream done");
                        if (!await getNextEntry(controller)) {
                            return;
                        }
                    }
                } while (iter.done);

                const entryData = iter.value;
                // console.log("entryData", entryData);
                controller.enqueue(entryData);
            },
        });

        return {writable, readable};
    }
}

