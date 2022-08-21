import {ParserDecodeOpts, ParserEncodeOpts} from "./ParserOpts";
import {ReadableStream, ReadableStreamDefaultReader, TransformStream} from "node:stream/web";
import {close, createReadStream, open, write} from "node:fs";
import {JsonParser} from "./JsonParser";
import {Parser} from "./Parser";
import {Readable} from "node:stream";
import {promisify} from "node:util";
import temp from "temp";

const fsWrite = promisify(write);
const fsOpen = promisify(open);
const fsClose = promisify(close);

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

type ResolveFn = (... args: any[]) => void;

class Interlock {
    #writeDone!: Promise<DataCollectionEntry>;
    #writeResolve!: ResolveFn;
    #readDone!: Promise<void>;
    #readResolve!: ResolveFn;

    constructor() {
        this.reset();
    }

    async send(data: DataCollectionEntry | null): Promise<void> {
        this.#writeResolve(data);
        await this.#readDone;
    }

    async recv(): Promise<DataCollectionEntry | null> {
        const data = await this.#writeDone;
        this.#readResolve();
        this.reset();
        return data;
    }

    reset(): void {
        this.#writeDone = new Promise((resolve) => {
            this.#writeResolve = resolve;
        });

        this.#readDone = new Promise((resolve) => {
            this.#readResolve = resolve;
        });
    }
}

class FileCacheEntry {
    #tmpFileFd: number | undefined;
    #tmpFilePath: string | undefined;
    done = false;
    lastWrite = -1;
    path: string;
    fc: FileCache;

    constructor(fc: FileCache, path: string) {
        this.#tmpFilePath = temp.path();
        this.fc = fc;
        this.path = path;
    }

    async write(str: string): Promise<void> {
        if (!this.isOpen) {
            await this.open();
        }

        if (this.#tmpFileFd === undefined) {
            throw new Error("internal error: tmpFileFd undefined");
        }

        this.lastWrite = Date.now();
        await fsWrite(this.#tmpFileFd, str);
    }

    async close(): Promise<void> {
        if (this.#tmpFileFd === undefined) {
            throw new Error("internal error: tmpFileFd undefined");
        }

        await fsClose(this.#tmpFileFd);
        this.#tmpFileFd = undefined;
    }

    async open(): Promise<void> {
        this.fc.enforceOpenLimit();

        if (this.#tmpFilePath) {
            this.#tmpFileFd = await fsOpen(this.#tmpFilePath, "a");
        } else {
            const info = await temp.open(undefined);
            this.#tmpFileFd = info.fd;
            this.#tmpFilePath = info.path;
        }
    }

    get isOpen(): boolean {
        return this.#tmpFileFd !== undefined;
    }

    toStream(): ReadableStream<DataCollectionEntry> {
        this.done = true;
        if (!this.#tmpFilePath) {
            throw new Error("internal error: tmpFilePath not defined");
        }

        // convert objects back into streams
        const outputStream = Readable
            .toWeb(createReadStream(this.#tmpFilePath))
            .pipeThrough(new JsonParser().decode({ndjson: true}));
        return outputStream;
    }
}

interface FileCacheOpt {
    fdLimit?: number;
}

class FileCache {
    fdMap: Map<string, FileCacheEntry> = new Map()
    fdLimit: number;

    constructor(opt: FileCacheOpt = {}) {
        this.fdLimit = opt.fdLimit ?? 512;
        temp.track();
    }

    async write(path: string, obj: Record<any, any>): Promise<void> {
        let fileCacheEntry = this.fdMap.get(path);
        if (!fileCacheEntry) {
            fileCacheEntry = new FileCacheEntry(this, path);
            this.fdMap.set(path, fileCacheEntry);
        }

        await fileCacheEntry.write(`${JSON.stringify(obj)}\n`);
    }

    get(path: string): ReadableStream<DataCollectionEntry> {
        const fileCacheEntry = this.fdMap.get(path);
        if (!fileCacheEntry) {
            throw new Error(`fileCacheEntry not found: '${path}'`);
        }

        return fileCacheEntry.toStream();
    }

    enforceOpenLimit(): void {
        const cacheList = [... this.fdMap.values()].filter((c) => c.isOpen);

        if ((cacheList.length + 1) > this.fdLimit) {
            cacheList
                // sort by files with the oldest write time
                .sort((a, b) => {
                    return a.lastWrite - b.lastWrite;
                })
                // pick the oldest 50
                .slice(0, 50)
                // close the oldest 50
                .forEach((cacheEntry) => cacheEntry.close());
        }
    }

    [Symbol.iterator](): IterableIterator<FileCacheEntry> {
        return this.fdMap.values();
    }
}

export interface DataCollectionEncodeCfg {
    parserOpts?: ParserEncodeOpts;
    filenameProp?: string;
    fdLimit?: number;
}

export interface DataCollectionDecodeCfg {
    parserOpts?: ParserDecodeOpts;
}

export abstract class DataCollection extends Parser {
    abstract type: string;

    encode(opt: DataCollectionEncodeCfg = {}): TransformStream {
        const fc = new FileCache({fdLimit: opt.fdLimit});
        const filenameProp = opt.filenameProp ?? "filename";
        const rwConnector = new Interlock();

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

                await rwConnector.send(null);
                await temp.cleanup();
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
        const rwConnector = new Interlock();

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

