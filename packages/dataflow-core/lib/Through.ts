import {Chunk, ChunkCollection} from "./Chunk";
import {Component, ComponentOpts} from "./Component";
import {ReadMethods, ReadableComponent, ReadableOpts} from "./Readable";
import {WritableComponent, WritableOpts, WriteMethods} from "./Writable";
import {Interlock} from "./utils";

export type ThroughMethods = ReadMethods & WriteMethods;
export type ThroughFn = (chunk: Chunk, methods: ThroughMethods) => Promise<void>;

export type ManualThroughFn = (methods: ManualThroughMethods) => Promise<void>;
export interface ManualThroughMethods extends ThroughMethods {
    read: () => Promise<Chunk | null>;
}

export type ThroughOpts =
    Omit<ReadableOpts, "pull"> &
    Omit<WritableOpts, "push"> &
    (AutomaticThroughOpts | ManualThroughOpts) &
    {
        catchAll?: boolean;
    };

export type AutomaticThroughOpts = {
    manualRead?: false;
    through: ThroughFn;
};

export type ManualThroughOpts = {
    manualRead: true;
    through: ManualThroughFn;
};

type ThroughSuperOpts = ReadableOpts & WritableOpts & ComponentOpts;

/**
 * A component that reads data from a input, acts on it, and then passes it to an output
 */
export class Through extends WritableComponent(ReadableComponent(Component)) {
    catchAll: boolean;
    #manualRead: boolean;
    #through: ThroughFn | ManualThroughFn;
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
                if (this.#manualRead) {
                    await this.#manualThroughPull(methods);
                } else {
                    await this.#throughPull(methods);
                }
            },
            writeClose: async(): Promise<void> => {
                console.log("Through write close");
                if (this.#manualRead) {
                    await this.#readWriteInterlock.send(null);
                } else {
                    this.readableController.close();
                }

                if (opts.writeClose) {
                    await opts.writeClose();
                }
            },
            // readClose: async(): Promise<void> => {
            //     console.log("Through read close");
            // },
            writeAll: true,
        };
        super(inputOpts);

        this.catchAll = opts.catchAll ?? false;
        this.#through = opts.through;
        this.#manualRead = opts.manualRead ?? false;
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
        console.log("#throughPull");
        const chunk = await this.#getChunk();
        if (!chunk) {
            return;
        }

        try {
            await (this.#through as ThroughFn)(chunk, methods);
        } catch (err) {
            await this.handleCaughtError(err, chunk);
        }
    }

    async #manualThroughPull(methods: ReadMethods): Promise<void> {
        console.log("#manualThroughPull");
        try {
            await (this.#through as ManualThroughFn)({
                ... methods,
                read: () => this.#getChunk(),
            });
        } catch (err) {
            await this.handleCaughtError(err, null);
        }
    }

    async #getChunk(): Promise<Chunk|null> {
        console.log("Through #getChunk");

        let chunk: Chunk | null;
        let done = false;

        do {
            chunk = await this.#readWriteInterlock.recv();
            this.#readWriteInterlock.reset();

            if (chunk && !chunk.isData() && !this.catchAll) {
                // pass through metadata and errors on all channels by default
                const cc = ChunkCollection.broadcast(chunk, this.numChannels);
                await this.sendMulti(cc);
            } else {
                done = true;
            }
        } while (!done);

        if (!chunk) {
            console.log("#getChunk done");
            this.readableController.close();
            return null;
        }

        console.log("Through #getChunk returning", chunk);
        return chunk;
    }
}
