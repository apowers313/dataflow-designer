import {Chunk, ChunkCollection, MetadataChunk} from "./Chunk";
import {Component, ComponentOpts} from "./Component";
import {CountQueuingStrategy, ReadableStream, ReadableStreamController, ReadableStreamDefaultController, ReadableStreamDefaultReader} from "node:stream/web";
import {DataflowError, DeferredPromise} from "./utils";
import {DataflowEnd} from "./Metadata";
import type {WritableType} from "./Writable";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = Record<any, any>> = abstract new (... args: any[]) => T;

export type PullFn = (methods: ReadMethods) => Promise<void>;

export interface ReadableOpts extends ComponentOpts {
    readStart?: (controller: ReadableStreamController<any>) => Promise<void>;
    readCancel?: () => Promise<void>;
    numChannels?: number;
    queueSize?: number;
    errorChannel?: number;
    pull: PullFn;
}

type SendFn = (chNum: number, data: Chunk) => Promise<void>;
type SendMultiFn = (cc: ChunkCollection) => Promise<void>;
type DesiredSizeFn = () => number | null;

export interface ReadMethods {
    send: SendFn;
    sendMulti: SendMultiFn;
    desiredSize: DesiredSizeFn;
}

/**
 * Applies the Reader mixin to a base class
 *
 * @param Base - The base class the mixin will be applied to
 * @returns A Reader class that extends specified base class
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function ReadableComponent<TBase extends Constructor<Component>>(Base: TBase) {
    /**
     * Creates a stream that can be read from
     */
    abstract class Reader extends Base {
        readonly isReadable = true;
        readonly numChannels: number = 1;
        readonly queueSize: number;
        readonly readMethods: ReadMethods = {
            send: async(chNum, data) => {
                const cc = new ChunkCollection();
                cc.add(chNum, data);
                return this.sendMulti(cc);
            },
            sendMulti: async(cc: ChunkCollection) => {
                return this.sendMulti(cc);
            },
            desiredSize: () => {
                return this.readableController.desiredSize;
            },
        };

        done = false;
        channels: Array<OutputChannel>;
        errorChannel: number | null;
        readableController!: ReadableStreamDefaultController<ChunkCollection>;

        #pendingReads: Map<Output, DeferredPromise<Chunk>> = new Map();
        #pull: PullFn;
        #readableStream: ReadableStream<ChunkCollection>;
        #reader: ReadableStreamDefaultReader<ChunkCollection>;

        /**
         * Creates a new Reader
         *
         * @param args - Options for the new reader
         */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(... args: any[]) {
            super(... args);

            const cfg: ReadableOpts = args[0] ?? {};

            this.#pull = cfg.pull;

            this.queueSize = cfg.queueSize ?? 1;
            this.numChannels = cfg.numChannels ?? this.numChannels;
            this.errorChannel = cfg.errorChannel ?? null;
            this.channels = new Array(this.numChannels)
                .fill(null)
                .map((_o: unknown, idx: number) => new OutputChannel({chNum: idx, parent: this}));

            this.#readableStream = new ReadableStream({
                start: async(controller): Promise<void> => {
                    this.readableController = controller;

                    if (typeof cfg.readStart === "function") {
                        await cfg.readStart(controller);
                    }
                },
                pull: async(): Promise<void> => {
                    try {
                        await this.#pull(this.readMethods);
                    } catch (err) {
                        await this.handleCaughtError(err, null);
                    }
                },
                cancel: cfg.readCancel,
            }, new CountQueuingStrategy({highWaterMark: this.queueSize}));
            this.#reader = this.#readableStream.getReader();
        }

        /**
         * Internal method for handling errors that are thrown by user-defined pull or through methods
         *
         * @param err - The error to handle. Should be an instance of Error, but sometimes fools throw crazy things...
         * @param chunk - If the user-defined function was handling a chunk, this is the chunk that caused the error
         */
        async handleCaughtError(err: unknown, chunk: Chunk | null): Promise<void> {
            if (!(err instanceof Error)) {
                // TODO: what should we do with a non-Error? dunno, just throw it for now
                throw err;
            }

            // pass through our internal errors
            if (err instanceof DataflowError) {
                throw err;
            }

            const errChunk = Chunk.create({type: "error", error: err, data: chunk});
            let cc: ChunkCollection;
            if (this.errorChannel !== null) {
                cc = new ChunkCollection();
                cc.add(this.errorChannel, errChunk);
            } else {
                cc = ChunkCollection.broadcast(errChunk, this.numChannels);
            }

            await this.sendMulti(cc);
        }

        /**
         * Initializes the Readable
         */
        async init(): Promise<void> {
            await super.init();
        }

        /** All of the Writable destinations associated with this Readable  */
        get dests(): Array<WritableType> {
            let ret: Array<WritableType> = [];
            this.channels.forEach((c) => {
                ret = ret.concat(c.dests);
            });

            return ret;
        }

        /** Number of destinations that have been connected to this Readable via pipe() */
        get numDests(): number {
            return this.dests.length;
        }

        /**
         * Reads data for a specified output. Promise resolves when data has been received on the OutputChannel
         * associated with the output.
         *
         * @param dest - The Output to read data for.
         * @returns The data that has been received
         */
        async readFor(dest: Output): Promise<Chunk> {
            if (this.done) {
                const md = Chunk.create({type: "metadata"}) as MetadataChunk;
                md.metadata.add(new DataflowEnd());
                return md;
            }

            const existing = this.#pendingReads.get(dest);
            if (existing) {
                return existing.promise;
            }

            const dp = new DeferredPromise<Chunk>();
            this.#pendingReads.set(dest, dp);

            if ((this.#pendingReads.size) >= this.numDests) {
                await this.#doRead();
            }

            return dp.promise;
        }

        /**
         * Internal helper function for reading data and sending it to all the correct Outputs
         */
        async #doRead(): Promise<void> {
            const readData = await this.#reader.read();
            if (readData.done) {
                this.readableFinished();

                return;
            }

            const cc = readData.value;
            if (!cc) {
                throw new Error("data read returned undefined");
            }

            cc.forEach((data, chNum) => {
                [... this.#pendingReads]
                    // find the matching reads for the channel
                    .filter((pr) => pr[0].channel.chNum === chNum)
                    // send data for each of the pending readers and remove the reader from the pending list
                    .forEach((tuple) => {
                        const [output, dp] = tuple;
                        this.#pendingReads.delete(output);
                        dp.resolve(data);
                    });
            });
        }

        /**
         * Called internally when the readable is done
         */
        readableFinished(): void {
            this.done = true;
            const md = Chunk.create({type: "metadata"});
            md.metadata.add(new DataflowEnd());
            this.#pendingReads.forEach((deferredPromise) => {
                deferredPromise.resolve(md);
            });
        }

        /**
         * Sends a ChunkCollection. Used internally by all send methods
         *
         * @param cc - The ChunkCollection to send
         */
        async sendMulti(cc: ChunkCollection): Promise<void> {
            await this.started;
            cc.forEach((chunk, chNum) => {
                if (this.channels[chNum].numDests === 0) {
                    // throw an error if trying to send data on a channel with no destinations
                    if (chunk.isData()) {
                        throw new DataflowError(`Trying to send data on channel without any destations (channel ${chNum}). Data will be lost.`);
                    }

                    // if sending metadata or an error, just silently drop the chunk
                    cc.delete(chNum);
                }
            });

            if (cc.size < 1) {
                return;
            }

            this.readableController.enqueue(cc);
        }
    }
    return Reader;
}

