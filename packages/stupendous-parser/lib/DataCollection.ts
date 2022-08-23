import {Interlock, timeout} from "./utils";
import {ParserDecodeOpts, ParserEncodeOpts} from "./ParserOpts";
import {ReadableStream, ReadableStreamDefaultReader, TransformStream} from "node:stream/web";
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

export interface DataCollectionDecodeCfg {
    parserOpts?: ParserDecodeOpts;
}

export abstract class DataCollection extends Parser {
    abstract type: string;

    encode(opt: DataCollectionEncodeCfg = {}): TransformStream {
        const inMemory = opt.inMemory ?? false;
        const fc = new FileCache<DataCollectionEntry>({fdLimit: opt.fdLimit, inMemory});
        const filenameProp = opt.filenameProp ?? "filename";
        const rwConnector = new Interlock<DataCollectionEntry>();

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

                    await rwConnector.send(de);
                }

                await fc.delete();
                await rwConnector.send(null);
            },
        });

        const readable = new ReadableStream({
            pull: async(controller): Promise<void> => {
                const cacheEntry = await rwConnector.recv();
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

    decode(cfg: DataCollectionDecodeCfg): TransformStream<DataCollectionEntry> {
        let entryReader: ReadableStreamDefaultReader;
        const rwConnector = new Interlock<DataCollectionEntry>();

        const getNextEntry = async(controller: ReadableStreamController<any>): Promise<boolean> => {
            const currentEntry = await rwConnector.recv();
            if (!currentEntry) {
                controller.close();
                return false;
            }

            const fileParser = Parser.getParserStreamForPath(currentEntry.path, "decode", cfg.parserOpts);
            if (!fileParser) {
                throw new Error(`file parser not found for: '${currentEntry.path}'`);
            }

            const s = currentEntry.stream.pipeThrough(fileParser);
            entryReader = s.getReader();
            return true;
        };

        const writable = new WritableStream<DataCollectionEntry>({
            write: async(chunk): Promise<void> => {
                await rwConnector.send(chunk);
            },
            close: async(): Promise<void> => {
                await rwConnector.send(null);
            },
        });

        const readable = new ReadableStream({
            start: async(controller): Promise<void> => {
                await getNextEntry(controller);
            },
            pull: async(controller): Promise<void> => {
                let iter: ReadableStreamDefaultReadResult<any>;
                do {
                    iter = await entryReader.read();
                    if (iter.done) {
                        if (!await getNextEntry(controller)) {
                            return;
                        }
                    }
                } while (iter.done);

                const entryData = iter.value;
                controller.enqueue(entryData);
            },
        });

        return {writable, readable};
    }
}

