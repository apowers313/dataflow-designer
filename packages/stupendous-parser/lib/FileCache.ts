import {close, createReadStream, open, write} from "node:fs";
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
}

export class FileCache<TCacheType extends Record<any, any>> {
    fdMap: Map<string, FileCacheEntry<TCacheType>> = new Map();
    fdLimit: number;

    constructor(opt: FileCacheOpt = {}) {
        this.fdLimit = opt.fdLimit ?? 512;
        temp.track();
    }

    async write(path: string, obj: Record<any, any>): Promise<void> {
        let fileCacheEntry = this.fdMap.get(path);
        if (!fileCacheEntry) {
            fileCacheEntry = new FileCacheEntry<TCacheType>(this, path);
            this.fdMap.set(path, fileCacheEntry);
        }

        await fileCacheEntry.write(`${JSON.stringify(obj)}\n`);
    }

    get(path: string): ReadableStream<TCacheType> {
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

    async delete(): Promise<void> {
        await temp.cleanup();
    }

    [Symbol.iterator](): IterableIterator<FileCacheEntry<TCacheType>> {
        return this.fdMap.values();
    }
}

export class FileCacheEntry<TCacheType> {
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

    toStream(): ReadableStream<TCacheType> {
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
