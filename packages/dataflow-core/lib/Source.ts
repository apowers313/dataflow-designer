import {Chunk, ChunkCollection, MetadataChunk} from "./Chunk";
import {Component, ComponentOpts} from "./Component";
import {ReadMethods, Readable, ReadableOpts} from "./Readable";
import {DataflowStart} from "./Metadata";

type FinishedFn = () => Promise<void>
export type SourcePullFn = (methods: SourceMethods) => Promise<void>

export interface SourceMethods extends ReadMethods {
    finished: FinishedFn;
}

export interface SourceOpts extends Omit<ReadableOpts, "pull"> {
    sendStartMetadata?: boolean;
    pull: SourcePullFn;
}

type SourceSuperOpts = ReadableOpts & ComponentOpts

/**
 * Generates data for a pipeline
 */
export class Source extends Readable(Component) {
    #sourcePull: SourcePullFn;
    sendStartMetadata: boolean;

    /**
     * Creates a source
     *
     * @param opts - Options for the new source
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor(opts: SourceOpts) {
        const inputOpts: SourceSuperOpts = {
            ... opts,
            pull: async(methods): Promise<void> => {
                await this.#sourcePull({
                    ... methods,
                    finished: async(): Promise<void> => {
                        console.log("readableController close()");
                        this.readableController!.close();
                    },
                });
            },
            readStart: async(controller): Promise<void> => {
                if (opts.readStart) {
                    await opts.readStart(controller);
                }
            },
        };

        super(inputOpts);
        this.#sourcePull = opts.pull;
        this.sendStartMetadata = opts.sendStartMetadata ?? true;
    }

    /**
     * Initializes the Source. Typically called by .complete()
     */
    async init(): Promise<void> {
        console.log("Source.init");
        console.log("broadcasting start");
        if (this.sendStartMetadata) {
            const mds = Chunk.create({type: "metadata"}) as MetadataChunk;
            mds.metadata.add(new DataflowStart(this.name));
            const cc = ChunkCollection.broadcast(mds, this.numChannels);
            console.log("num dests", this.numDests);
            this.readableController.enqueue(cc);
        }

        console.log("Source.init super()");
        await super.init();
    }
}
