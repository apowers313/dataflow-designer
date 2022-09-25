import {ParserDecodeOpts, ParserEncodeOpts} from "./ParserOpts";
import {ReadableStream, ReadableStreamController, ReadableStreamDefaultReader, TransformStream, WritableStream} from "node:stream/web";
import {FileCache} from "./FileCache";
import {Interlock} from "./utils";
import {Parser} from "./Parser";

export interface DataCollectionEntryCfg<TMetadata> {
    path: string;
    stream: ReadableStream;
    metadata: TMetadata;
}

/**
 * An abstract class representing a single file or resource stream and it's associated metadata
 */
export abstract class DataCollectionEntry<TMetadata extends Record<any, any> = Record<any, any>> {
    metadata: TMetadata;
    stream: ReadableStream;
    path: string;

    /**
     * Creates a new data entry
     *
     * @param cfg - The configuration for creating a new data entry
     */
    constructor(cfg: DataCollectionEntryCfg<TMetadata>) {
        this.stream = cfg.stream;
        this.path = cfg.path;
        this.metadata = cfg.metadata;
    }

    abstract discard(): void;
    abstract done(): void;
}

class GenericDataCollectionEntry extends DataCollectionEntry {
    discard(): void { /* ignored */ }
    done(): void { /* ignored */ }
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

/**
 * An abstract class representing a collection of files, for example a .zip file or a directory of files
 */
export abstract class DataCollection extends Parser {
    abstract type: string;

    /**
     * Encodes a stream of streams into single byte stream representing the data collection
     *
     * @param opt - Options for encoding the data collection
     * @returns a TransformStream that converts a stream of streams into a byte stream
     */
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

    /**
     * Decodes a byte stream into a stream of streams, where each stream represents a file or other resource
     *
     * @param cfg - Configuration for the decoder
     * @returns a TransformStream that consumes a byte stream and emits a stream of streams
     */
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

            const s = currentEntry.stream.pipeThrough(fileParser);

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
