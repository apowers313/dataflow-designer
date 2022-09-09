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
    finished: () => void;
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
                if (opts.writeClose) {
                    await opts.writeClose();
                }
            },
            writeAll: true,
        };
        super(inputOpts);

        this.catchAll = opts.catchAll ?? false;
        this.#through = opts.through;
        this.#manualRead = opts.manualRead ?? false;
        // if (this.#manualRead) {
        //     console.log("this.manualFinished before", this.manualFinished);
        //     this.manualFinished = true;
        //     console.log("this.manualFinished after", this.manualFinished);
        // }
    }

    /**
     * Initializes through. Usually called by .complete()
     *
     * @returns a promise that resolves when streaming has completed, or rejects on error
     */
    async init(): Promise<void> {
        if (this.initFinished) {
            return this.initFinished;
        }

        this.initFinished = super.init();
        return this.initFinished;
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

        if (chunk.isMetadata() && chunk.metadata.get("dataflow", "end")) {
            console.log("*** got metadata::end, sending interlock null", this.name);
            await this.#readWriteInterlock.send(null);
            return;
        }

        await this.#readWriteInterlock.send(chunk);
        if (chunk.isMetadata() && chunk.metadata.get("dataflow", "end")) {
            await this.#readWriteInterlock.send(null);
        }
    }

    /**
     * Sends data consumer(s) of the ReadableStream
     *
     * @param methods - Functions for manipulating the stream and data
     */
    async #throughPull(methods: ReadMethods): Promise<void> {
        const chunk = await this.#getChunk();
        if (!chunk) {
            this.readableController.close();
            return;
        }

        try {
            await (this.#through as ThroughFn)(chunk, methods);
        } catch (err) {
            await this.handleCaughtError(err, chunk);
        }
    }

    async #manualThroughPull(methods: ReadMethods): Promise<void> {
        try {
            await (this.#through as ManualThroughFn)({
                ... methods,
                read: () => this.#getChunk(),
                finished: () => this.readableController.close(),
            });
        } catch (err) {
            await this.handleCaughtError(err, null);
        }
    }

    async #getChunk(): Promise<Chunk|null> {
        let chunk: Chunk | null;
        let done = false;

        do {
            chunk = await this.#readWriteInterlock.recv();
            console.log("Through #getChunk chunk", chunk);
            this.#readWriteInterlock.reset();

            const isMetadataEnd = chunk?.isMetadata() && chunk.metadata.has("dataflow", "end");
            if (chunk && !chunk.isData() && !this.catchAll && !isMetadataEnd) {
                // pass through metadata and errors on all channels by default
                const cc = ChunkCollection.broadcast(chunk, this.numChannels);
                await this.sendMulti(cc);
            } else if (!isMetadataEnd || (isMetadataEnd && this.catchAll)) { // don't pass through end metadata unless catchAll
                done = true;
            }
        } while (!done);

        if (!chunk) {
            // this.readableController.close();
            return null;
        }

        return chunk;
    }
}
