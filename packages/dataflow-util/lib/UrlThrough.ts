import {Chunk, ManualThroughMethods, Source, SourceMethods, SourceOpts, Through, ThroughOpts} from "@dataflow-designer/dataflow-core";
import {DataCollection, ParserDecodeOpts} from "@dataflow-designer/stupendous-parser";
import {RequestInfo, fetch} from "undici";
import {UrlDataCollection, UrlDataEntry} from "./UrlDataCollection";

export function timeout(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

interface UrlThroughOpts extends Omit<ThroughOpts, "through"> {
    request?: RequestInfo;
    parserOpts?: ParserDecodeOpts;
}

export class UrlThrough extends Through {
    #outputReader: ReadableStreamDefaultReader | undefined;
    #parserOpts: ParserDecodeOpts;

    constructor(opts: UrlThroughOpts = {}) {
        super({
            ... opts,
            manualRead: true,
            through: (methods) => this.through(methods),
            writeClose: async() => {
                console.log("UrlThrough write close");
            },
        });

        this.name = "url-through";
        this.#parserOpts = opts.parserOpts ?? {};
    }

    async through(methods: ManualThroughMethods): Promise<void> {
        // console.log("UrlThrough.through");
        if (!this.#outputReader) {
            this.#outputReader = await this.#getDecodeReader(methods);
        }

        console.log("UrlThrough.through reading");
        const {value, done} = await this.#outputReader.read();
        // console.log("this.#outputReader.read()", done, value);
        if (done) {
            console.log("this.#outputReader done");
            await this.#outputReader.closed;
            console.log("this.#outputReader closed");
            // await timeout(3000);
            methods.finished();
            return;
        }

        const chunk = Chunk.create({type: "data", data: value});
        // console.log("UrlThrough.through chunk", chunk);
        await methods.send(0, chunk);
    }

    async #getDecodeReader(methods: ManualThroughMethods): Promise<ReadableStreamDefaultReader> {
        const objSource = new ReadableStream({
            pull: async(controller): Promise<void> => {
                console.log("objSource chunk reading");
                const chunk = await methods.read();
                console.log("objSource chunk", chunk);

                if (!chunk) {
                    console.log("#getDecodeReader close");
                    // methods.finished();
                    controller.close();
                    return;
                }

                if (!chunk.isData()) {
                    return;
                }

                const url = chunk.data.url as string;
                const ude = await UrlDataEntry.create(url);
                controller.enqueue(ude);
            },
            cancel: () => {
                console.log("#getDecodeReader cancel");
            },
        });

        const udc = new UrlDataCollection();
        const fetchObjStream = udc.decode({parserOpts: this.#parserOpts});
        let count = 0;
        const parsedStream = objSource
            .pipeThrough(new TransformStream({
                transform: (chunk, controller): void => {
                    controller.enqueue(chunk);
                },
                flush: () => {
                    console.log("&&& object source stream done, flushing");
                },
            }))
            .pipeThrough(fetchObjStream)
            .pipeThrough(new TransformStream({
                transform: (chunk, controller): void => {
                    console.log("fetchObjStream chunk", chunk);
                    count++;
                    controller.enqueue(chunk);
                },
                flush: () => {
                    console.log("&&& parser stream done, flushing");
                    console.log("%%% COUNT", count);
                },
            }));
        return parsedStream.getReader();
    }
}
