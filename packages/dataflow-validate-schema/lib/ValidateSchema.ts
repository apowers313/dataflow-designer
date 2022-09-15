import {Chunk, DataChunk, Through, ThroughMethods, ThroughOpts} from "@dataflow-designer/dataflow-core";
import {default as AjvJsonSchema} from "ajv";
// import {Ajv as AjvJsonType} from "ajv/dist/jtd";

export class ValidationError extends Error {
    validationErrors: Array<AjvJsonSchema.ErrorObject>;

    constructor(chunk: DataChunk, errors: Array<AjvJsonSchema.ErrorObject>) {
        super("JSON Schema Validation Error");
        this.validationErrors = errors;
    }
}

interface ValidateSchemaOpts extends Omit<ThroughOpts, "through" | "manualRead"> {
    schema: Record<any, any>;
}

export class ValidateSchema extends Through {
    #ajv: AjvJsonSchema.Ajv;
    readonly schema: Record<any, any>;
    readonly validateFn: AjvJsonSchema.ValidateFunction;

    constructor(cfg: ValidateSchemaOpts) {
        super({
            ... cfg,
            numChannels: 2,
            errorChannel: 1,
            through: (chunk, methods) => this.#through(chunk, methods),
        });

        this.#ajv = new AjvJsonSchema();
        this.schema = cfg.schema;
        this.validateFn = this.#ajv.compile(this.schema);
    }

    async #through(chunk: Chunk, methods: ThroughMethods): Promise<void> {
        console.log("#through", chunk);
        if (!chunk.isData()) {
            return;
        }

        const res = await this.validateFn(chunk.data);
        console.log("res", res);
        console.log("this.validateFn.errors", this.validateFn.errors);
        if (this.validateFn.errors) {
            throw new ValidationError(chunk, this.validateFn.errors);
        }

        await methods.send(0, chunk);
    }
}
