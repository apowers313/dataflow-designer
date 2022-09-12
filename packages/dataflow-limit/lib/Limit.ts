import {Chunk, DataflowEnd, ManualThroughMethods, Through, ThroughOpts} from "@dataflow-designer/dataflow-core";

export interface LimitOpts extends Omit<ThroughOpts, "through"> {
    closeWhenDone?: boolean;
    max?: number;
}

export class Limit extends Through {
    max: number;
    count = 0;

    constructor(opts: LimitOpts = {}) {
        super({
            ... opts,
            manualRead: true,
            through: (methods) => this.#through(methods),
        });

        this.max = opts.max ?? 100;
    }

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
