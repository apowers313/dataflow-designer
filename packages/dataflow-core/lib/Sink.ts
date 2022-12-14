import {WritableComponent, WritableOpts, WriteMethods} from "./Writable";
import {Component} from "./Component";

export type SinkOpts = WritableOpts;
export interface SinkMethods extends WriteMethods { }

/**
 * The end of a pipeline
 */
export class Sink extends WritableComponent(Component) {
    /**
     * Creates a new Sink
     *
     * @param opts - Options for the Sink
     */
    // eslint-disable-next-line no-useless-constructor
    constructor(opts: SinkOpts) {
        super(opts);
    }

    /**
     * Initializes the Sync. Typically called by .complete()
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
}
