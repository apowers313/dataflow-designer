import {Chunk, ManualThroughMethods, Through, ThroughOpts} from "@dataflow-designer/dataflow-core";

export interface LimitOpts extends Omit<ThroughOpts, "through"> {
    closeWhenDone?: boolean;
    max?: number;
}

/**
 * Limits the number of objects that are sent. After transmitting the specified number of objects this component consumes
 * the rest of the stream until it closes and generates no additional objects.
 */
export class Limit extends Through {
    max: number;
    count = 0;

    /**
     * Creates a new limit component
     *
     * @param opts - The options for the new limit component
     */
    constructor(opts: LimitOpts = {}) {
        super({
            ... opts,
            manualRead: true,
            through: (methods) => this.#through(methods),
        });

        this.max = opts.max ?? 100;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #through(methods: ManualThroughMethods): Promise<void> {
        const chunk = await methods.read();

        if (!chunk) {
            methods.finished();
            return;
        }

        this.count++;
        if (this.count <= this.max) {
            await methods.send(0, chunk);
        } else {
            // close reader
            methods.finished();
            let discard: Chunk | null;

            // drain unread data
            do {
                discard = await methods.read();
            } while (discard);
        }
    }
}