export interface OutputChannelOpts {
    chNum: number;
    parent: ReadableType;
}

/**
 * Each Readable (Source or Through) may have multiple output channels. Output channels send distinct data and
 * may be used for de-multiplexing one data stream into multiple data streams.
 */
export class OutputChannel {
    /** The channel number of this channel in relation to all the channels owned by the Readable */
    chNum: number;
    /** The parent source that 'owns' this channel */
    source: ReadableType;
    /** All the outputs that will generate copies of the data for this channel */
    outputs: Array<Output> = [];

    /**
     * Creates a new output stream
     *
     * @param opt - options for the new output stream
     */
    constructor(opt: OutputChannelOpts) {
        this.chNum = opt.chNum;
        this.source = opt.parent;
    }

    /**
     * Connects a source to a destination, so that all the data generated by the source will be received by the destination.
     *
     * @param dst - The Writeable (Sink or Through) to connect the data to. May be a single output or an array of outputs.
     */
    pipe(dst: WritableType | Array<WritableType>): void {
        if (!Array.isArray(dst)) {
            dst = [dst];
        }

        dst.forEach((d) => {
            const o = new Output({channel: this, dest: d});
            this.outputs.push(o);
            d.connect(o);
        });
    }

    /** All the destinations associated with this OutputChannel */
    get dests(): Array<WritableType> {
        let ret: Array<WritableType> = [];
        this.outputs.forEach((o) => {
            ret = ret.concat(o.dest);
        });

        return ret;
    }

    /** number of destinations connected to this channel */
    get numDests(): number {
        return this.dests.length;
    }
}

export interface OutputOpts {
    channel: OutputChannel;
    dest: WritableType;
}

/**
 * An output of a Readable. A single {@link OutputChannel} may have multiple Outputs,
 * each that sends its own copy of the exact same data.
 */
export class Output {
    channel: OutputChannel;
    source: ReadableType;
    dest: WritableType;

    /**
     * Creates a new Output.
     *
     * @param opts - Options for the new Output.
     */
    constructor(opts: OutputOpts) {
        this.channel = opts.channel;
        this.source = this.channel.source;
        this.dest = opts.dest;
    }

    /**
     * Reads data from the source. Promise will only resolve once data has
     * been written to this specific channel.
     *
     * @returns The data that has been read
     */
    async read(): Promise<Chunk> {
        const data = await this.source.readFor(this);
        if (data.isData()) {
            return data.clone();
        }

        // TODO: should we clone errors too?
        return data;
    }
}

export type ReadableType = InstanceType<ReturnType<typeof ReadableComponent>>;
// export class ReadableType extends Readable(Component) {}
