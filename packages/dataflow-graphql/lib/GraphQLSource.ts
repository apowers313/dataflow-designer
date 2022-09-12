import {Chunk, Source, SourceMethods, SourceOpts} from "@dataflow-designer/dataflow-core";
import {request} from "graphql-request";
// import jsonata from "jsonata";

// type JsonataTemplate = ReturnType<typeof jsonata>;

interface GraphQLSourceOpts extends Omit<SourceOpts, "pull"> {
    endpoint: string;
    query: string;
    // resultPath: string;
}

export class GraphQLSource extends Source {
    #endpoint: string;
    #query: string;
    #data: any;
    #dataIterator!: IterableIterator<Record<any, any>>;
    // #resultPath: string;
    // #jsonataTemplate: JsonataTemplate;

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

    async init() {
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
