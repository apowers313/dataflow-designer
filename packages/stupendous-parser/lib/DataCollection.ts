import {Interlock, timeout} from "./utils";
import {ParserDecodeOpts, ParserEncodeOpts} from "./ParserOpts";
import {ReadableStream, ReadableStreamDefaultReadResult, ReadableStreamDefaultReader, TransformStream} from "node:stream/web";
import {FileCache} from "./FileCache";
import {Parser} from "./Parser";
import {resolve} from "node:path";

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

class GenericDataCollectionEntry extends DataCollectionEntry {
    discard(): void {}
    done(): void {}
}

export interface DataCollectionEncodeCfg {
    parserOpts?: ParserEncodeOpts;
    filenameProp?: string;
    fdLimit?: number;
    inMemory?: boolean;
}

export type CustomParserFn<TMetadata = any> = (entry: TMetadata, parserOpts?: ParserDecodeOpts) => TransformStream | undefined;

export interface DataCollectionDecodeCfg {
    parserOpts?: ParserDecodeOpts;
    customParserFn?: CustomParserFn;
}

export abstract class DataCollection extends Parser {
    abstract type: string;

    encode(opt: DataCollectionEncodeCfg = {}): TransformStream {
        const inMemory = opt.inMemory ?? false;
        const fc = new FileCache<DataCollectionEntry>({fdLimit: opt.fdLimit, inMemory});
        const filenameProp = opt.filenameProp ?? "filename";
        const encodeConnector = new Interlock<DataCollectionEntry>();

        const writable = new WritableStream({
            write: async(chunk: Record<any, any>, controller): Promise<void> => {
                const path: string | undefined = chunk[filenameProp];
                if (!path) {
                    // TODO: abort?
                    controller.error(new Error(`missing property for writing to data collection: '${filenameProp}'`));
                    return;
                }

                const data = {... chunk};
                delete data[filenameProp];
                await fc.write(path, data);
            },

            close: async(): Promise<void> => {
                for (const cacheEntry of fc) {
                    const de = new GenericDataCollectionEntry({
                        stream: cacheEntry.toStream(),
                        path: cacheEntry.path,
                        metadata: {},
                    });

                    await encodeConnector.send(de);
                }

                await fc.delete();
                await encodeConnector.send(null);
            },
        });

        const readable = new ReadableStream({
            pull: async(controller): Promise<void> => {
                const cacheEntry = await encodeConnector.recv();
                if (!cacheEntry) {
                    controller.close();
                    return;
                }

                const parser = Parser.getParserStreamForPath(cacheEntry.path, "encode", opt.parserOpts);
                if (!parser) {
                    throw new Error(`file parser not found for: '${cacheEntry.path}'`);
                }

                cacheEntry.stream = cacheEntry.stream.pipeThrough(parser),
                controller.enqueue(cacheEntry);
            },
        });

        return {writable, readable};
    }

    decode(cfg: DataCollectionDecodeCfg = {}): TransformStream<DataCollectionEntry> {
        let entryReader: ReadableStreamDefaultReader;
        const decodeConnector = new Interlock<DataCollectionEntry>();
        const decodeParserGenerator: CustomParserFn = cfg.customParserFn ?? defaultDecodeParserGenerator;

        const getNextEntry = async(controller: ReadableStreamController<any>): Promise<boolean> => {
            const currentEntry = await decodeConnector.recv();
            decodeConnector.reset();

            if (!currentEntry) {
                controller.close();
                return false;
            }

            const fileParser = decodeParserGenerator(currentEntry, cfg.parserOpts);
            if (!fileParser) {
                throw new Error(`file parser not found for: '${currentEntry.path}'`);
            }

            const s = currentEntry.stream.pipeThrough(fileParser).pipeThrough(new TransformStream({
                transform: (chunk, controller): void => {
                    controller.enqueue(chunk);
                },
            }));

            entryReader = s.getReader();
            return true;
        };

        const writable = new WritableStream<DataCollectionEntry>({
            write: async(chunk): Promise<void> => {
                await decodeConnector.send(chunk);
            },
            close: async(): Promise<void> => {
                await decodeConnector.send(null);
            },
        });

        const readable = new ReadableStream({
            start: async(controller): Promise<void> => {
                if (!await getNextEntry(controller)) {
                    throw new Error("failed before we even started");
                }
            },
            pull: async function(controller): Promise<void> {
                const {done, value} = await entryReader.read();
                if (done) {
                    await entryReader.closed;
                    const moreAvailable = await getNextEntry(controller);
                    if (moreAvailable) {
                        await this.pull!(controller);
                    }

                    return;
                }

                controller.enqueue(value);

                // let iter: ReadableStreamDefaultReadResult<any>;
                // do {
                //     iter = await entryReader.read();
                //     // console.log("entryReader.read", iter);
                //     if (iter.done) {
                //         console.log("DataCollection decode entryReader done");
                //         if (!await getNextEntry(controller)) {
                //             console.log("DataCollection decode: no next entry");
                //             return;
                //         }
                //     }
                // } while (iter.done);

                // const entryData = iter.value;
                // controller.enqueue(entryData);
            },
        });

        return {writable, readable};
    }
}

function defaultDecodeParserGenerator(entry: DataCollectionEntry, parserOpts?: ParserDecodeOpts): TransformStream | undefined {
    return Parser.getParserStreamForPath(entry.path, "decode", parserOpts);
}
