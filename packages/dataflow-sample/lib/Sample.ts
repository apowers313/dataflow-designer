import {ManualThroughMethods, Through, ThroughOpts} from "@dataflow-designer/dataflow-core";

export interface SampleOpts extends Omit<ThroughOpts, "through"> {
    random?: boolean;
    interval?: number;
}

/**
 * Creates a random sampling of the objects that passes through the component. For example, only passes through every
 * 10th object that it receives. Good for cutting down on the data size for debugging outputs, etc.
 */
export class Sample extends Through {
    #count = 0;
    #interval: number;
    #random: boolean;

    /**
     * Creates a new Sample component
     *
     * @param opts - The options for the new Sampling component
     */
    constructor(opts: SampleOpts = {}) {
        super({
            ... opts,
            manualRead: true,
            through: (methods) => this.#through(methods),
        });

        if (opts.interval !== undefined && opts.interval < 1) {
            throw new RangeError(`interval must be one or larger, got: '${opts.interval}'`);
        }

        this.#interval = opts.interval ?? 10;
        this.#random = opts.random ?? false;

        if (this.#random) {
            this.#resetCount();
        }
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #through(methods: ManualThroughMethods): Promise<void> {
        let chunk = await methods.read();
        while (this.#count > 0 && chunk) {
            // discard a chunk
            chunk = await methods.read();
            // console.log("--- skipping", chunk);
            this.#count--;
        }

        if (!chunk) {
            await methods.finished();
            return;
        }

        // console.log("+++ sending", chunk);
        await methods.send(0, chunk);
        this.#resetCount();
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    #resetCount(): void {
        if (!this.#random) {
            this.#count = this.#interval - 1;
        } else {
            this.#count = (Math.random() * this.#interval * 2) - 1;
            if (this.#count < 1) {
                this.#count = 0;
            }
        }
    }
}
