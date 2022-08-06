import {Writable, WritableOpts} from "./Writable";
import {Component} from "./Component";

/**
 * The end of a pipeline
 */
export class Sink extends Writable(Component) {
    /**
     * Creates a new Sink
     *
     * @param opts - Options for the Sink
     */
    // eslint-disable-next-line no-useless-constructor
    constructor(opts: WritableOpts) {
        super(opts);
    }

    /**
     * Initializes the Sync. Typically called by .complete()
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
}
