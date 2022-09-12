import {Chunk, Through, ThroughOpts, ThroughMethods} from "@dataflow-designer/dataflow-core";

interface {{fclass}}Opts extends Omit<ThroughOpts, "through"> {}

/**
 * Just testing
 */
export class {{fclass}} {
    constructor(opts: {{fclass}}Opts = {}) {
        super({
            ... opts,
            through: (chunk, methods) => this.#through(chunk, methods),
        })
    }

    #through(chunk: Chunk, methods: ThroughMethods) {
        methods.send(0, chunk);
    }
}
