import {Chunk, Source, SourceMethods, SourceOpts} from "@dataflow-designer/dataflow-core";
import {request} from "graphql-request";
// import jsonata from "jsonata";

// type JsonataTemplate = ReturnType<typeof jsonata>;

interface GraphQLSourceOpts extends Omit<SourceOpts, "pull"> {
    endpoint: string;
    query: string;
    // resultPath: string;
}

/**
 * Creates a stream of objects based on a GraphQL query. The array or object at the `result` alias will be transmitted
 * as a stream of objects. If `result` is an object, the value at each key is emitted as an object in the stream; if
 * `result` is an array, each member of the array is emitted as an object.
 */
export class GraphQLSource extends Source {
    #endpoint: string;
    #query: string;
    #data: any;
    #dataIterator!: IterableIterator<Record<any, any>>;
    // #resultPath: string;
    // #jsonataTemplate: JsonataTemplate;

    /**
     * Creates a new GraphQL source
     *
     * @param cfg - Configuration for the new GraphQL source
     */
    constructor(cfg: GraphQLSourceOpts) {
        super({
            ... cfg,
            pull: (methods) => this.#pull(methods),
        });

        this.#endpoint = cfg.endpoint;
        this.#query = cfg.query;
        // this.#resultPath = cfg.resultPath;
        // this.#jsonataTemplate = jsonata(this.#resultPath);
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    async #pull(methods: SourceMethods): Promise<void> {
        // console.log("#pull");
        const {done, value} = this.#dataIterator.next();
        // console.log("done", done);
        // console.log("value", value);
        if (done) {
            await methods.finished();
        }

        const chunk = Chunk.create({type: "data", data: value});
        await methods.send(0, chunk);
    }

    /**
     * Typically called by the `.complete()` function from dataflow-core to initialize this component
     */
    async init(): Promise<void> {
        this.#data = await request(this.#endpoint, this.#query);
        // this.#data = {
        //     result: {
        //         one: 1,
        //         two: "wine",
        //         three: "beer",
        //     },
        // };
        // console.log("data", data.result);
        if (Array.isArray(this.#data?.result)) {
            this.#dataIterator = this.#data.result[Symbol.iterator]();
        } else if (typeof this.#data?.result === "object") {
            const obj = this.#data?.result;
            this.#dataIterator = (function* (): any {
                const keyList = Object.keys(obj);
                while (keyList.length) {
                    const key = keyList.shift();
                    // console.log("key", key);
                    if (!key) {
                        throw new Error("undefined key in object generator");
                    }

                    // console.log("value", obj[key]);
                    yield obj[key];
                }
            })();
        }

        // const expression = jsonata("data.pokemon_v2_item");
        // const result = expression.evaluate(data);
        // console.log("result", result);

        await super.init();
    }
}
