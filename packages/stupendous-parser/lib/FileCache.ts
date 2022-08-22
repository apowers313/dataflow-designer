/* eslint-disable jsdoc/require-jsdoc */
import {close, closeSync, createReadStream, fsyncSync, open, write} from "node:fs";
import {JsonParser} from "./JsonParser";
import {Readable} from "node:stream";
import {ReadableStream} from "node:stream/web";
import {promisify} from "node:util";
import temp from "temp";

const fsWrite = promisify(write);
const fsOpen = promisify(open);
const fsClose = promisify(close);

export interface FileCacheOpt {
    fdLimit?: number;
    inMemory?: boolean;
}

export class FileCache<TCacheType extends Record<any, any>> {
    fdMap: Map<string, CacheEntry<TCacheType>> = new Map();
    fdLimit: number;
    inMemory: boolean;

    constructor(opt: FileCacheOpt = {}) {
        this.inMemory = opt.inMemory ?? false;
        this.fdLimit = opt.fdLimit ?? 512;
        temp.track();
    }

    async write(path: string, obj: Record<any, any>): Promise<void> {
        let cacheEntry = this.fdMap.get(path);
        if (!cacheEntry) {
            if (this.inMemory) {
                cacheEntry = new MemoryCacheEntry<TCacheType>(this, path);
            } else {
                cacheEntry = new FileCacheEntry<TCacheType>(this, path);
            }

            this.fdMap.set(path, cacheEntry);
        }

        await cacheEntry.write(obj);
        // await cacheEntry.write(`${JSON.stringify(obj)}\n`);
    }

    get(path: string): ReadableStream<TCacheType> {
        const cacheEntry = this.fdMap.get(path);
        if (!cacheEntry) {
            throw new Error(`cacheEntry not found: '${path}'`);
        }

        return cacheEntry.toStream();
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

    async delete(): Promise<void> {
        await temp.cleanup();
    }

    [Symbol.iterator](): IterableIterator<CacheEntry<TCacheType>> {
        return this.fdMap.values();
    }
}

interface CacheEntry<TCacheType> {
    done: boolean;
    lastWrite: number;
    path: string;
    fc: FileCache<TCacheType>;
    // new (fc: FileCache<TCacheType>, path: string): CacheEntry<TCacheType>;
    // new(fc: FileCache<TCacheType>, path: string): CacheEntry<TCacheType>;
    write: (obj: Record<any, any>) => Promise<void>;
    close: () => Promise<void>;
    open: () => Promise<void>;
    get isOpen(): boolean;
    toStream(): ReadableStream<TCacheType>;
}

export class FileCacheEntry<TCacheType> implements CacheEntry<TCacheType> {
    #tmpFileFd: number | undefined;
    #tmpFilePath: string | undefined;
    done = false;
    lastWrite = -1;
    path: string;
    fc: FileCache<TCacheType>;

    constructor(fc: FileCache<TCacheType>, path: string) {
        this.#tmpFilePath = temp.path();
        this.fc = fc;
        this.path = path;
    }

    async write(obj: Record<any, any>): Promise<void> {
        const str = `${JSON.stringify(obj)}\n`;

        if (this.done) {
            throw new Error("attempting to write after completion");
        }

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
        if (this.done) {
            throw new Error("attempting to close after completion");
        }

        if (this.#tmpFileFd === undefined) {
            throw new Error("internal error: tmpFileFd undefined");
        }

        await fsClose(this.#tmpFileFd);
        this.#tmpFileFd = undefined;
    }

    async open(): Promise<void> {
        if (this.done) {
            throw new Error("attempting to open after completion");
        }

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

    toStream(): ReadableStream<TCacheType> {
        if (this.#tmpFileFd === undefined) {
            throw new Error("internal error: tmpFileFd undefined");
        }

        closeSync(this.#tmpFileFd);
        // fsyncSync(this.#tmpFileFd);
        this.#tmpFileFd = undefined;
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

export class MemoryCacheEntry<TCacheType> implements CacheEntry<TCacheType> {
    done = false;
    lastWrite = -1;
    path: string;
    fc: FileCache<TCacheType>;
    #objList: Array<Record<any, any>> = [];

    constructor(fc: FileCache<TCacheType>, path: string) {
        this.fc = fc;
        this.path = path;
    }

    async write(obj: Record<any, any>): Promise<void> {
        console.log("memory write", obj);
        this.#objList.push(obj);
    }

    async close(): Promise<void> {}

    async open(): Promise<void> {}

    get isOpen(): boolean {
        return false;
    }

    toStream(): ReadableStream<TCacheType> {
        return new ReadableStream({
            pull: (controller): void => {
                if (this.#objList.length === 0) {
                    controller.close();
                    return;
                }

                const data = this.#objList.shift();
                console.log("memory sending", data);
                controller.enqueue(data);
            },
        });
    }
}
