import {Chunk, Through, ThroughOpts, ThroughMethods} from "@dataflow-designer/dataflow-core";

interface {{fclass}}Opts extends Omit<ThroughOpts, "through" | "manualRead"> {}

/**
 * Just testing
 */
export class {{fclass}} extends Through {
    constructor(opts: {{fclass}}Opts = {}) {
        super({
            ... opts,
            through: (chunk, methods) => this.#through(chunk, methods),
        })
    }

    async #through(chunk: Chunk, methods: ThroughMethods): Promise<void> {
        await methods.send(0, chunk);
    }
}
