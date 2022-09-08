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
            readClose: async() => {
                console.log("UrlThrough read close");
            },
        });

        this.#parserOpts = opts.parserOpts ?? {};
    }

    async through(methods: ManualThroughMethods): Promise<void> {
        console.log("UrlThrough.through");
        if (!this.#outputReader) {
            this.#outputReader = await this.#getDecodeReader(methods);
        }

        const {value, done} = await this.#outputReader.read();
        if (done) {
            console.log("this.#outputReader done");
            await this.#outputReader.closed;
            console.log("this.#outputReader closed");
            // await timeout(3000);
            return;
        }

        const chunk = Chunk.create({type: "data", data: value});
        console.log("UrlThrough.through chunk", chunk);
        await methods.send(0, chunk);
    }

    async #getDecodeReader(methods: ManualThroughMethods): Promise<ReadableStreamDefaultReader> {
        const objSource = new ReadableStream({
            pull: async(controller): Promise<void> => {
                const chunk = await methods.read();

                if (!chunk) {
                    console.log("#getDecodeReader close");
                    // this.readableController.close();
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
        const parsedStream = objSource
            .pipeThrough(new TransformStream({
                transform: (chunk, controller): void => {
                    controller.enqueue(chunk);
                },
                flush: () => {
                    console.log("object source stream done, flushing");
                },
            }))
            .pipeThrough(fetchObjStream)
            .pipeThrough(new TransformStream({
                transform: (chunk, controller): void => {
                    controller.enqueue(chunk);
                },
                flush: () => {
                    console.log("parser stream done, flushing");
                },
            }));
        return parsedStream.getReader();
    }
}
