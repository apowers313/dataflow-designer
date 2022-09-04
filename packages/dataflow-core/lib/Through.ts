import {Chunk, ChunkCollection} from "./Chunk";
import {Component, ComponentOpts} from "./Component";
import {DeferredPromise, Interlock} from "./utils";
import {ReadMethods, ReadableComponent, ReadableOpts} from "./Readable";
import {WritableComponent, WritableOpts, WriteMethods} from "./Writable";

export type ThroughMethods = ReadMethods & WriteMethods;
export type ThroughFn = (chunk: Chunk, methods: ThroughMethods) => Promise<void>;
export interface ThroughOpts extends Omit<ReadableOpts, "pull">, Omit<WritableOpts, "push"> {
    catchAll?: boolean;
    through: ThroughFn;
}

type ThroughSuperOpts = ReadableOpts & WritableOpts & ComponentOpts;

/**
 * A component that reads data from a input, acts on it, and then passes it to an output
 */
export class Through extends WritableComponent(ReadableComponent(Component)) {
    catchAll: boolean;
    #through: ThroughFn;
    #readWriteInterlock = new Interlock<Chunk>();

    /**
     * Creates a new through stream
     *
     * @param opts - Options for the new through stream
     */
    constructor(opts: ThroughOpts) {
        const inputOpts: ThroughSuperOpts = {
            ... opts,
            push: async(data, methods): Promise<void> => {
                await this.#throughPush(data, methods);
            },
            pull: async(methods): Promise<void> => {
                await this.#throughPull(methods);
            },
            writeAll: true,
        };
        inputOpts.writeClose = async(): Promise<void> => {
            this.readableController.close();
            if (opts.writeClose) {
                await opts.writeClose();
            }
        };
        super(inputOpts);

        this.catchAll = opts.catchAll ?? false;
        this.#through = opts.through;
    }

    /**
     * Initializes through. Usually called by .complete()
     *
     * @returns a promise that resolves when streaming has completed, or rejects on error
     */
    async init(): Promise<void> {
        if (this.finished) {
            return this.finished;
        }

        this.finished = super.init();
        return this.finished;
    }

    /**
     * Receives data from a WritableStream
     *
     * @param chunk - Data received as input
     * @param _methods - Not used
     */
    async #throughPush(chunk: Chunk|ChunkCollection, _methods: WriteMethods): Promise<void> {
        if (chunk instanceof ChunkCollection) {
            throw new Error("Through received ChunkCollection. Why?");
        }

        await this.#readWriteInterlock.send(chunk);
    }

    /**
     * Sends data consumer(s) of the ReadableStream
     *
     * @param methods - Functions for manipulating the stream and data
     */
    async #throughPull(methods: ReadMethods): Promise<void> {
        const chunk = await this.#readWriteInterlock.recv();

        if (!chunk) {
            this.readableController.close();
            return;
        }

        if (chunk.isData() || this.catchAll) {
            try {
                await this.#through(chunk, methods);
            } catch (err) {
                await this.handleCaughtError(err, chunk);
            }
        } else {
            // pass through metadata and errors on all channels by default
            const cc = ChunkCollection.broadcast(chunk, this.numChannels);
            await this.sendMulti(cc);
        }

        this.#readWriteInterlock.reset();
    }
}
